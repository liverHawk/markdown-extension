import * as fs from 'fs';
import * as path from 'path';
import { LatexCommandDefinition } from './builtinCommands.js';

interface CachedCommandFile {
  mtimeMs: number;
  size: number;
  commands: LatexCommandDefinition[];
}

const commandFileCache = new Map<string, CachedCommandFile>();

/** Maximum file size (1 MB) to parse for LaTeX command definitions */
const MAX_COMMAND_FILE_BYTES = 1024 * 1024;

/** Maximum body preview length in completion item detail */
const MAX_BODY_PREVIEW_LENGTH = 60;

function stripComments(content: string): string {
  const lines = content.split(/\r?\n/);
  const strippedLines = lines.map((line) => {
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) {
        return line.slice(0, i);
      }
    }
    return line;
  });
  return strippedLines.join('\n');
}

function skipWhitespace(text: string, index: number): number {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  return i;
}

/**
 * Reads a balanced `{...}` group starting at `startIndex` (which must point to `{`).
 * Returns the inner text and the index immediately after the closing `}`.
 */
function readBracedGroup(
  text: string,
  startIndex: number
): { content: string; nextIndex: number } | undefined {
  if (text[startIndex] !== '{') {
    return undefined;
  }
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++; // Skip escaped char
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(startIndex + 1, i),
          nextIndex: i + 1,
        };
      }
    }
  }
  return undefined;
}

/**
 * Reads a `[...]` optional group starting at `startIndex` (which must point to `[`).
 */
function readBracketGroup(
  text: string,
  startIndex: number
): { content: string; nextIndex: number } | undefined {
  if (text[startIndex] !== '[') {
    return undefined;
  }
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(startIndex + 1, i),
          nextIndex: i + 1,
        };
      }
    }
  }
  return undefined;
}

/**
 * Reads either `{\cmd}` or `\cmd` starting at `startIndex`.
 */
function readCommandName(
  text: string,
  startIndex: number
): { name: string; nextIndex: number } | undefined {
  const i = skipWhitespace(text, startIndex);
  if (i >= text.length) {
    return undefined;
  }

  if (text[i] === '{') {
    const group = readBracedGroup(text, i);
    if (!group) {
      return undefined;
    }
    const trimmed = group.content.trim();
    const match = /^\\([a-zA-Z@]+)$/.exec(trimmed);
    if (!match) {
      return undefined;
    }
    return { name: match[1], nextIndex: group.nextIndex };
  }

  if (text[i] === '\\') {
    const match = /^\\([a-zA-Z@]+)/.exec(text.slice(i));
    if (!match) {
      return undefined;
    }
    return { name: match[1], nextIndex: i + match[0].length };
  }

  return undefined;
}

function formatBodyPreview(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= MAX_BODY_PREVIEW_LENGTH) {
    return compact;
  }
  return `${compact.slice(0, MAX_BODY_PREVIEW_LENGTH - 3)}...`;
}

function escapeSnippetPlaceholder(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/\}/g, '\\}');
}

function buildSnippet(commandName: string, argCount: number, defaultOpt?: string): string {
  if (argCount <= 0) {
    return commandName;
  }

  const parts: string[] = [commandName];
  let tabstop = 1;

  if (defaultOpt !== undefined) {
    parts.push(`[$\{${tabstop}:${escapeSnippetPlaceholder(defaultOpt)}}]`);
    tabstop++;
  }

  const remainingMandatory = defaultOpt !== undefined ? argCount - 1 : argCount;
  for (let idx = 1; idx <= remainingMandatory; idx++) {
    const argIndex = defaultOpt !== undefined ? idx + 1 : idx;
    parts.push(`{$\{${tabstop}:arg${argIndex}}}`);
    tabstop++;
  }

  return parts.join('');
}

/**
 * Parses LaTeX macro definitions (`\newcommand`, `\renewcommand`, `\providecommand`,
 * `\DeclareRobustCommand`, `\DeclareMathOperator`, `\DeclarePairedDelimiter`, `\def`)
 * from file content and returns completion definitions.
 * Internal commands containing `@` are excluded.
 */
