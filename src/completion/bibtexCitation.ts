import * as fs from 'fs';
import * as path from 'path';

export interface BibtexEntry {
  /** Citation key (e.g. "vaswani2017attention") */
  key: string;
  /** Entry type in lowercase (e.g. "article", "inproceedings", "book") */
  entryType: string;
  /** Cleaned title if present */
  title?: string;
  /** Cleaned author list if present */
  author?: string;
  /** Publication year if present */
  year?: string;
  /** Journal, booktitle, or publisher if present */
  venue?: string;
  /** Source .bib file name (optional) */
  sourceFile?: string;
}

export interface CitationContext {
  /** The citation command name without leading backslash (e.g. "cite", "citep") */
  command: string;
  /** The partial citation key currently being typed before the cursor */
  keyPrefix: string;
  /** Start character index on the current line for replacing keyPrefix */
  startCharacter: number;
  /** Keys already specified earlier in the same citation braces (e.g. in \cite{a, b}) */
  existingKeys: string[];
}

const IGNORED_BIB_TYPES = new Set(['comment', 'preamble', 'string']);

/**
 * Matches citation commands at the end of a line prefix (up to the cursor),
 * supporting optional starred commands, up to two optional [...] arguments,
 * and comma-separated citation keys inside `{...`.
 *
 * Examples matched:
 * - `\cite{`
 * - `\cite{vasw`
 * - `\citep[p.~5]{key1, key2`
 * - `\parencite[see][p.~10]{key1, `
 */
const CITATION_PREFIX_REGEX =
  /\\((?:(?:[cC]ite(?:t|p|alt|alp|author|year|yearpar|num)?)|nocite|[pP]arencite|[tT]extcite|[aA]utocite|footcite|fullcite|supercite|smartcite)\*?)(?:\[[^\]]*\]){0,2}\{([^{}]*)$/;

/**
 * Detects whether the cursor is currently inside the braces `{...}` of a LaTeX citation command.
 */
export function extractCitationContext(linePrefix: string): CitationContext | undefined {
  // Ignore if preceded by an unescaped `%` comment on the same line
  const commentIndex = findUnescapedCommentIndex(linePrefix);
  if (commentIndex !== -1) {
    return undefined;
  }

  const match = CITATION_PREFIX_REGEX.exec(linePrefix);
  if (!match) {
    return undefined;
  }

  // Ensure the backslash is not part of `\\` (line break)
  if (match.index > 0 && linePrefix[match.index - 1] === '\\') {
    return undefined;
  }

  const command = match[1];
  const insideBraces = match[2];

  // Split by comma to support multiple citations: \cite{key1, key2}
  const lastCommaIndex = insideBraces.lastIndexOf(',');
  const existingKeys: string[] = [];

  if (lastCommaIndex !== -1) {
    const previousPart = insideBraces.slice(0, lastCommaIndex);
    for (const part of previousPart.split(',')) {
      const trimmed = part.trim();
      if (trimmed) {
        existingKeys.push(trimmed);
      }
    }
  }

  const rawCurrentSegment =
    lastCommaIndex === -1 ? insideBraces : insideBraces.slice(lastCommaIndex + 1);
  const leadingWhitespaceLength = rawCurrentSegment.length - rawCurrentSegment.trimStart().length;
  const keyPrefix = rawCurrentSegment.slice(leadingWhitespaceLength);

  // Citation keys should not contain spaces
  if (/\s/.test(keyPrefix)) {
    return undefined;
  }

  const bracesContentStart = linePrefix.length - insideBraces.length;
  const segmentOffset = lastCommaIndex === -1 ? 0 : lastCommaIndex + 1;
  const startCharacter = bracesContentStart + segmentOffset + leadingWhitespaceLength;

  return {
    command,
    keyPrefix,
    startCharacter,
    existingKeys,
  };
}

function findUnescapedCommentIndex(line: string): number {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\') {
      i++; // skip escaped character
      continue;
    }
    if (line[i] === '%') {
      return i;
    }
  }
  return -1;
}

/**
 * Strips unescaped LaTeX comments (`% ...`) from each line of text.
 */
