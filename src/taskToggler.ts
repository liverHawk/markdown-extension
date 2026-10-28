import * as vscode from 'vscode';

/**
 * Regular expression matching Markdown task list item:
 * Group 1: Indentation and bullet marker (e.g., "  - ", "  * ", "  1. ")
 * Group 2: Checkbox state (' ' or 'x' or 'X')
 * Group 3: Rest of the line content
 */
export const TASK_REGEX = /^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\](.*)$/;

/**
 * Toggles or sets the check status of a Markdown task at a specific line.
 * @param document The target TextDocument
 * @param lineIndex 0-based line number where the task item is located
 * @param forceChecked Optional boolean to explicitly set checked (true) or unchecked (false)
 * @returns boolean indicating whether the edit was successfully applied
 */
export async function toggleTaskStatus(
  document: vscode.TextDocument,
  lineIndex: number,
  forceChecked?: boolean
): Promise<boolean> {
  if (lineIndex < 0 || lineIndex >= document.lineCount) {
    return false;
  }

  // Find the exact line or nearest neighboring line if lines shifted
  let targetLine = lineIndex;
  let line = document.lineAt(targetLine);
  let match = TASK_REGEX.exec(line.text);

  if (!match) {
    // Search nearby lines in case user typed or deleted lines right before
    const searchOffsets = [-1, 1, -2, 2];
    for (const offset of searchOffsets) {
      const candidateIndex = lineIndex + offset;
      if (candidateIndex >= 0 && candidateIndex < document.lineCount) {
        const candidateLine = document.lineAt(candidateIndex);
        const candidateMatch = TASK_REGEX.exec(candidateLine.text);
        if (candidateMatch) {
          targetLine = candidateIndex;
          line = candidateLine;
          match = candidateMatch;
          break;
        }
      }
    }
  }

  if (!match) {
    return false;
  }

  const prefix = match[1];
  const currentState = match[2];
  const suffix = match[3];

  const isCurrentlyChecked = currentState.toLowerCase() === 'x';
  const newChecked = forceChecked !== undefined ? forceChecked : !isCurrentlyChecked;
  const newMarker = newChecked ? 'x' : ' ';

  const newText = `${prefix}[${newMarker}]${suffix}`;

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, line.range, newText);

  return await vscode.workspace.applyEdit(edit);
}
