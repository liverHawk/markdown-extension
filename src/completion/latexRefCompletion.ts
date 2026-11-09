import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findUnescapedCommentIndex, stripLatexComments } from './bibtexCitation.js';

export interface LatexLabelEntry {
  /** Label key inside \label{...} (e.g. "sec:intro", "fig:model", "eq:loss") */
  key: string;
  /** 1-based line number where the label is defined */
  line: number;
  /** Contextual description (e.g. section title, figure caption, or equation preview) */
  context?: string;
  /** Source .tex file label (relative path or basename) */
  sourceFile?: string;
}

export interface RefContext {
  /** The reference command name without leading backslash (e.g. "ref", "eqref", "cref") */
  command: string;
  /** Partial label key currently being typed before the cursor */
  keyPrefix: string;
  /** Start character index on the current line for replacing keyPrefix */
  startCharacter: number;
  /** Keys already specified earlier in the same braces (e.g. in \cref{sec:a, sec:b}) */
  existingKeys: string[];
}

/**
 * Matches LaTeX cross-reference commands at the end of a line prefix (up to the cursor),
 * supporting optional starred variants, optional arguments, and comma-separated keys inside `{...`.
 * Also supports `\hyperref[label` bracket syntax.
 *
 * Examples matched:
 * - `\ref{`
 * - `\eqref{eq:`
 * - `\autoref*{fig:model`
 * - `\cref{sec:intro, fig:`
 * - `\Cref{tab:res`
 * - `\pageref{sec:1`
 * - `\hyperref[sec:intro`
 */
const REF_BRACE_PREFIX_REGEX =
  /\\((?:(?:eq|page|auto|name|[cC]|[cC]page|name[cC]|lcnamec|labelc|labelcpage|[vV]|vpage)?ref)\*?)(?:\[[^\]]*\])?\{([^{}]*)$/;

const HYPERREF_BRACKET_PREFIX_REGEX = /\\(hyperref)\[([^\][{}]*)$/;

const IGNORED_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  '.vscode',
  '.idea',
  'node_modules',
  'out',
  'dist',
  'build',
  'target',
  '.next',
]);

/** Maximum file size (2 MB) to scan for \label definitions */
const MAX_TEX_FILE_BYTES = 2 * 1024 * 1024;

/** Maximum directory recursion depth when scanning workspace/project for split .tex files */
const MAX_SCAN_DEPTH = 5;

/** Maximum number of .tex files to scan in a directory tree */
const MAX_TEX_FILES = 200;

/** Maximum length for context preview strings */
const MAX_CONTEXT_LENGTH = 80;

/**
 * Detects whether the cursor is currently inside the braces `{...}` of a LaTeX reference command
 * (such as `\ref{...}`, `\eqref{...}`, `\cref{...}`, `\autoref{...}`, `\pageref{...}`)
 * or inside the brackets `[...]` of `\hyperref[...]`.
 */
export function extractRefContext(linePrefix: string): RefContext | undefined {
  if (findUnescapedCommentIndex(linePrefix) !== -1) {
    return undefined;
  }

  const braceMatch = REF_BRACE_PREFIX_REGEX.exec(linePrefix);
  const bracketMatch = braceMatch ? null : HYPERREF_BRACKET_PREFIX_REGEX.exec(linePrefix);
  const match = braceMatch ?? bracketMatch;
  if (!match) {
    return undefined;
  }

  // Ensure the backslash is not part of `\\` (line break)
  if (match.index > 0 && linePrefix[match.index - 1] === '\\') {
    return undefined;
  }

  const command = match[1];
  const insideGroup = match[2];

  // Support comma-separated multiple labels (e.g. \cref{sec:a, sec:b})
  const lastCommaIndex = insideGroup.lastIndexOf(',');
  const existingKeys: string[] = [];

  if (lastCommaIndex !== -1) {
    const previousPart = insideGroup.slice(0, lastCommaIndex);
    for (const part of previousPart.split(',')) {
      const trimmed = part.trim();
      if (trimmed) {
        existingKeys.push(trimmed);
      }
    }
  }

  const rawCurrentSegment =
    lastCommaIndex === -1 ? insideGroup : insideGroup.slice(lastCommaIndex + 1);
  const leadingWhitespaceLength = rawCurrentSegment.length - rawCurrentSegment.trimStart().length;
  const keyPrefix = rawCurrentSegment.slice(leadingWhitespaceLength);

  // Label keys should not contain whitespace
  if (/\s/.test(keyPrefix)) {
    return undefined;
  }

  const groupContentStart = linePrefix.length - insideGroup.length;
  const segmentOffset = lastCommaIndex === -1 ? 0 : lastCommaIndex + 1;
  const startCharacter = groupContentStart + segmentOffset + leadingWhitespaceLength;

  return {
    command,
    keyPrefix,
    startCharacter,
    existingKeys,
  };
}