function stripLatexComments(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const idx = findUnescapedCommentIndex(line);
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

/**
 * Extracts `.bib` file paths referenced by `\bibliography{...}`, `\addbibresource{...}`,
 * or `\nobibliography{...}` in the given LaTeX document text.
 * Preserves declaration order and deduplicates paths (normalized with `.bib` extension).
 */
export function extractBibliographyPaths(documentText: string): string[] {
  const uncommented = stripLatexComments(documentText);
  const results: string[] = [];
  const seen = new Set<string>();

  // Match \bibliography{a,b}, \nobibliography{a,b}, \addbibresource[...]{a.bib}
  const regex =
    /\\(?:no)?bibliography\s*\{([^{}]+)\}|\\addbibresource\s*(?:\[[^\]]*\])?\s*\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(uncommented)) !== null) {
    const rawArg = match[1] ?? match[2];
    if (!rawArg) {
      continue;
    }

    for (const part of rawArg.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }
      const normalized = trimmed.toLowerCase().endsWith('.bib') ? trimmed : `${trimmed}.bib`;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push(normalized);
      }
    }
  }

  return results;
}

/**
 * Cleans up BibTeX field values by removing outer/inner braces, newlines, and extra spaces.
 */
function cleanBibValue(raw: string): string {
  return raw.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Parses a BibTeX `.bib` file content into an array of `BibtexEntry` objects.
 */
export function parseBibtex(content: string, sourceFile?: string): BibtexEntry[] {
  const entries: BibtexEntry[] = [];
  const entryHeaderRegex = /@([a-zA-Z]+)\s*([({])/g;
  let match: RegExpExecArray | null;

  while ((match = entryHeaderRegex.exec(content)) !== null) {
    const entryType = match[1].toLowerCase();
    const openDelimiter = match[2];
    const closeDelimiter = openDelimiter === '{' ? '}' : ')';
    const bodyStart = match.index + match[0].length;

    // Find matching closing delimiter for the entry
    let depth = 1;
    let i = bodyStart;
    let inQuotes = false;

    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (ch === openDelimiter || ch === '{') {
          depth++;
        } else if (ch === closeDelimiter || ch === '}') {
          depth--;
        }
      }
      i++;
    }

    if (IGNORED_BIB_TYPES.has(entryType)) {
      entryHeaderRegex.lastIndex = i;
      continue;
    }

    const body = content.slice(bodyStart, Math.max(bodyStart, i - 1));
    const firstComma = body.indexOf(',');
    if (firstComma === -1) {
      entryHeaderRegex.lastIndex = i;
      continue;
    }

    const key = body.slice(0, firstComma).trim();
    if (!key || /[\s,{}]/.test(key)) {
      entryHeaderRegex.lastIndex = i;
      continue;
    }

    const fieldsText = body.slice(firstComma + 1);
    const fields = parseBibtexFields(fieldsText);

    const title = fields.get('title');
    const author = fields.get('author') ?? fields.get('editor');
    const year = fields.get('year') ?? extractYearFromDate(fields.get('date'));
    const venue =
      fields.get('journal') ??
      fields.get('journaltitle') ??
      fields.get('booktitle') ??
      fields.get('publisher') ??
      fields.get('institution') ??
      fields.get('school');

    const entry: BibtexEntry = {
      key,
      entryType,
    };
    if (title) {
      entry.title = title;
    }
    if (author) {
      entry.author = author;
    }
    if (year) {
      entry.year = year;
    }
    if (venue) {
      entry.venue = venue;
    }
    if (sourceFile) {
      entry.sourceFile = sourceFile;
    }

    entries.push(entry);
    entryHeaderRegex.lastIndex = i;
  }

  return entries;
}

function extractYearFromDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) {
    return undefined;
  }
  const m = /\b(\d{4})\b/.exec(dateStr);
  return m ? m[1] : dateStr;
}

/**
 * Parses `field = {value}` or `field = "value"` or `field = 2024` pairs inside a BibTeX entry body.
 */
