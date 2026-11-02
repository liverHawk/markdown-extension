import * as path from 'path';
import * as vscode from 'vscode';
import {
  BibtexEntry,
  extractCitationContext,
  loadBibtexEntriesForDocument,
} from './bibtexCitation.js';
import { BUILTIN_LATEX_COMMANDS, LatexCommandDefinition } from './builtinCommands.js';
import {
  extractUsepackageContext,
  LatexPackageEntry,
  resolveLatexPackages,
} from './latexPackageCompletion.js';
import { isInsideMathContext } from './mathContext.js';

export interface ResolveLatexCommandsOptions {
  isMarkdown?: boolean;
}

/**
 * Merges built-in LaTeX commands with user-defined custom commands from settings.
 * Custom commands override built-in commands with the same command name.
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

export class LatexCompletionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const config = vscode.workspace.getConfiguration('checklistMarkdown.latex');
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

    // 3. Otherwise check if cursor is typing a LaTeX backslash command
    const commandPrefix = extractCommandPrefix(linePrefix);
    if (!commandPrefix) {
      return undefined;
    }

    const isMarkdown = document.languageId === 'markdown';

    // For Markdown documents, only provide completions inside math contexts ($...$ or $$...$$)
    if (isMarkdown) {
      const fullText = document.getText();
      const offset = document.offsetAt(position);
      if (!isInsideMathContext(fullText, offset)) {
        return undefined;
      }
    }

    const includeBuiltin = config.get<boolean>('includeBuiltinCommands', true);
    const customCommands = config.get<Record<string, string>>('customCommands', {});
    const definitions = resolveLatexCommands(includeBuiltin, customCommands, { isMarkdown });

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