function readBalancedBraces(
  text: string,
  openBraceIndex: number
): { content: string; endIndex: number } | undefined {
  if (text[openBraceIndex] !== '{') {
    return undefined;
  }
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(openBraceIndex + 1, i),
          endIndex: i + 1,
        };
      }
    }
  }
  return undefined;
}

function truncateContext(raw: string): string {
  const compact = raw.replace(/\s+/g, ' ').trim();
  if (compact.length <= MAX_CONTEXT_LENGTH) {
    return compact;
  }
  return `${compact.slice(0, MAX_CONTEXT_LENGTH - 3)}...`;
}

/**
 * Extracts a human-friendly context string (such as a section title, caption, or equation snippet)
 * near the given line index in an uncommented LaTeX document.
 */
function extractLabelContext(
  uncommentedLines: readonly string[],
  lineIndex: number
): string | undefined {
  // Collect bounded preceding lines, stopping at environment boundaries (\end{...}) or previous \label
  const boundedStartLines: string[] = [];
  for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
    const line = uncommentedLines[i];
    if (/\\end\s*\{/.test(line) || /\\label\s*(?:\[[^\]]*\])?\s*\{/.test(line)) {
      break;
    }
    boundedStartLines.unshift(line);
    if (/\\begin\s*\{/.test(line)) {
      break;
    }
  }

  const windowLines = [...boundedStartLines, uncommentedLines[lineIndex]];
  const windowText = windowLines.join('\n');

  // Also include up to 2 lines after the label (unless \end{...} is reached) for \caption placed after \label
  const afterLines: string[] = [];
  if (!/\\end\s*\{/.test(uncommentedLines[lineIndex])) {
    for (let i = lineIndex + 1; i <= Math.min(uncommentedLines.length - 1, lineIndex + 2); i++) {
      afterLines.push(uncommentedLines[i]);
      if (/\\end\s*\{/.test(uncommentedLines[i])) {
        break;
      }
    }
  }
  const fullWindowText = [...windowLines, ...afterLines].join('\n');

  // 1. Check for \caption{...} in the bounded window
  const captionRegex = /\\caption\*?\s*(?:\[[^\]]*\])?\s*\{/g;
  let lastCaption: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = captionRegex.exec(fullWindowText)) !== null) {
    const braceIdx = match.index + match[0].length - 1;
    const group = readBalancedBraces(fullWindowText, braceIdx);
    if (group && group.content.trim()) {
      lastCaption = truncateContext(group.content);
    }
  }
  if (lastCaption) {
    return `Caption: ${lastCaption}`;
  }

  // 2. Check for the closest section/heading command in the window up to the label line
  const headingRegex = /\\(part|chapter|(?:sub)*section|paragraph)\*?\s*(?:\[[^\]]*\])?\s*\{/g;
  let lastHeading: { type: string; title: string } | undefined;
  while ((match = headingRegex.exec(windowText)) !== null) {
    const braceIdx = match.index + match[0].length - 1;
    const group = readBalancedBraces(windowText, braceIdx);
    if (group && group.content.trim()) {
      lastHeading = {
        type: match[1],
        title: truncateContext(group.content),
      };
    }
  }
  if (lastHeading) {
    return `${lastHeading.type}: ${lastHeading.title}`;
  }

  // 3. Check if there is meaningful content on the same line or immediately preceding line
  const currentLineCleaned = uncommentedLines[lineIndex]
    .replace(/\\label\s*(?:\[[^\]]*\])?\s*\{[^{}]*\}/g, '')
    .replace(/\\(?:begin|end)\{[^{}]*\}(?:\[[^\]]*\])?/g, '')
    .trim();
  if (currentLineCleaned) {
    return truncateContext(currentLineCleaned);
  }

  if (boundedStartLines.length > 0) {
    const prevLineCleaned = boundedStartLines[boundedStartLines.length - 1]
      .replace(/\\(?:begin|end)\{[^{}]*\}(?:\[[^\]]*\])?/g, '')
      .replace(/\\centering\b/g, '')
      .trim();
    if (prevLineCleaned) {
      return truncateContext(prevLineCleaned);
    }
  }

  return undefined;
}

