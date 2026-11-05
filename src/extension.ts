import * as vscode from 'vscode';
import { ChecklistPreviewPanel } from './preview/previewPanel.js';
import { toggleTaskStatus } from './editor/taskToggler.js';
import { SectionNumberDecorator } from './editor/sectionNumberDecorator.js';
import { LatexSectionFoldingProvider } from './editor/latexFoldingProvider.js';
import { LatexCompletionProvider } from './completion/latexCompletionProvider.js';

export function activate(context: vscode.ExtensionContext) {
  // Register LaTeX Section Number Decorator
  const sectionNumberDecorator = new SectionNumberDecorator();

  // Register LaTeX Section Folding Range Provider
  const latexFoldingProvider = vscode.languages.registerFoldingRangeProvider(
    [{ language: 'latex' }, { language: 'tex' }, { language: 'doctex' }],
    new LatexSectionFoldingProvider()
  );

  // Register LaTeX Completion Provider for LaTeX and Markdown files
  const latexCompletionProvider = vscode.languages.registerCompletionItemProvider(
    [{ language: 'latex' }, { language: 'tex' }, { language: 'doctex' }, { language: 'markdown' }],
    new LatexCompletionProvider(),
    '\\',
    '{',
    ',',
    ' '
  );

  // Command: Open Interactive Preview
  const openPreviewCommand = vscode.commands.registerCommand('paperflow.openPreview', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
      vscode.window.showInformationMessage(
        'Please open a Markdown file to view the checklist preview.'
      );
      return;
    }
    ChecklistPreviewPanel.createOrShow(context.extensionUri, activeEditor.document);
  });

  // Command: Toggle task on current cursor line in editor
  const toggleCurrentTaskCommand = vscode.commands.registerCommand(
    'paperflow.toggleCurrentTask',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
        return;
      }
      const line = activeEditor.selection.active.line;
      const success = await toggleTaskStatus(activeEditor.document, line);
      if (success) {
        const config = vscode.workspace.getConfiguration('paperflow');
        const autoSave = config.get<boolean>('autoSave', true);
        if (autoSave) {
          await activeEditor.document.save();
        }
      }
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
    sectionNumberDecorator,
    latexFoldingProvider,
    latexCompletionProvider,
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
