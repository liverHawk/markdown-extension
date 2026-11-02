import * as fs from 'fs';
import * as path from 'path';

export interface LatexPackageEntry {
  /** Package name without `.sty` extension (e.g. "mycustom", "amsmath") */
  name: string;
  /** Short description shown in completion detail */
  detail: string;
  /** Whether this package comes from a local `.sty` file */
  isLocal: boolean;
  /** Source file name or relative label if local (e.g. "mycustom.sty") */
  sourceFile?: string;
}

export interface UsepackageContext {
  /** Command name without leading backslash ("usepackage" or "RequirePackage") */
  command: string;
  /** Partial package name before the cursor */
  packagePrefix: string;
  /** Start character index on the current line for replacing packagePrefix */
  startCharacter: number;
  /** Packages already listed earlier in the same braces (e.g. \usepackage{amsmath, }) */
  existingPackages: string[];
}

export const BUILTIN_LATEX_PACKAGES: readonly LatexPackageEntry[] = [
  // Math & Symbols
  {
    name: 'amsmath',
    detail: 'AMS mathematical facilities (align, gather, matrix, etc.)',
    isLocal: false,
  },
  { name: 'amssymb', detail: 'AMS extended mathematical symbols (ℝ, ℤ, etc.)', isLocal: false },
  { name: 'amsfonts', detail: 'AMS mathematical fonts (\\mathbb, \\mathfrak)', isLocal: false },
  {
    name: 'amsthm',
    detail: 'AMS theorem-like environments (theorem, lemma, proof)',
    isLocal: false,
  },
  { name: 'mathtools', detail: 'Extension and fixes to amsmath', isLocal: false },
  { name: 'bm', detail: 'Bold math symbols (\\bm{...})', isLocal: false },
  {
    name: 'physics',
    detail: 'Macros for physics notation (derivatives, brakets, matrices)',
    isLocal: false,
  },
  { name: 'siunitx', detail: 'SI units and numerical formatting (\\SI, \\num)', isLocal: false },
  { name: 'cancel', detail: 'Strike-through cancellation in math formulas', isLocal: false },

  // Graphics, Figures & Colors
  { name: 'graphicx', detail: 'Enhanced graphics inclusion (\\includegraphics)', isLocal: false },
  { name: 'xcolor', detail: 'Driver-independent color extensions', isLocal: false },
  { name: 'tikz', detail: 'PGF/TikZ vector graphics creation', isLocal: false },
  {
    name: 'pgfplots',
    detail: 'High-quality function and data plots based on TikZ',
    isLocal: false,
  },
  {
    name: 'float',
    detail: 'Improved interface for floating objects ([H] specifier)',
    isLocal: false,
  },
  { name: 'caption', detail: 'Customising captions in floating environments', isLocal: false },
  { name: 'subcaption', detail: 'Support for sub-captions (subfigure, subtable)', isLocal: false },
  { name: 'wrapfig', detail: 'Produces figures which text can flow around', isLocal: false },

  // Tables & Lists
  {
    name: 'booktabs',
    detail: 'Publication quality tables (\\toprule, \\midrule, \\bottomrule)',
    isLocal: false,
  },
  { name: 'multirow', detail: 'Create tabular cells spanning multiple rows', isLocal: false },
  { name: 'tabularx', detail: 'Tabulars with adjustable-width columns (X column)', isLocal: false },
  { name: 'longtable', detail: 'Tables spanning multiple pages', isLocal: false },
  { name: 'array', detail: 'Extending the array and tabular environments', isLocal: false },
  { name: 'enumitem', detail: 'Control layout of itemize, enumerate, description', isLocal: false },

  // Page Layout, Typography & Fonts
  {
    name: 'geometry',
    detail: 'Flexible and complete interface to document dimensions',
    isLocal: false,
  },
  { name: 'fancyhdr', detail: 'Extensive control of page headers and footers', isLocal: false },
  { name: 'titlesec', detail: 'Select alternative section titles', isLocal: false },
  {
    name: 'setspace',
    detail: 'Set space between lines (\\onehalfspacing, \\doublespacing)',
    isLocal: false,
  },
  {
    name: 'microtype',
    detail: 'Subliminal refinements towards typographical perfection',
    isLocal: false,
  },
  { name: 'fontenc', detail: 'Standard package for selecting font encodings', isLocal: false },
  { name: 'inputenc', detail: 'Accept different input encodings', isLocal: false },
  { name: 'lmodern', detail: 'Latin Modern family of fonts', isLocal: false },
  { name: 'babel', detail: 'Multilingual support for LaTeX', isLocal: false },

  // Links, Citations, Code & Algorithms
  {
    name: 'hyperref',
    detail: 'Extensive support for hypertext and cross-referencing links',
    isLocal: false,
  },
  { name: 'cleveref', detail: 'Intelligent cross-referencing (\\cref, \\Cref)', isLocal: false },
  { name: 'url', detail: 'Verbatim with URL-sensitive line breaks', isLocal: false },
  { name: 'natbib', detail: 'Flexible bibliography support (\\citep, \\citet)', isLocal: false },
  {
    name: 'biblatex',
    detail: 'Sophisticated bibliographies in LaTeX (\\addbibresource)',
    isLocal: false,
  },
  { name: 'cite', detail: 'Improved citation handling and compression', isLocal: false },
  { name: 'listings', detail: 'Typeset source code listings', isLocal: false },
  { name: 'minted', detail: 'Highlighted source code for LaTeX via Pygments', isLocal: false },
  { name: 'algorithm', detail: 'Floating algorithm environment', isLocal: false },
  { name: 'algpseudocode', detail: 'Pseudocode layout from algorithmicx package', isLocal: false },
  {
    name: 'algorithm2e',
    detail: 'Floating algorithm environment with customizable style',
    isLocal: false,
  },
  {
    name: 'tcolorbox',
    detail: 'Colored boxes for LaTeX examples, theorems, and code',
    isLocal: false,
  },

  // Japanese / CJK support
  { name: 'luatexja', detail: 'Japanese typesetting with LuaLaTeX', isLocal: false },
  {
    name: 'pxjahyper',
    detail: 'Hyperref support for pLaTeX/upLaTeX Japanese bookmarks',
    isLocal: false,
  },
];