/**
 * Parses `\label{...}` (and `\label[...]{...}`) definitions from LaTeX text.
 * Ignores commented-out labels (`% \label{...}`).
 */
export function parseLatexLabels(content: string, sourceFile?: string): LatexLabelEntry[] {
  const rawLines = content.split(/\r?\n/);
  const uncommentedLines = rawLines.map((line) => {
    const commentIdx = findUnescapedCommentIndex(line);
    return commentIdx === -1 ? line : line.slice(0, commentIdx);
  });

  const entries: LatexLabelEntry[] = [];
  const seenKeys = new Set<string>();
  const labelRegex = /\\label\s*(?:\[[^\]]*\])?\s*\{([^{}]+)\}/g;

  for (let lineIdx = 0; lineIdx < uncommentedLines.length; lineIdx++) {
    const lineText = uncommentedLines[lineIdx];
    labelRegex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = labelRegex.exec(lineText)) !== null) {
      // Ensure the backslash is not part of `\\`
      if (match.index > 0 && lineText[match.index - 1] === '\\') {
        continue;
      }

      const key = match[1].trim();
      if (!key || /\s/.test(key) || seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);

      const context = extractLabelContext(uncommentedLines, lineIdx);
      const entry: LatexLabelEntry = {
        key,
        line: lineIdx + 1,
      };
      if (context) {
        entry.context = context;
      }
      if (sourceFile) {
        entry.sourceFile = sourceFile;
      }
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Extracts `% !TEX root = ...` (or `% !TeX root = ...`) magic comment path from the top of a LaTeX file.
 */
export function extractTexRootComment(documentText: string): string | undefined {
  const lines = documentText.split(/\r?\n/, 25);
  for (const line of lines) {
    const match = /^\s*%\s*!tex\s+root\s*=\s*(.+)$/i.exec(line);
    if (match) {
      const target = match[1].trim();
      if (target) {
        return target;
      }
    }
  }
  return undefined;
}

/**
 * Extracts file paths referenced by `\input{...}`, `\include{...}`, `\subfile{...}`,
 * `\import{dir}{file}`, or `\subimport{dir}{file}` in the given LaTeX text.
 */
export function extractIncludedTexPaths(documentText: string): string[] {
  const uncommented = stripLatexComments(documentText);
  const results: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (rawPath: string) => {
    const trimmed = rawPath.trim();
    if (!trimmed) {
      return;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      results.push(trimmed);
    }
  };

  // \input{...}, \include{...}, \subfile{...}, \subfileinclude{...}
  const singleArgRegex = /\\(?:input|include|subfile|subfileinclude)\s*\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = singleArgRegex.exec(uncommented)) !== null) {
    addCandidate(match[1]);
  }

  // \import{dir}{file}, \subimport{dir}{file}, \inputfrom{dir}{file}, \includefrom{dir}{file}
  const twoArgRegex =
    /\\(?:sub)?(?:import|inputfrom|includefrom)\*?\s*\{([^{}]*)\}\s*\{([^{}]+)\}/g;
  while ((match = twoArgRegex.exec(uncommented)) !== null) {
    const dirPart = match[1].trim();
    const filePart = match[2].trim();
    if (filePart) {
      addCandidate(dirPart ? path.posix.join(dirPart, filePart) : filePart);
    }
  }

  return results;
}