export function parseLatexCommandDefinitions(
  content: string,
  sourceName: string = 'file'
): LatexCommandDefinition[] {
  const clean = stripComments(content);
  const commandMap = new Map<string, LatexCommandDefinition>();

  // 1. \newcommand, \renewcommand, \providecommand, \DeclareRobustCommand (with optional *)
  const newcmdRegex =
    /\\(?:newcommand|renewcommand|providecommand|DeclareRobustCommand)\*?(?![a-zA-Z@])/g;
  let match: RegExpExecArray | null;

  while ((match = newcmdRegex.exec(clean)) !== null) {
    const afterKeyword = match.index + match[0].length;
    const cmdInfo = readCommandName(clean, afterKeyword);
    if (!cmdInfo || cmdInfo.name.includes('@')) {
      continue;
    }

    let cursor = skipWhitespace(clean, cmdInfo.nextIndex);
    let argCount = 0;
    let defaultOpt: string | undefined;

    if (clean[cursor] === '[') {
      const argCountGroup = readBracketGroup(clean, cursor);
      if (argCountGroup) {
        const parsedCount = parseInt(argCountGroup.content.trim(), 10);
        if (!Number.isNaN(parsedCount) && parsedCount >= 0 && parsedCount <= 9) {
          argCount = parsedCount;
        }
        cursor = skipWhitespace(clean, argCountGroup.nextIndex);

        if (clean[cursor] === '[') {
          const defaultGroup = readBracketGroup(clean, cursor);
          if (defaultGroup) {
            defaultOpt = defaultGroup.content.trim();
            cursor = skipWhitespace(clean, defaultGroup.nextIndex);
          }
        }
      }
    }

    const bodyGroup = readBracedGroup(clean, cursor);
    if (!bodyGroup) {
      continue;
    }

    const preview = formatBodyPreview(bodyGroup.content);
    const snippet = buildSnippet(cmdInfo.name, argCount, defaultOpt);
    const detail = preview ? `Defined in ${sourceName}: ${preview}` : `Defined in ${sourceName}`;

    commandMap.set(cmdInfo.name, {
      command: cmdInfo.name,
      snippet,
      detail,
    });
  }

  // 2. \DeclareMathOperator and \DeclareMathOperator*
  const mathOpRegex = /\\DeclareMathOperator\*?(?![a-zA-Z@])/g;
  while ((match = mathOpRegex.exec(clean)) !== null) {
    const afterKeyword = match.index + match[0].length;
    const cmdInfo = readCommandName(clean, afterKeyword);
    if (!cmdInfo || cmdInfo.name.includes('@')) {
      continue;
    }

    const cursor = skipWhitespace(clean, cmdInfo.nextIndex);
    const bodyGroup = readBracedGroup(clean, cursor);
    if (!bodyGroup) {
      continue;
    }

    const preview = formatBodyPreview(bodyGroup.content);
    commandMap.set(cmdInfo.name, {
      command: cmdInfo.name,
      snippet: cmdInfo.name,
      detail: preview
        ? `Math operator (${sourceName}): ${preview}`
        : `Math operator (${sourceName})`,
    });
  }

  // 3. \DeclarePairedDelimiter{\cmd}{left}{right}
  const pairedDelimRegex = /\\DeclarePairedDelimiter(?![a-zA-Z@])/g;
  while ((match = pairedDelimRegex.exec(clean)) !== null) {
    const afterKeyword = match.index + match[0].length;
    const cmdInfo = readCommandName(clean, afterKeyword);
    if (!cmdInfo || cmdInfo.name.includes('@')) {
      continue;
    }

    const leftCursor = skipWhitespace(clean, cmdInfo.nextIndex);
    const leftGroup = readBracedGroup(clean, leftCursor);
    if (!leftGroup) {
      continue;
    }

    const rightCursor = skipWhitespace(clean, leftGroup.nextIndex);
    const rightGroup = readBracedGroup(clean, rightCursor);
    if (!rightGroup) {
      continue;
    }

    const leftPreview = formatBodyPreview(leftGroup.content);
    const rightPreview = formatBodyPreview(rightGroup.content);
    commandMap.set(cmdInfo.name, {
      command: cmdInfo.name,
      snippet: buildSnippet(cmdInfo.name, 1),
      detail: `Paired delimiter (${sourceName}): ${leftPreview} ... ${rightPreview}`,
    });
  }

  // 4. \def\cmd#1#2{body}
  const defRegex = /\\def\s*\\([a-zA-Z@]+)([^{}\r\n]*)\{/g;
  while ((match = defRegex.exec(clean)) !== null) {
    const cmdName = match[1];
    if (cmdName.includes('@') || commandMap.has(cmdName)) {
      continue;
    }

    const paramSpec = match[2];
    const braceStart = match.index + match[0].length - 1;
    const bodyGroup = readBracedGroup(clean, braceStart);
    if (!bodyGroup) {
      continue;
    }

    const paramMatches = paramSpec.match(/#[1-9]/g);
    const argCount = paramMatches ? paramMatches.length : 0;
    const preview = formatBodyPreview(bodyGroup.content);

    commandMap.set(cmdName, {
      command: cmdName,
      snippet: buildSnippet(cmdName, argCount),
      detail: preview ? `Defined in ${sourceName}: ${preview}` : `Defined in ${sourceName}`,
    });
  }

  return Array.from(commandMap.values());
}

/**
 * Loads and parses LaTeX command definitions from a list of file paths using an mtime+size cache.
 * Later files in the list override commands with the same name from earlier files.
 */
export function loadCommandsFromFiles(filePaths: readonly string[]): LatexCommandDefinition[] {
  const merged = new Map<string, LatexCommandDefinition>();

  for (const rawPath of filePaths) {
    const resolved = path.resolve(rawPath);
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile() || stat.size > MAX_COMMAND_FILE_BYTES) {
        continue;
      }

      const cached = commandFileCache.get(resolved);
      let defs: LatexCommandDefinition[];

      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
        defs = cached.commands;
      } else {
        const content = fs.readFileSync(resolved, 'utf8');
        defs = parseLatexCommandDefinitions(content, path.basename(resolved));
        commandFileCache.set(resolved, {
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          commands: defs,
        });
      }

      for (const def of defs) {
        merged.set(def.command, def);
      }
    } catch {
      // Ignore missing or unreadable files
    }
  }

  return Array.from(merged.values());
}

function isCommandSourceFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.sty') || lower.endsWith('.tex') || lower.endsWith('.cls');
}

function listDirectoryCommandFiles(dirPath: string): string[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && isCommandSourceFile(e.name))
      .map((e) => path.join(dirPath, e.name))
      .sort();
  } catch {
    return [];
  }
}

function extractReferencedLocalFiles(
  documentText: string,
  documentDir: string | undefined,
  workspaceDirs: readonly string[]
): string[] {
  const results: string[] = [];
  const searchBaseDirs = [...(documentDir ? [documentDir] : []), ...workspaceDirs];
  if (searchBaseDirs.length === 0) {
    return results;
  }

  const stripped = stripComments(documentText);

  // \usepackage{a,b} or \RequirePackage{a,b}
  const pkgRegex = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\]\s*)?\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pkgRegex.exec(stripped)) !== null) {
    for (const part of match[1].split(',')) {
      const pkg = part.trim();
      if (!pkg) {
        continue;
      }
      const fileName = pkg.toLowerCase().endsWith('.sty') ? pkg : `${pkg}.sty`;
      for (const base of searchBaseDirs) {
        const candidate = path.resolve(base, fileName);
        if (isExistingFile(candidate)) {
          results.push(candidate);
          break;
        }
      }
    }
  }

  // \input{...} or \include{...}
  const inputRegex = /\\(?:input|include)\s*\{([^}]+)\}/g;
  while ((match = inputRegex.exec(stripped)) !== null) {
    const rawRef = match[1].trim();
    if (!rawRef) {
      continue;
    }
    const candidates = rawRef.toLowerCase().endsWith('.tex') ? [rawRef] : [rawRef, `${rawRef}.tex`];
    for (const base of searchBaseDirs) {
      let matched = false;
      for (const rel of candidates) {
        const candidate = path.resolve(base, rel);
        if (isExistingFile(candidate)) {
          results.push(candidate);
          matched = true;
          break;
        }
      }
      if (matched) {
        break;
      }
    }
  }

  return results;
}

function isExistingFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolves local `.sty` / `.tex` / `.cls` files to scan for custom LaTeX commands:
 * 1. Direct `.sty`/`.tex`/`.cls` files in workspace roots
 * 2. Direct `.sty`/`.tex`/`.cls` files in the current document's directory
 * 3. Local files referenced by `\usepackage`, `\input`, `\include` in the document
 * 4. Files or directories specified in `configuredPaths` (`paperflow.latex.commandFiles`)
 */
export function resolveCommandFilePaths(
  documentText: string,
  documentDir: string | undefined,
  workspaceDirs: readonly string[] = [],
  configuredPaths: readonly string[] = [],
  excludeFilePath?: string
): string[] {
  const orderedPaths: string[] = [];
  const seen = new Set<string>();
  if (excludeFilePath) {
    seen.add(path.resolve(excludeFilePath));
  }

  const addFile = (filePath: string) => {
    const normalized = path.resolve(filePath);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      orderedPaths.push(normalized);
    }
  };

  // 1. Workspace root direct files
  for (const wsDir of workspaceDirs) {
    for (const file of listDirectoryCommandFiles(wsDir)) {
      addFile(file);
    }
  }

  // 2. Document directory direct files
  if (documentDir) {
    for (const file of listDirectoryCommandFiles(documentDir)) {
      addFile(file);
    }
  }

  // 3. Referenced local files in documentText
  for (const file of extractReferencedLocalFiles(documentText, documentDir, workspaceDirs)) {
    addFile(file);
  }

  // 4. Configured paths (files or directories, absolute or relative to workspace/documentDir)
  const baseDirs = [...workspaceDirs, ...(documentDir ? [documentDir] : [])];
  for (const rawConfigPath of configuredPaths) {
    if (typeof rawConfigPath !== 'string') {
      continue;
    }
    const trimmed = rawConfigPath.trim();
    if (!trimmed) {
      continue;
    }

    const candidateTargets: string[] = path.isAbsolute(trimmed)
      ? [trimmed]
      : baseDirs.map((base) => path.resolve(base, trimmed));

    for (const target of candidateTargets) {
      try {
        const stat = fs.statSync(target);
        if (stat.isFile()) {
          addFile(target);
          break;
        } else if (stat.isDirectory()) {
          for (const file of listDirectoryCommandFiles(target)) {
            addFile(file);
          }
          break;
        }
      } catch {
        // Continue checking next base dir
      }
    }
  }

  return orderedPaths;
}
