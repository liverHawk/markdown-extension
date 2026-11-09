import * as path from 'path';
import * as vscode from 'vscode';
import {
  BibtexEntry,
  extractCitationContext,
  loadBibtexEntriesForDocument,
} from './bibtexCitation.js';
import { BUILTIN_LATEX_COMMANDS, LatexCommandDefinition } from './builtinCommands.js';
import {
  loadCommandsFromFiles,
  parseLatexCommandDefinitions,
  resolveCommandFilePaths,
} from './latexCommandFile.js';
import {
  extractUsepackageContext,
  LatexPackageEntry,
  resolveLatexPackages,
} from './latexPackageCompletion.js';
import { extractRefContext, LatexLabelEntry, loadLabelsForDocument } from './latexRefCompletion.js';
import { isInsideMathContext } from './mathContext.js';
import {
  detectTexliveRoot,
  extractDocumentTexlivePackages,
  resolveTexlivePackageFiles,
} from './texliveLocator.js';

export interface ResolveLatexCommandsOptions {
  isMarkdown?: boolean;
  texliveCommands?: readonly LatexCommandDefinition[];
  fileCommands?: readonly LatexCommandDefinition[];
}

/**
 * Merges built-in LaTeX commands, TeX Live commands, local file commands, and user-defined custom commands.
 * Priority: built-in < TeX Live < local file < customCommands.
 */
export function resolveLatexCommands(
  includeBuiltin: boolean,
  customCommands: Record<string, string> | undefined,
  options?: ResolveLatexCommandsOptions
): LatexCommandDefinition[] {
  const commandMap = new Map<string, LatexCommandDefinition>();
  const isMarkdown = options?.isMarkdown ?? false;

  if (includeBuiltin) {
    for (const cmd of BUILTIN_LATEX_COMMANDS) {
      if (isMarkdown && cmd.latexOnly) {
        continue;
      }
      commandMap.set(cmd.command, cmd);
    }
  }

  if (options?.texliveCommands) {
    for (const cmd of options.texliveCommands) {
      if (isMarkdown && cmd.latexOnly) {
        continue;
      }
      commandMap.set(cmd.command, cmd);
    }
  }

  if (options?.fileCommands) {
    for (const cmd of options.fileCommands) {
      if (isMarkdown && cmd.latexOnly) {
        continue;
      }
      commandMap.set(cmd.command, cmd);
    }
  }

  if (customCommands && typeof customCommands === 'object') {
    for (const [rawKey, rawSnippet] of Object.entries(customCommands)) {
      if (typeof rawKey !== 'string' || typeof rawSnippet !== 'string') {
        continue;
      }
      const trimmedKey = rawKey.trim();
      if (!trimmedKey) {
        continue;
      }
      const command = trimmedKey.startsWith('\\') ? trimmedKey.slice(1) : trimmedKey;
      if (!command) {
        continue;
      }
      const snippet = rawSnippet.startsWith('\\') ? rawSnippet.slice(1) : rawSnippet;
      commandMap.set(command, {
        command,
        snippet,
        detail: `Custom command: \\${snippet}`,
      });
    }
  }

  return Array.from(commandMap.values());
}

/**
 * Extracts the active LaTeX command prefix starting with `\` right before the cursor.
 * Returns undefined if the cursor is not currently typing a backslash command
 * or if the user just typed a line-break `\\` without any command characters.
 */
