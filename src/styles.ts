/**
 * GitHub-flavored markdown stylesheet supporting VS Code dark, light, and high contrast themes.
 */
export function getStyles(): string {
  return `
:root {
  --gh-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --gh-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  
  --gh-bg: var(--vscode-editor-background, #ffffff);
  --gh-fg: var(--vscode-editor-foreground, #1f2328);
  --gh-border: var(--vscode-widget-border, #d0d7de);
  --gh-border-muted: var(--vscode-editorGroup-border, #d8dee4);
  --gh-muted-fg: var(--vscode-descriptionForeground, #656d76);
  --gh-link: var(--vscode-textLink-foreground, #0969da);
  --gh-link-hover: var(--vscode-textLink-activeForeground, #1a7f37);
  
  --gh-code-bg: var(--vscode-textCodeBlock-background, rgba(175, 184, 193, 0.2));
  --gh-blockquote-border: var(--vscode-textBlockQuote-border, #d0d7de);
  --gh-blockquote-fg: var(--vscode-descriptionForeground, #656d76);
  
  --gh-table-border: var(--vscode-panel-border, #d0d7de);
  --gh-table-zebra: var(--vscode-keybindingTable-rowsBackground, rgba(0, 0, 0, 0.02));
  
  --gh-checkbox-accent: var(--vscode-focusBorder, #0969da);
  --gh-checkbox-border: #8c959f;
  
  --gh-progress-bg: rgba(175, 184, 193, 0.2);
  --gh-progress-fill: #1f883d;
}

body.vscode-dark {
  --gh-fg: var(--vscode-editor-foreground, #e6edf3);
  --gh-border: var(--vscode-widget-border, #30363d);
  --gh-border-muted: var(--vscode-editorGroup-border, #21262d);
  --gh-muted-fg: var(--vscode-descriptionForeground, #848d97);
  --gh-link: var(--vscode-textLink-foreground, #2f81f7);
  --gh-code-bg: var(--vscode-textCodeBlock-background, rgba(110, 118, 129, 0.4));
  --gh-blockquote-border: var(--vscode-textBlockQuote-border, #30363d);
  --gh-blockquote-fg: var(--vscode-descriptionForeground, #848d97);
  --gh-table-border: var(--vscode-panel-border, #30363d);
  --gh-table-zebra: rgba(255, 255, 255, 0.03);
  --gh-checkbox-accent: var(--vscode-focusBorder, #2f81f7);
  --gh-checkbox-border: #6e7681;
  --gh-progress-bg: rgba(110, 118, 129, 0.3);
  --gh-progress-fill: #238636;
}

body {
  font-family: var(--gh-font-sans);
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  color: var(--gh-fg);
  background-color: var(--gh-bg);
  padding: 24px 32px 48px;
  margin: 0;
  box-sizing: border-box;
}

/* Header summary / Progress bar */
.checklist-header {
  margin-bottom: 24px;
  padding: 12px 16px;
  border: 1px solid var(--gh-border);
  border-radius: 6px;
  background-color: var(--gh-code-bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.2s ease;
}

.checklist-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--gh-muted-fg);
}

.checklist-progress-bar-container {
  width: 100%;
  height: 6px;
  background-color: var(--gh-progress-bg);
  border-radius: 3px;
  overflow: hidden;
}

.checklist-progress-bar-fill {
  height: 100%;
  background-color: var(--gh-progress-fill);
  border-radius: 3px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--gh-fg);
}

h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--gh-border-muted);
}

h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--gh-border-muted);
}

h3 { font-size: 1.25em; }
h4 { font-size: 1em; }
h5 { font-size: 0.875em; }
h6 { font-size: 0.85em; color: var(--gh-muted-fg); }

/* Paragraphs & Links */
p {
  margin-top: 0;
  margin-bottom: 16px;
}

a {
  color: var(--gh-link);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* Lists */
ul, ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

li {
  margin-top: 0.25em;
}

li > p {
  margin-bottom: 0.5em;
}

/* GitHub Task Lists */
ul.contains-task-list,
ol.contains-task-list {
  padding-left: 0;
  list-style-type: none;
}

.task-list-item {
  list-style-type: none;
  position: relative;
  padding-left: 24px;
  margin-top: 6px;
  margin-bottom: 6px;
  display: block;
}

.task-list-item > input.task-list-item-checkbox {
  position: absolute;
  left: 0;
  top: 3px;
  margin: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--gh-checkbox-accent);
  border-radius: 3px;
  transition: transform 0.1s ease;
}

.task-list-item > input.task-list-item-checkbox:hover {
  transform: scale(1.1);
}

.task-list-item > input.task-list-item-checkbox:focus-visible {
  outline: 2px solid var(--gh-checkbox-accent);
  outline-offset: 1px;
}

.task-list-item.task-list-item-checked {
  color: var(--gh-muted-fg);
}

.task-list-item.task-list-item-checked > .task-list-item-checkbox:checked + span {
  text-decoration: line-through;
}

/* Blockquotes */
blockquote {
  margin: 0 0 16px;
  padding: 0 1em;
  color: var(--gh-blockquote-fg);
  border-left: 0.25em solid var(--gh-blockquote-border);
}

/* Code */
code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  font-family: var(--gh-font-mono);
  background-color: var(--gh-code-bg);
  border-radius: 6px;
}

pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--gh-code-bg);
  border-radius: 6px;
  margin-bottom: 16px;
}

pre code {
  padding: 0;
  background-color: transparent;
  font-size: 100%;
}

/* Tables */
table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
  overflow: auto;
  display: block;
}

table th,
table td {
  padding: 6px 13px;
  border: 1px solid var(--gh-table-border);
}

table tr {
  background-color: var(--gh-bg);
  border-top: 1px solid var(--gh-border);
}

table tr:nth-child(2n) {
  background-color: var(--gh-table-zebra);
}

table th {
  font-weight: 600;
  background-color: var(--gh-code-bg);
}

/* Horizontal Rule */
hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--gh-border-muted);
  border: 0;
}
`;
}
