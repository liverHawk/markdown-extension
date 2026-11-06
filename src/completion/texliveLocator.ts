import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface CachedPackageIndex {
  mtimeMs: number;
  index: Map<string, string>;
}

const packageIndexCache = new Map<string, CachedPackageIndex>();

const DEFAULT_TEXLIVE_BASE_DIRS = [
  '/usr/local/texlive',
  'C:\\texlive',
  '/opt/texlive',
  path.join(os.homedir(), 'texlive'),
];

const MAX_SCAN_DEPTH = 6;

/**
 * Detects the TeX Live root directory (e.g. `/usr/local/texlive/2026` or `C:\texlive\2026`).
 * Priority:
 * 1. Explicit `configuredRoot` setting
 * 2. `TEXLIVE_ROOT` environment variable
 * 3. Latest 4-digit year subdirectory in standard TeX Live base paths
 */
export function detectTexliveRoot(
  configuredRoot?: string,
  envRoot: string | undefined = process.env.TEXLIVE_ROOT,
  candidateBaseDirs: readonly string[] = DEFAULT_TEXLIVE_BASE_DIRS
): string | undefined {
  if (configuredRoot && configuredRoot.trim().length > 0) {
    const resolved = path.resolve(configuredRoot.trim());
    if (isExistingDirectory(resolved)) {
      return resolved;
    }
  }

  if (envRoot && envRoot.trim().length > 0) {
    const resolved = path.resolve(envRoot.trim());
    if (isExistingDirectory(resolved)) {
      return resolved;
    }
  }

  for (const baseDir of candidateBaseDirs) {
    if (!isExistingDirectory(baseDir)) {
      continue;
    }
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      const years = entries
        .filter((e) => e.isDirectory() && /^\d{4}(?:basic)?$/i.test(e.name))
        .map((e) => e.name)
        .sort((a, b) => {
          const yearA = parseInt(a.slice(0, 4), 10);
          const yearB = parseInt(b.slice(0, 4), 10);
          if (yearB !== yearA) {
            return yearB - yearA;
          }
          // Prefer full TeX Live ("2026") over BasicTeX ("2026basic")
          return a.length - b.length;
        });

      if (years.length > 0) {
        return path.join(baseDir, years[0]);
      }
    } catch {
      // Ignore permission or read errors on candidate directories
    }
  }

  return undefined;
}

function isExistingDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveLatexSearchRoot(texliveRoot: string): string {
  const texmfLatex = path.join(texliveRoot, 'texmf-dist', 'tex', 'latex');
  if (isExistingDirectory(texmfLatex)) {
    return texmfLatex;
  }
  const texLatex = path.join(texliveRoot, 'tex', 'latex');
  if (isExistingDirectory(texLatex)) {
    return texLatex;
  }
  return texliveRoot;
}

/**
 * Builds or retrieves a cached map of package/class filenames (`foo.sty`, `bar.cls`, and bare `foo`)
 * to their absolute file paths under the TeX Live root.
 */
export function buildPackageIndex(texliveRoot: string): Map<string, string> {
  const searchRoot = resolveLatexSearchRoot(texliveRoot);
  try {
    const stat = fs.statSync(searchRoot);
    if (!stat.isDirectory()) {
      return new Map();
    }

    const cached = packageIndexCache.get(searchRoot);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.index;
    }

    const index = new Map<string, string>();
    scanDirectoryForPackages(searchRoot, 0, index);

    packageIndexCache.set(searchRoot, {
      mtimeMs: stat.mtimeMs,
      index,
    });
    return index;
  } catch {
    return new Map();
  }
}

function scanDirectoryForPackages(dir: string, depth: number, index: Map<string, string>): void {
  if (depth > MAX_SCAN_DEPTH) {
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryForPackages(fullPath, depth + 1, index);
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.sty') || lower.endsWith('.cls')) {
        if (!index.has(lower)) {
          index.set(lower, fullPath);
        }
        const bareName = lower.slice(0, -4);
        // Prefer .sty over .cls when looking up by bare name
        if (!index.has(bareName) || lower.endsWith('.sty')) {
          index.set(bareName, fullPath);
        }
      }
    }
  }
}

/**
 * Extracts package and documentclass names referenced in a LaTeX document.
 */
export function extractDocumentTexlivePackages(documentText: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const lines = documentText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = stripLineComment(rawLine);
    if (!line) {
      continue;
    }

    const pkgRegex = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\]\s*)?\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = pkgRegex.exec(line)) !== null) {
      for (const part of match[1].split(',')) {
        const trimmed = part.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          result.push(trimmed);
        }
      }
    }

    const clsRegex = /\\documentclass\s*(?:\[[^\]]*\]\s*)?\{([^}]+)\}/g;
    while ((match = clsRegex.exec(line)) !== null) {
      const clsName = match[1].trim();
      if (clsName) {
        const key = clsName.toLowerCase().endsWith('.cls') ? clsName : `${clsName}.cls`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(key);
        }
      }
    }
  }

  return result;
}

function stripLineComment(line: string): string {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * Resolves package/class names against a TeX Live root directory and returns matching file paths.
 */
export function resolveTexlivePackageFiles(
  names: readonly string[],
  texliveRoot: string | undefined
): string[] {
  if (!texliveRoot || names.length === 0) {
    return [];
  }

  const index = buildPackageIndex(texliveRoot);
  if (index.size === 0) {
    return [];
  }

  const resolved: string[] = [];
  const seenPaths = new Set<string>();

  for (const rawName of names) {
    const clean = rawName.trim().toLowerCase();
    if (!clean) {
      continue;
    }

    const found = index.get(clean) ?? index.get(`${clean}.sty`) ?? index.get(`${clean}.cls`);
    if (found && !seenPaths.has(found)) {
      seenPaths.add(found);
      resolved.push(found);
    }
  }

  return resolved;
}