export function extractCommandPrefix(
  linePrefix: string
): { prefix: string; startCharacter: number } | undefined {
  const match = /\\([a-zA-Z0-9{[(|]*)$/.exec(linePrefix);
  if (!match) {
    return undefined;
  }

  // Avoid triggering completion popup right after typing `\\` (LaTeX line break)
  if (match[1].length === 0 && match.index > 0 && linePrefix[match.index - 1] === '\\') {
    return undefined;
  }

  return {
    prefix: match[0],
    startCharacter: match.index,
  };
}

export function createBibtexCompletionItem(
  entry: BibtexEntry,
  replacementRange: vscode.Range
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(entry.key, vscode.CompletionItemKind.Reference);
  item.insertText = entry.key;
  item.range = replacementRange;

  const detailParts: string[] = [];
  if (entry.author) {
    detailParts.push(entry.author);
  }
  if (entry.year) {
    detailParts.push(`(${entry.year})`);
  }
  if (entry.title) {
    detailParts.push(detailParts.length > 0 ? `- ${entry.title}` : entry.title);
  }
  item.detail = detailParts.length > 0 ? detailParts.join(' ') : `@${entry.entryType}`;

  const filterTokens = [entry.key, entry.title, entry.author, entry.year].filter(Boolean);
  item.filterText = filterTokens.join(' ');

  const docLines: string[] = [];
  if (entry.title) {
    docLines.push(`**${entry.title}**`);
  }
  if (entry.author) {
    docLines.push(`- **Author:** ${entry.author}`);
  }
  if (entry.year) {
    docLines.push(`- **Year:** ${entry.year}`);
  }
  if (entry.venue) {
    docLines.push(`- **Venue:** ${entry.venue}`);
  }
  const sourceInfo = entry.sourceFile
    ? `\`@${entry.entryType}\` (${entry.sourceFile})`
    : `\`@${entry.entryType}\``;
  docLines.push(`- **Type:** ${sourceInfo}`);

  item.documentation = new vscode.MarkdownString(docLines.join('\n'));
  return item;
}

export function createLatexPackageCompletionItem(
  pkg: LatexPackageEntry,
  replacementRange: vscode.Range
): vscode.CompletionItem {
  const kind = pkg.isLocal ? vscode.CompletionItemKind.File : vscode.CompletionItemKind.Module;
  const item = new vscode.CompletionItem(pkg.name, kind);
  item.insertText = pkg.name;
  item.range = replacementRange;
  item.detail = pkg.detail;
  item.sortText = `${pkg.isLocal ? '0' : '1'}_${pkg.name}`;

  const docLines = [`**Package:** \`${pkg.name}\``, `- ${pkg.detail}`];
  if (pkg.sourceFile) {
    docLines.push(`- **Source:** \`${pkg.sourceFile}\``);
  }
  item.documentation = new vscode.MarkdownString(docLines.join('\n'));
  return item;
}

export function createLatexRefCompletionItem(
  entry: LatexLabelEntry,
  replacementRange: vscode.Range
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(entry.key, vscode.CompletionItemKind.Reference);
  item.insertText = entry.key;
  item.range = replacementRange;

  const locationStr = entry.sourceFile ? `${entry.sourceFile}:${entry.line}` : `line ${entry.line}`;
  item.detail = entry.context ? `${entry.context} (${locationStr})` : locationStr;

  const filterTokens = [entry.key, entry.context, entry.sourceFile].filter(Boolean);
  item.filterText = filterTokens.join(' ');

  const docLines: string[] = [`**Label:** \`${entry.key}\``];
  if (entry.context) {
    docLines.push(`- **Context:** ${entry.context}`);
  }
  if (entry.sourceFile) {
    docLines.push(`- **Source:** \`${entry.sourceFile}\` (line ${entry.line})`);
  } else {
    docLines.push(`- **Line:** ${entry.line}`);
  }
  item.documentation = new vscode.MarkdownString(docLines.join('\n'));
  return item;
}

export class LatexCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const config = vscode.workspace.getConfiguration('paperflow.latex');
    const enabled = config.get<boolean>('enableCompletion', true);
    if (!enabled) {
      return undefined;
    }

    // Fast path: check current line prefix before scanning full document text
    const lineText = document.lineAt(position.line).text;
    const linePrefix = lineText.slice(0, position.character);

    // 1. Check if cursor is inside a citation command like \cite{...}
    const citationContext = extractCitationContext(linePrefix);
    if (citationContext) {
      const documentDir =
        document.uri.scheme === 'file' ? path.dirname(document.uri.fsPath) : undefined;
      const workspaceDirs = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
      const entries = loadBibtexEntriesForDocument(document.getText(), documentDir, workspaceDirs);

      const existingSet = new Set(citationContext.existingKeys);
      const replacementRange = new vscode.Range(
        position.line,
        citationContext.startCharacter,
        position.line,
        position.character
      );

      return entries
        .filter((entry) => !existingSet.has(entry.key))
        .map((entry) => createBibtexCompletionItem(entry, replacementRange));
    }

    // 2. Check if cursor is inside \usepackage{...} or \RequirePackage{...}
    const usepackageContext = extractUsepackageContext(linePrefix);
    if (usepackageContext) {
      const documentDir =
        document.uri.scheme === 'file' ? path.dirname(document.uri.fsPath) : undefined;
      const workspaceDirs = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
      const includeBuiltin = config.get<boolean>('includeBuiltinCommands', true);
      const packages = resolveLatexPackages(documentDir, workspaceDirs, includeBuiltin);

      const existingSet = new Set(usepackageContext.existingPackages);
      const replacementRange = new vscode.Range(
        position.line,
        usepackageContext.startCharacter,
        position.line,
        position.character
      );

      return packages
        .filter((pkg) => !existingSet.has(pkg.name))
        .map((pkg) => createLatexPackageCompletionItem(pkg, replacementRange));
    }

    // 3. Check if cursor is inside a cross-reference command like \ref{...}, \eqref{...}, \cref{...}
    const refContext = extractRefContext(linePrefix);
    if (refContext) {
      const currentFilePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
      const documentDir = currentFilePath ? path.dirname(currentFilePath) : undefined;
      const workspaceDirs = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
      const labels = loadLabelsForDocument(
        document.getText(),
        documentDir,
        workspaceDirs,
        currentFilePath
      );

      const existingSet = new Set(refContext.existingKeys);
      const replacementRange = new vscode.Range(
        position.line,
        refContext.startCharacter,
        position.line,
        position.character
      );

      return labels
        .filter((entry) => !existingSet.has(entry.key))
        .map((entry) => createLatexRefCompletionItem(entry, replacementRange));
    }

    // 4. Otherwise check if cursor is typing a LaTeX backslash command
    const commandPrefix = extractCommandPrefix(linePrefix);
    if (!commandPrefix) {
      return undefined;
    }

    const isMarkdown = document.languageId === 'markdown';
    const fullText = document.getText();

    // For Markdown documents, only provide completions inside math contexts ($...$ or $$...$$)
    if (isMarkdown) {
      const offset = document.offsetAt(position);
      if (!isInsideMathContext(fullText, offset)) {
        return undefined;
      }
    }

    const includeBuiltin = config.get<boolean>('includeBuiltinCommands', true);
    const customCommands = config.get<Record<string, string>>('customCommands', {});
    const enableFileCommands = config.get<boolean>('loadCommandsFromFiles', true);

    let texliveCommands: LatexCommandDefinition[] = [];
    let fileCommands: LatexCommandDefinition[] = [];

    if (enableFileCommands) {
      const documentDir =
        document.uri.scheme === 'file' ? path.dirname(document.uri.fsPath) : undefined;
      const workspaceDirs = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

      const configuredTexlivePackages = config.get<string[]>('texliveFiles', []);
      const docPackages = extractDocumentTexlivePackages(fullText);
      const requestedPackages = [...configuredTexlivePackages, ...docPackages];

      if (requestedPackages.length > 0) {
        const configuredTexliveRoot = config.get<string>('texliveRoot', '');
        const texliveRoot = detectTexliveRoot(configuredTexliveRoot);
        if (texliveRoot) {
          const texliveFilePaths = resolveTexlivePackageFiles(requestedPackages, texliveRoot);
          texliveCommands = loadCommandsFromFiles(texliveFilePaths);
        }
      }

      const configuredCommandFiles = config.get<string[]>('commandFiles', []);
      const currentFilePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
      const localFilePaths = resolveCommandFilePaths(
        fullText,
        documentDir,
        workspaceDirs,
        configuredCommandFiles,
        currentFilePath
      );
      const loadedFromDisk = loadCommandsFromFiles(localFilePaths);
      const currentDocLabel =
        document.uri.scheme === 'file' ? path.basename(document.uri.fsPath) : 'document';
      const inDocumentCommands = parseLatexCommandDefinitions(fullText, currentDocLabel);

      const mergedFileMap = new Map<string, LatexCommandDefinition>();
      for (const cmd of loadedFromDisk) {
        mergedFileMap.set(cmd.command, cmd);
      }
      for (const cmd of inDocumentCommands) {
        mergedFileMap.set(cmd.command, cmd);
      }
      fileCommands = Array.from(mergedFileMap.values());
    }

    const definitions = resolveLatexCommands(includeBuiltin, customCommands, {
      isMarkdown,
      texliveCommands,
      fileCommands,
    });

    const replacementRange = new vscode.Range(
      position.line,
      commandPrefix.startCharacter,
      position.line,
      position.character
    );

    return definitions.map((def) => {
      const label = `\\${def.command}`;
      const isSnippet = def.snippet.includes('$');
      const kind = isSnippet
        ? vscode.CompletionItemKind.Snippet
        : vscode.CompletionItemKind.Function;

      const item = new vscode.CompletionItem(label, kind);
      item.insertText = new vscode.SnippetString(`\\${def.snippet}`);
      item.filterText = label;
      item.range = replacementRange;
      item.detail = def.detail;
      if (def.documentation) {
        item.documentation = new vscode.MarkdownString(def.documentation);
      }
      if (def.triggerSuggest) {
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest',
        };
      }
      return item;
    });
  }
}