function parseBibtexFields(fieldsText: string): Map<string, string> {
  const fields = new Map<string, string>();
  let i = 0;
  const len = fieldsText.length;

  while (i < len) {
    // Skip whitespace and commas
    while (i < len && /[\s,]/.test(fieldsText[i])) {
      i++;
    }
    if (i >= len) {
      break;
    }

    // Read field name
    const nameStart = i;
    while (i < len && /[a-zA-Z0-9_:-]/.test(fieldsText[i])) {
      i++;
    }
    const fieldName = fieldsText.slice(nameStart, i).toLowerCase();
    if (!fieldName) {
      i++;
      continue;
    }

    // Skip whitespace before '='
    while (i < len && /\s/.test(fieldsText[i])) {
      i++;
    }
    if (i >= len || fieldsText[i] !== '=') {
      // Advance to next comma
      while (i < len && fieldsText[i] !== ',') {
        i++;
      }
      continue;
    }
    i++; // skip '='

    // Skip whitespace after '='
    while (i < len && /\s/.test(fieldsText[i])) {
      i++;
    }
    if (i >= len) {
      break;
    }

    // Read field value
    let rawValue = '';
    if (fieldsText[i] === '{') {
      let braceDepth = 1;
      i++; // skip opening '{'
      const valStart = i;
      while (i < len && braceDepth > 0) {
        if (fieldsText[i] === '\\') {
          i += 2;
          continue;
        }
        if (fieldsText[i] === '{') {
          braceDepth++;
        } else if (fieldsText[i] === '}') {
          braceDepth--;
        }
        i++;
      }
      rawValue = fieldsText.slice(valStart, Math.max(valStart, i - 1));
    } else if (fieldsText[i] === '"') {
      i++; // skip opening '"'
      const valStart = i;
      let braceDepth = 0;
      while (i < len) {
        if (fieldsText[i] === '\\') {
          i += 2;
          continue;
        }
        if (fieldsText[i] === '{') {
          braceDepth++;
        } else if (fieldsText[i] === '}' && braceDepth > 0) {
          braceDepth--;
        } else if (fieldsText[i] === '"' && braceDepth === 0) {
          break;
        }
        i++;
      }
      rawValue = fieldsText.slice(valStart, i);
      if (i < len && fieldsText[i] === '"') {
        i++; // skip closing '"'
      }
    } else {
      const valStart = i;
      while (i < len && fieldsText[i] !== ',' && fieldsText[i] !== '\n' && fieldsText[i] !== '\r') {
        i++;
      }
      rawValue = fieldsText.slice(valStart, i);
    }

    const cleaned = cleanBibValue(rawValue);
    if (cleaned && !fields.has(fieldName)) {
      fields.set(fieldName, cleaned);
    }

    // Advance to next comma if not already there (e.g. if value used `#` concatenation)
    while (i < len && fieldsText[i] !== ',') {
      if (fieldsText[i] === '{') {
        let d = 1;
        i++;
        while (i < len && d > 0) {
          if (fieldsText[i] === '{') {
            d++;
          } else if (fieldsText[i] === '}') {
            d--;
          }
          i++;
        }
      } else {
        i++;
      }
    }
  }

  return fields;
}

/**
 * Loads and parses BibTeX entries from `.bib` files referenced in the given LaTeX document text.
 * Resolves relative paths against `documentDir` (and optional `workspaceDirs` as fallback).
 */
export function loadBibtexEntriesForDocument(
  documentText: string,
  documentDir: string | undefined,
  workspaceDirs: readonly string[] = []
): BibtexEntry[] {
  const bibPaths = extractBibliographyPaths(documentText);
  if (bibPaths.length === 0) {
    return [];
  }

  const entriesByKey = new Map<string, BibtexEntry>();

  for (const relOrAbsPath of bibPaths) {
    const resolvedPath = resolveBibFilePath(relOrAbsPath, documentDir, workspaceDirs);
    if (!resolvedPath) {
      continue;
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const parsed = parseBibtex(content, path.basename(resolvedPath));
      for (const entry of parsed) {
        if (!entriesByKey.has(entry.key)) {
          entriesByKey.set(entry.key, entry);
        }
      }
    } catch {
      // Ignore unreadable or missing .bib files gracefully
    }
  }

  return Array.from(entriesByKey.values());
}

function resolveBibFilePath(
  bibPath: string,
  documentDir: string | undefined,
  workspaceDirs: readonly string[]
): string | undefined {
  if (path.isAbsolute(bibPath)) {
    return fs.existsSync(bibPath) ? bibPath : undefined;
  }

  if (documentDir) {
    const candidate = path.resolve(documentDir, bibPath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const wsDir of workspaceDirs) {
    const candidate = path.resolve(wsDir, bibPath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
