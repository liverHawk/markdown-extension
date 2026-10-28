import * as vscode from 'vscode';
import { ChecklistPreviewPanel } from './preview/previewPanel.js';
import { toggleTaskStatus } from './editor/taskToggler.js';

export function activate(context: vscode.ExtensionContext) {
  // Command: Open Interactive Preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'checklist-markdown.openPreview',
    () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage(
          'Please open a Markdown file to view the checklist preview.'
        );
        return;
      }
      ChecklistPreviewPanel.createOrShow(context.extensionUri, activeEditor.document);
    }
  );

  // Command: Toggle task on current cursor line in editor
  const toggleCurrentTaskCommand = vscode.commands.registerCommand(
    'checklist-markdown.toggleCurrentTask',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
        return;
      }
      const line = activeEditor.selection.active.line;
      await toggleTaskStatus(activeEditor.document, line);
    }
  );

  // Auto-update preview when markdown document changes
  const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
    if (ChecklistPreviewPanel.currentPanel) {
      ChecklistPreviewPanel.currentPanel.onDocumentChanged(event.document);
    }
  });

  // Track active editor switch
  const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.languageId === 'markdown' && ChecklistPreviewPanel.currentPanel) {
      ChecklistPreviewPanel.currentPanel.changeDocument(editor.document);
    }
  });

  context.subscriptions.push(
    openPreviewCommand,
    toggleCurrentTaskCommand,
    onDidChangeTextDocument,
    onDidChangeActiveTextEditor
  );
}

export function deactivate() {
  if (ChecklistPreviewPanel.currentPanel) {
    ChecklistPreviewPanel.currentPanel.dispose();
  }
}
