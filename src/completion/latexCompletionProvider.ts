import * as vscode from 'vscode';
import { BUILTIN_LATEX_COMMANDS, LatexCommandDefinition } from './builtinCommands.js';
import { isInsideMathContext } from './mathContext.js';

/**
 * Merges built-in LaTeX commands with user-defined custom commands from settings.
 * Custom commands override built-in commands with the same command name.
 */
export function resolveLatexCommands(
  includeBuiltin: boolean,
  customCommands: Record<string, string> | undefined
): LatexCommandDefinition[] {
  const commandMap = new Map<string, LatexCommandDefinition>();

  if (includeBuiltin) {
    for (const cmd of BUILTIN_LATEX_COMMANDS) {
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
 * Returns undefined if the cursor is not currently typing a backslash command.
 */
export function extractCommandPrefix(
  linePrefix: string
): { prefix: string; startCharacter: number } | undefined {
  const match = /\\([a-zA-Z0-9{[(|]*)$/.exec(linePrefix);
  if (!match) {
    return undefined;
  }
  return {
    prefix: match[0],
    startCharacter: match.index,
  };
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

    // For Markdown documents, only provide completions inside math contexts ($...$ or $$...$$)
    if (document.languageId === 'markdown') {
      const fullText = document.getText();
      const offset = document.offsetAt(position);
      if (!isInsideMathContext(fullText, offset)) {
        return undefined;
      }
    }

    const lineText = document.lineAt(position.line).text;
    const linePrefix = lineText.slice(0, position.character);
    const commandPrefix = extractCommandPrefix(linePrefix);
    if (!commandPrefix) {
      return undefined;
    }

    const includeBuiltin = config.get<boolean>('includeBuiltinCommands', true);
    const customCommands = config.get<Record<string, string>>('customCommands', {});
    const definitions = resolveLatexCommands(includeBuiltin, customCommands);

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
      return item;
    });
  }
}