interface CachedLabelFile {
  mtimeMs: number;
  size: number;
  labels: LatexLabelEntry[];
  includedPaths: string[];
}

const labelFileCache = new Map<string, CachedLabelFile>();

function isExistingFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveTexCandidatePath(rawRef: string, baseDirs: readonly string[]): string | undefined {
  const candidates = rawRef.toLowerCase().endsWith('.tex') ? [rawRef] : [`${rawRef}.tex`, rawRef];

  if (path.isAbsolute(rawRef)) {
    for (const candidate of candidates) {
      if (isExistingFile(candidate)) {
        return path.resolve(candidate);
      }
    }
    return undefined;
  }

  for (const base of baseDirs) {
    for (const rel of candidates) {
      const candidate = path.resolve(base, rel);
      if (isExistingFile(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function loadCachedLabelsFromFile(filePath: string): CachedLabelFile | undefined {
  const resolved = path.resolve(filePath);
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isFile() || stat.size > MAX_TEX_FILE_BYTES) {
      return undefined;
    }

    const cached = labelFileCache.get(resolved);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached;
    }

    const content = fs.readFileSync(resolved, 'utf8');
    const labels = parseLatexLabels(content);
    const includedPaths = extractIncludedTexPaths(content);
    const entry: CachedLabelFile = {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      labels,
      includedPaths,
    };
    labelFileCache.set(resolved, entry);
    return entry;
  } catch {
    return undefined;
  }
}

function collectTexFilesInDirectoryTree(
  rootDir: string,
  maxFiles: number = MAX_TEX_FILES
): string[] {
  const results: string[] = [];

  function walk(currentDir: string, depth: number) {
    if (depth > MAX_SCAN_DEPTH || results.length >= maxFiles) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    const subdirs: string[] = [];
    for (const entry of entries) {
      if (results.length >= maxFiles) {
        break;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.tex')) {
        results.push(path.resolve(currentDir, entry.name));
      } else if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !IGNORED_DIRS.has(entry.name) &&
        !entry.name.startsWith('_minted')
      ) {
        subdirs.push(path.join(currentDir, entry.name));
      }
    }

    for (const subdir of subdirs) {
      if (results.length >= maxFiles) {
        break;
      }
      walk(subdir, depth + 1);
    }
  }

  walk(path.resolve(rootDir), 0);
  return results;
}

/**
 * Checks whether a directory contains any `.tex` file at its top level (e.g. a main project root).
 */
function directoryHasDirectTexFile(dirPath: string): boolean {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.some((e) => e.isFile() && e.name.toLowerCase().endsWith('.tex'));
  } catch {
    return false;
  }
}

function formatSourceLabel(filePath: string, baseDir: string | undefined): string {
  if (baseDir) {
    const rel = path.relative(baseDir, filePath).replace(/\\/g, '/');
    if (rel && !rel.startsWith('../../')) {
      return rel;
    }
  }
  return path.basename(filePath);
}

/**
 * Loads all `\label{...}` entries for the current document and across split `.tex` files in the project:
 * 1. Parses the active in-memory `documentText` first.
 * 2. Follows `% !TEX root = ...` magic comments if present.
 * 3. Recursively resolves `\input`, `\include`, `\subfile`, and `\import` links.
 * 4. Scans `.tex` files in the document directory, parent project root (if editing a subfile in a subfolder),
 *    and workspace directories.
 */
