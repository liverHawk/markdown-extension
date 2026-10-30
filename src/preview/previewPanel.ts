import * as vscode from 'vscode';
import { renderMarkdown } from '../parser/markdownParser.js';
import { getStyles } from './styles.js';
import { toggleTaskStatus, TASK_REGEX } from '../editor/taskToggler.js';

export class ChecklistPreviewPanel {
  public static currentPanel: ChecklistPreviewPanel | undefined;
  public static readonly viewType = 'checklistMarkdownPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _document: vscode.TextDocument;
  private _disposables: vscode.Disposable[] = [];
  private _updateTimeout: NodeJS.Timeout | undefined;
  private _isInitialHtmlLoaded = false;

  public static createOrShow(extensionUri: vscode.Uri, document: vscode.TextDocument) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const targetColumn = column
      ? column === vscode.ViewColumn.One
        ? vscode.ViewColumn.Two
        : vscode.ViewColumn.Beside
      : vscode.ViewColumn.Beside;

    if (ChecklistPreviewPanel.currentPanel) {
      ChecklistPreviewPanel.currentPanel._panel.reveal(targetColumn, true);
      ChecklistPreviewPanel.currentPanel.changeDocument(document);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ChecklistPreviewPanel.viewType,
      `Preview ${getFileName(document.uri)}`,
      { viewColumn: targetColumn, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    ChecklistPreviewPanel.currentPanel = new ChecklistPreviewPanel(panel, extensionUri, document);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    document: vscode.TextDocument
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._document = document;

    // Set panel icon
    this._panel.iconPath = new vscode.ThemeIcon('checklist');

    // Initial render
    this._update();

    // Listen to panel visibility changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._scheduleUpdate();
        }
      },
      null,
      this._disposables
    );

    // Listen to panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from Webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'toggleTask': {
            const line =
              typeof message.line === 'number' ? message.line : parseInt(message.line, 10);
            const checked = Boolean(message.checked);
            const success = await toggleTaskStatus(this._document, line, checked);
            if (success) {
              const config = vscode.workspace.getConfiguration('checklistMarkdown');
              const autoSave = config.get<boolean>('autoSave', true);
              if (autoSave) {
                await this._document.save();
              }
            }
            break;
          }
          case 'revealLine': {
            const line =
              typeof message.line === 'number' ? message.line : parseInt(message.line, 10);
            const editor = vscode.window.visibleTextEditors.find(
              (e) => e.document.uri.toString() === this._document.uri.toString()
            );
            if (editor && line >= 0 && line < this._document.lineCount) {
              const range = this._document.lineAt(line).range;
              editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
              editor.selection = new vscode.Selection(range.start, range.end);
            }
            break;
          }
        }
      },
      null,
      this._disposables
    );
  }

  public changeDocument(document: vscode.TextDocument) {
    const isDifferentDocument = this._document.uri.toString() !== document.uri.toString();
    this._document = document;
    this._panel.title = `Preview ${getFileName(document.uri)}`;
    if (isDifferentDocument) {
      this._isInitialHtmlLoaded = false;
    }
    this._scheduleUpdate();
  }

  public getDocumentUri(): vscode.Uri {
    return this._document.uri;
  }

  public onDocumentChanged(document: vscode.TextDocument) {
    if (document.uri.toString() === this._document.uri.toString()) {
      this._scheduleUpdate();
    }
  }

  private _scheduleUpdate() {
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }
    this._updateTimeout = setTimeout(() => {
      this._update();
    }, 50);
  }

  private _update() {
    if (!this._panel.visible) {
      return;
    }

    if (!this._isInitialHtmlLoaded) {
      this._panel.webview.html = this._getHtmlForWebview();
      this._isInitialHtmlLoaded = true;
      return;
    }

    const rawMarkdown = this._document.getText();
    const renderedContent = renderMarkdown(rawMarkdown);
    const stats = this._calculateTaskStats();

    this._panel.webview.postMessage({
      command: 'updateContent',
      content: renderedContent,
      stats: stats,
    });
  }

  private _calculateTaskStats(): { total: number; completed: number; percentage: number } {
    let total = 0;
    let completed = 0;
    const lineCount = this._document.lineCount;

    for (let i = 0; i < lineCount; i++) {
      const lineText = this._document.lineAt(i).text;
      const match = TASK_REGEX.exec(lineText);
      if (match) {
        total++;
        if (match[2].toLowerCase() === 'x') {
          completed++;
        }
      }
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }

  private _getHtmlForWebview(): string {
    const rawMarkdown = this._document.getText();
    const renderedContent = renderMarkdown(rawMarkdown);
    const styles = getStyles();
    const stats = this._calculateTaskStats();

    // Generate progress header if tasks exist
    const headerHtml =
      stats.total > 0
        ? `
      <div class="checklist-header" role="region" aria-label="Todo list summary">
        <div class="checklist-header-info">
          <span>${stats.completed} of ${stats.total} tasks completed</span>
          <span>${stats.percentage}%</span>
        </div>
        <div class="checklist-progress-bar-container">
          <div class="checklist-progress-bar-fill" style="width: ${stats.percentage}%;"></div>
        </div>
      </div>
    `
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: vscode-resource:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Checklist Markdown Preview</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${headerHtml}
  <main id="markdown-body">
    ${renderedContent}
  </main>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();

      // Restore scroll position
      const previousState = vscode.getState();
      if (previousState && typeof previousState.scrollY === 'number') {
        window.scrollTo(0, previousState.scrollY);
      }

      window.addEventListener('scroll', () => {
        vscode.setState({ scrollY: window.scrollY });
      });

      // Handle interactive checkbox toggles
      document.addEventListener('change', (event) => {
        const target = event.target;
        if (target && target.matches('input.task-list-item-checkbox')) {
          const line = parseInt(target.getAttribute('data-line'), 10);
          const checked = target.checked;

          // Optimistically update styling on list item
          const listItem = target.closest('li');
          if (listItem) {
            if (checked) {
              listItem.classList.add('task-list-item-checked');
            } else {
              listItem.classList.remove('task-list-item-checked');
            }
          }

          vscode.postMessage({
            command: 'toggleTask',
            line: line,
            checked: checked
          });
        }
      });

      // Jump to markdown line on double clicking a task item
      document.addEventListener('dblclick', (event) => {
        const target = event.target;
        const taskItem = target.closest('li.task-list-item');
        if (taskItem) {
          const checkbox = taskItem.querySelector('input.task-list-item-checkbox');
          if (checkbox) {
            const line = parseInt(checkbox.getAttribute('data-line'), 10);
            vscode.postMessage({
              command: 'revealLine',
              line: line
            });
          }
        }
      });

      function updateProgress(stats) {
        if (!stats) return;
        let header = document.querySelector('.checklist-header');
        if (stats.total > 0) {
          if (!header) {
            header = document.createElement('div');
            header.className = 'checklist-header';
            header.setAttribute('role', 'region');
            header.setAttribute('aria-label', 'Todo list summary');
            header.innerHTML =
              '<div class="checklist-header-info">' +
                '<span></span>' +
                '<span></span>' +
              '</div>' +
              '<div class="checklist-progress-bar-container">' +
                '<div class="checklist-progress-bar-fill"></div>' +
              '</div>';
            const markdownBody = document.getElementById('markdown-body');
            document.body.insertBefore(header, markdownBody);
          } else {
            header.style.display = '';
          }

          const spans = header.querySelectorAll('.checklist-header-info span');
          if (spans.length >= 2) {
            spans[0].textContent = stats.completed + ' of ' + stats.total + ' tasks completed';
            spans[1].textContent = stats.percentage + '%';
          }
          const fill = header.querySelector('.checklist-progress-bar-fill');
          if (fill) {
            fill.style.width = stats.percentage + '%';
          }
        } else if (header) {
          header.style.display = 'none';
        }
      }

      // Handle hot reload content updates
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) return;

        if (message.command === 'updateContent') {
          const markdownBody = document.getElementById('markdown-body');
          if (markdownBody && typeof message.content === 'string') {
            markdownBody.innerHTML = message.content;
          }
          if (message.stats) {
            updateProgress(message.stats);
          }
        }
      });
    })();
  </script>
</body>
</html>`;
  }

  public dispose() {
    ChecklistPreviewPanel.currentPanel = undefined;

    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getFileName(uri: vscode.Uri): string {
  const parts = uri.path.split('/');
  return parts[parts.length - 1] || 'Markdown';
}