const USEPACKAGE_PREFIX_REGEX = /\\(usepackage|RequirePackage)(?:\[[^\]]*\])?\{([^{}]*)$/;

function findUnescapedCommentIndex(line: string): number {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\') {
      i++;
      continue;
    }
    if (line[i] === '%') {
      return i;
    }
  }
  return -1;
}

/**
 * Detects whether the cursor is currently inside the braces `{...}` of `\usepackage{...}`
 * or `\RequirePackage{...}`.
 */
export function extractUsepackageContext(linePrefix: string): UsepackageContext | undefined {
  if (findUnescapedCommentIndex(linePrefix) !== -1) {
    return undefined;
  }

  const match = USEPACKAGE_PREFIX_REGEX.exec(linePrefix);
  if (!match) {
    return undefined;
  }

  // Ensure the backslash is not part of `\\` (line break)
  if (match.index > 0 && linePrefix[match.index - 1] === '\\') {
    return undefined;
  }

  const command = match[1];
  const insideBraces = match[2];

  const lastCommaIndex = insideBraces.lastIndexOf(',');
  const existingPackages: string[] = [];

  if (lastCommaIndex !== -1) {
    const previousPart = insideBraces.slice(0, lastCommaIndex);
    for (const part of previousPart.split(',')) {
      const trimmed = part.trim();
      if (trimmed) {
        existingPackages.push(trimmed);
      }
    }
  }

  const rawCurrentSegment =
    lastCommaIndex === -1 ? insideBraces : insideBraces.slice(lastCommaIndex + 1);
  const leadingWhitespaceLength = rawCurrentSegment.length - rawCurrentSegment.trimStart().length;
  const packagePrefix = rawCurrentSegment.slice(leadingWhitespaceLength);

  if (/\s/.test(packagePrefix)) {
    return undefined;
  }

  const bracesContentStart = linePrefix.length - insideBraces.length;
  const segmentOffset = lastCommaIndex === -1 ? 0 : lastCommaIndex + 1;
  const startCharacter = bracesContentStart + segmentOffset + leadingWhitespaceLength;

  return {
    command,
    packagePrefix,
    startCharacter,
    existingPackages,
  };
}

