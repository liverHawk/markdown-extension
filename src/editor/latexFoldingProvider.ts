import * as vscode from 'vscode';
import { hasEndDocument, LatexSectionLevel, stripLatexComment } from './sectionNumberDecorator.js';

export interface LatexFoldingSpan {
  /** 0-based start line number */
  start: number;
  /** 0-based end line number (inclusive) */
  end: number;
  /** Section level that originated this fold */
  level: LatexSectionLevel;
}

const LEVEL_RANK: Record<LatexSectionLevel, number> = {
  section: 1,
  subsection: 2,
  subsubsection: 3,
};

/**
 * Resolves the inclusive end line for a section fold, trimming trailing blank lines
 * so that blank separator lines before the next heading remain visible when folded.
 */
function resolveSectionEndLine(lines: string[], startLine: number, maxEndLine: number): number {
  let end = maxEndLine;
  while (end > startLine && lines[end].trim() === '') {
    end--;
  }
  return end > startLine ? end : maxEndLine;
}

/**
 * Computes hierarchical folding ranges for `\section`, `\subsection`, and `\subsubsection`
 * (including starred variants like `\section*`) in a LaTeX document.
 *
 * - A `\section` fold spans until the line before the next `\section` or `\end{document}`,
 *   encompassing any nested `\subsection` and `\subsubsection` blocks.
 * - A `\subsection` fold spans until the line before the next `\subsection`, `\section`,
 *   or `\end{document}`.
 * - A `\subsubsection` fold spans until the line before the next `\subsubsection`,
 *   `\subsection`, `\section`, or `\end{document}`.
 */
export function computeLatexSectionFoldingSpans(text: string): LatexFoldingSpan[] {
  const lines = text.split(/\r?\n/);
  const spans: LatexFoldingSpan[] = [];
  const openStack: Array<{ line: number; level: LatexSectionLevel; rank: number }> = [];

  const sectionRegex =
    /\\(subsubsection|subsection|section)(?![a-zA-Z@])\s*\*?\s*(?:\[[^\]]*\])?\s*\{/g;

  const closeSectionsAtOrBelow = (minRank: number, maxEndLine: number) => {
    while (openStack.length > 0 && openStack[openStack.length - 1].rank >= minRank) {
      const top = openStack.pop()!;
      const endLine = resolveSectionEndLine(lines, top.line, maxEndLine);
      if (endLine > top.line) {
        spans.push({
          start: top.line,
          end: endLine,
          level: top.level,
        });
      }
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const uncommented = stripLatexComment(lines[lineIndex]);
    if (!uncommented.includes('\\')) {
      continue;
    }

    if (hasEndDocument(uncommented)) {
      closeSectionsAtOrBelow(1, lineIndex - 1);
      break;
    }

    sectionRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    let matchedLevel: LatexSectionLevel | undefined;

    while ((match = sectionRegex.exec(uncommented)) !== null) {
      let backslashCount = 0;
      let j = match.index - 1;
      while (j >= 0 && uncommented[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 1) {
        continue;
      }
      matchedLevel = match[1] as LatexSectionLevel;
    }

    if (matchedLevel) {
      const rank = LEVEL_RANK[matchedLevel];
      closeSectionsAtOrBelow(rank, lineIndex - 1);
      openStack.push({
        line: lineIndex,
        level: matchedLevel,
        rank,
      });
    }
  }

  closeSectionsAtOrBelow(1, lines.length - 1);

  return spans.sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Provides code folding ranges for LaTeX sections (`\section`, `\subsection`, `\subsubsection`).
 */
export class LatexSectionFoldingProvider implements vscode.FoldingRangeProvider {
  public provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const spans = computeLatexSectionFoldingSpans(document.getText());
    return spans.map(
      (span) => new vscode.FoldingRange(span.start, span.end, vscode.FoldingRangeKind.Region)
    );
  }
}
