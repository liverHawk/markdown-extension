import * as vscode from 'vscode';

export type LatexSectionLevel = 'section' | 'subsection' | 'subsubsection';

export interface LatexSectionNumberEntry {
  /** 0-based line number in the document */
  line: number;
  /** Section command level */
  level: LatexSectionLevel;
  /** Formatted hierarchical section number (e.g., "1", "1.1", "1.1.1") */
  numberText: string;
}

const LATEX_LANGUAGE_IDS = new Set(['latex', 'tex', 'doctex']);

/**
 * Strips LaTeX comments starting from the first unescaped `%` character on a line.
 */
export function stripLatexComment(line: string): string {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && line[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) {
        return line.slice(0, i);
      }
    }
  }
  return line;
}

/**
 * Extracts all numbered `\section`, `\subsection`, and `\subsubsection` commands
 * from a LaTeX document text and computes their hierarchical section numbers.
 *
 * - Ignores `%` comments.
 * - Ignores starred commands (`\section*`, `\subsection*`, `\subsubsection*`).
 * - Ignores escaped backslashes (`\\section`).
 */
export function computeLatexSectionNumbers(text: string): LatexSectionNumberEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: LatexSectionNumberEntry[] = [];

  let sectionCount = 0;
  let subsectionCount = 0;
  let subsubsectionCount = 0;

  const commandRegex = /\\(subsubsection|subsection|section)(?![a-zA-Z@*])\s*(?:\[[^\]]*\])?\s*\{/g;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const uncommented = stripLatexComment(lines[lineIndex]);
    if (!uncommented.includes('\\')) {
      continue;
    }

    commandRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    let lineEntry: LatexSectionNumberEntry | undefined;

    while ((match = commandRegex.exec(uncommented)) !== null) {
      // Check that the leading backslash is not escaped (e.g. `\\section`)
      let backslashCount = 0;
      let j = match.index - 1;
      while (j >= 0 && uncommented[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 1) {
        continue;
      }

      const level = match[1] as LatexSectionLevel;
      let numberText: string;

      if (level === 'section') {
        sectionCount++;
        subsectionCount = 0;
        subsubsectionCount = 0;
        numberText = `${sectionCount}`;
      } else if (level === 'subsection') {
        subsectionCount++;
        subsubsectionCount = 0;
        numberText = `${sectionCount}.${subsectionCount}`;
      } else {
        subsubsectionCount++;
        numberText = `${sectionCount}.${subsectionCount}.${subsubsectionCount}`;
      }

      lineEntry = {
        line: lineIndex,
        level,
        numberText,
      };
    }

    if (lineEntry) {
      entries.push(lineEntry);
    }
  }

  return entries;
}

/**
 * Manages inline end-of-line ghost text decorations showing section numbers
 * (`1`, `1.1`, `1.1.1`) on `\section`, `\subsection`, and `\subsubsection` lines.
 */
export class SectionNumberDecorator implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        margin: '0 0 0 1.2em',
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    this.disposables.push(
      this.decorationType,
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateEditor(editor);
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        for (const editor of editors) {
          this.updateEditor(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.uri.toString() === event.document.uri.toString()) {
            this.updateEditor(editor);
          }
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('paperflow.latex.showSectionNumbers')) {
          this.updateAllVisibleEditors();
        }
      })
    );

    this.updateAllVisibleEditors();
  }

  public updateAllVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  public updateEditor(editor: vscode.TextEditor): void {
    if (!LATEX_LANGUAGE_IDS.has(editor.document.languageId)) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const config = vscode.workspace.getConfiguration('paperflow.latex');
    const enabled = config.get<boolean>('showSectionNumbers', true);
    if (!enabled) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const entries = computeLatexSectionNumbers(editor.document.getText());
    const decorations: vscode.DecorationOptions[] = entries.map((entry) => {
      const lineText = editor.document.lineAt(entry.line).text;
      const endPos = new vscode.Position(entry.line, lineText.length);
      return {
        range: new vscode.Range(endPos, endPos),
        renderOptions: {
          after: {
            contentText: entry.numberText,
          },
        },
      };
    });

    editor.setDecorations(this.decorationType, decorations);
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