interface CachedStyFile {
  mtimeMs: number;
  entry: LatexPackageEntry;
}

const styFileCache = new Map<string, CachedStyFile>();

/**
 * Extracts package metadata from a `.sty` file, reading `\ProvidesPackage{...}[description]`
 * if present near the top of the file.
 */
function parseStyFileMetadata(styFilePath: string): LatexPackageEntry {
  const fileName = path.basename(styFilePath);
  const pkgName = fileName.replace(/\.sty$/i, '');

  try {
    const stat = fs.statSync(styFilePath);
    const cached = styFileCache.get(styFilePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.entry;
    }

    // Read up to first 4096 bytes to look for \ProvidesPackage{...}[...]
    const fd = fs.openSync(styFilePath, 'r');
    let headText = '';
    try {
      const buffer = Buffer.alloc(4096);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      headText = buffer.toString('utf8', 0, bytesRead);
    } finally {
      fs.closeSync(fd);
    }

    const providesMatch = /\\ProvidesPackage\s*\{[^{}]*\}\s*\[([^\]]+)\]/.exec(headText);
    const description = providesMatch ? providesMatch[1].replace(/\s+/g, ' ').trim() : undefined;
    const detail = description
      ? `Local style (${fileName}) — ${description}`
      : `Local style file (${fileName})`;

    const entry: LatexPackageEntry = {
      name: pkgName,
      detail,
      isLocal: true,
      sourceFile: fileName,
    };

    styFileCache.set(styFilePath, { mtimeMs: stat.mtimeMs, entry });
    return entry;
  } catch {
    return {
      name: pkgName,
      detail: `Local style file (${fileName})`,
      isLocal: true,
      sourceFile: fileName,
    };
  }
}

/**
 * Discovers `.sty` files in the workspace root directory (and the current document's directory)
 * and merges them with built-in common LaTeX packages.
 */
export function resolveLatexPackages(
  documentDir: string | undefined,
  workspaceDirs: readonly string[] = [],
  includeBuiltin: boolean = true
): LatexPackageEntry[] {
  const packageMap = new Map<string, LatexPackageEntry>();

  // Collect unique directories to inspect: workspace root(s) + current document directory
  const searchDirs: string[] = [];
  const seenDirs = new Set<string>();

  for (const wsDir of workspaceDirs) {
    const resolved = path.resolve(wsDir);
    if (!seenDirs.has(resolved)) {
      seenDirs.add(resolved);
      searchDirs.push(resolved);
    }
  }

  if (documentDir) {
    const resolved = path.resolve(documentDir);
    if (!seenDirs.has(resolved)) {
      seenDirs.add(resolved);
      searchDirs.push(resolved);
    }
  }

  // 1. Scan local `.sty` files first so they take priority
  for (const dir of searchDirs) {
    try {
      const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
      for (const dirent of dirEntries) {
        if (!dirent.isFile() || !dirent.name.toLowerCase().endsWith('.sty')) {
          continue;
        }
        const fullPath = path.join(dir, dirent.name);
        const entry = parseStyFileMetadata(fullPath);
        if (entry.name && !packageMap.has(entry.name)) {
          packageMap.set(entry.name, entry);
        }
      }
    } catch {
      // Ignore unreadable or non-existent directories gracefully
    }
  }

  // 2. Add built-in common LaTeX packages
  if (includeBuiltin) {
    for (const builtinPkg of BUILTIN_LATEX_PACKAGES) {
      if (!packageMap.has(builtinPkg.name)) {
        packageMap.set(builtinPkg.name, builtinPkg);
      }
    }
  }

  return Array.from(packageMap.values());
}