export function loadLabelsForDocument(
  documentText: string,
  documentDir: string | undefined,
  workspaceDirs: readonly string[] = [],
  currentFilePath?: string
): LatexLabelEntry[] {
  const labelsByKey = new Map<string, LatexLabelEntry>();
  const visitedFiles = new Set<string>();

  const resolvedCurrentFile = currentFilePath ? path.resolve(currentFilePath) : undefined;
  if (resolvedCurrentFile) {
    visitedFiles.add(resolvedCurrentFile);
  }

  // Determine the best display base directory for relative source file labels
  const resolvedDocDir = documentDir ? path.resolve(documentDir) : undefined;
  const matchingWorkspaceDir = resolvedDocDir
    ? workspaceDirs
        .map((d) => path.resolve(d))
        .find((wsDir) => resolvedDocDir === wsDir || resolvedDocDir.startsWith(wsDir + path.sep))
    : workspaceDirs[0]
      ? path.resolve(workspaceDirs[0])
      : undefined;
  const displayBaseDir = matchingWorkspaceDir ?? resolvedDocDir;

  // 1. Parse current document text (in-memory)
  const currentSourceLabel = resolvedCurrentFile
    ? formatSourceLabel(resolvedCurrentFile, displayBaseDir)
    : undefined;
  const inMemoryLabels = parseLatexLabels(documentText, currentSourceLabel);
  for (const entry of inMemoryLabels) {
    labelsByKey.set(entry.key, entry);
  }

  // Collect project root directories to search
  const searchDirs: string[] = [];
  const addSearchDir = (dir: string) => {
    const resolved = path.resolve(dir);
    if (!searchDirs.includes(resolved)) {
      searchDirs.push(resolved);
    }
  };

  if (resolvedDocDir) {
    addSearchDir(resolvedDocDir);
  }

  // Check for `% !TEX root = ...` magic comment
  const texRootRel = extractTexRootComment(documentText);
  const fileQueue: string[] = [];

  if (texRootRel && resolvedDocDir) {
    const resolvedRootFile = resolveTexCandidatePath(texRootRel, [
      resolvedDocDir,
      ...workspaceDirs,
    ]);
    if (resolvedRootFile) {
      fileQueue.push(resolvedRootFile);
      addSearchDir(path.dirname(resolvedRootFile));
    }
  }

  // If current document is inside a subdirectory (e.g. `sections/intro.tex`) and its parent
  // directory contains `.tex` files (like `main.tex`), include the parent directory as a project root.
  if (resolvedDocDir) {
    const parentDir = path.dirname(resolvedDocDir);
    const tmpRoot = path.resolve(os.tmpdir());
    const fsRoot = path.parse(resolvedDocDir).root;
    if (
      parentDir !== resolvedDocDir &&
      parentDir !== tmpRoot &&
      parentDir !== fsRoot &&
      directoryHasDirectTexFile(parentDir)
    ) {
      addSearchDir(parentDir);
    }
  }

  for (const wsDir of workspaceDirs) {
    addSearchDir(wsDir);
  }

  if (searchDirs.length === 0) {
    return Array.from(labelsByKey.values());
  }

  // Seed queue with files directly referenced by `\input` / `\include` / `\subfile` / `\import` in current document
  for (const inc of extractIncludedTexPaths(documentText)) {
    const resolvedInc = resolveTexCandidatePath(inc, searchDirs);
    if (resolvedInc) {
      fileQueue.push(resolvedInc);
    }
  }

  // Seed queue with all `.tex` files discovered in searchDirs (handles sibling subfiles and root files)
  for (const dir of searchDirs) {
    for (const texFile of collectTexFilesInDirectoryTree(dir)) {
      fileQueue.push(texFile);
    }
  }

  // Process queue and recursively follow any `\input` / `\include` / `\subfile` / `\import`
  while (fileQueue.length > 0) {
    const nextFile = fileQueue.shift()!;
    const normalized = path.resolve(nextFile);
    if (visitedFiles.has(normalized)) {
      continue;
    }
    visitedFiles.add(normalized);

    const cached = loadCachedLabelsFromFile(normalized);
    if (!cached) {
      continue;
    }

    const sourceLabel = formatSourceLabel(normalized, displayBaseDir);
    for (const rawLabel of cached.labels) {
      if (!labelsByKey.has(rawLabel.key)) {
        labelsByKey.set(rawLabel.key, {
          ...rawLabel,
          sourceFile: sourceLabel,
        });
      }
    }

    const fileDir = path.dirname(normalized);
    const includeBaseDirs = [fileDir, ...searchDirs];
    for (const inc of cached.includedPaths) {
      const resolvedInc = resolveTexCandidatePath(inc, includeBaseDirs);
      if (resolvedInc && !visitedFiles.has(resolvedInc)) {
        fileQueue.push(resolvedInc);
      }
    }
  }

  return Array.from(labelsByKey.values());
}
