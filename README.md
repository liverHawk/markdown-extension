# PaperFlow: LaTeX & Markdown Checklist

[English](#english) | [日本語](#japanese)

---

<a id="english"></a>

## 🌐 English

**PaperFlow** is a VS Code extension designed for academic writing and research workflows, combining **LaTeX autocompletion (commands, packages, and BibTeX citations)** with an **interactive, two-way synchronized Markdown checklist preview**.

### ✨ Features

1. **LaTeX Command, Package & BibTeX Citation Autocompletion**
   - Triggered by typing `\` in LaTeX files (`.tex`) and inside Markdown math blocks (`$...$` / `$$...$$`).
   - Supports snippet-style completions (e.g., `\frac{num}{den}`, `\begin{aligned} ... \end{aligned}`) with smooth `Tab` navigation across placeholders.
   - **Package Completion (`\usepackage{...}` / `\RequirePackage{...}`)**: Suggests local `.sty` files in your workspace or current directory (automatically extracting `\ProvidesPackage` descriptions) alongside standard built-in LaTeX packages (`amsmath`, `graphicx`, `hyperref`, `tikz`, etc.).
   - **BibTeX Citation Completion (`\cite{...}` etc.)**: Automatically parses `.bib` files referenced via `\bibliography{...}` or `\addbibresource{...}` and suggests citation keys with paper title, author, and publication year inside `\cite{}`, `\citep{}`, `\citet{}`, `\parencite{}`, `\textcite{}`, and `\autocite{}` (including comma-separated multiple citations like `\cite{key1, key2}`).
   - **Section Number Inline Display & Hierarchical Folding**: Displays subtle section numbers (`1`, `1.1`, `1.1.1`) at the end of `\section`, `\subsection`, and `\subsubsection` lines (ignoring `%` comments and starred `\section*` headings) and lets you fold/unfold each section hierarchically from the editor gutter.
   - **Custom Commands**: Define your own custom LaTeX commands and snippets in VS Code `settings.json`.

2. **GitHub-Styled Interactive Checklist Preview**
   - Renders Markdown task lists (`- [ ]` / `- [x]`) and documents with a clean GitHub-inspired layout.
   - Automatically adapts to both dark and light VS Code themes.

3. **Two-Way Synchronization Between Preview and Markdown**
   - Clicking a checkbox in the preview immediately toggles `[ ]` and `[x]` on the corresponding line in the source Markdown file.
   - Editing the Markdown file in the editor updates the preview in real time.
   - Fully preserves VS Code's Undo / Redo history.

4. **Auto Save on Toggle**
   - Automatically saves the Markdown file when a checkbox is toggled in the preview or via keyboard shortcut (configurable in settings).

5. **Flicker-Free In-Place Hot Reload**
   - Updates the preview in-place without reloading the entire webview, preserving your scroll position.

6. **Hierarchical Sticky Headings**
   - Stacks headings (`h1`, `h2`, `h3`) hierarchically at the top of the preview while scrolling through long documents so you never lose track of the current section.

7. **Task Progress Bar**
   - Automatically calculates and displays task completion progress (e.g., `3 of 5 tasks completed (60%)`) at the top of the preview.

8. **Quick Jump to Editor**
   - Double-click any task item in the preview to jump directly to the corresponding line in the Markdown editor.

9. **Editor Keyboard Shortcut**
   - Press `Alt + X` while the cursor is on a task line in the editor to toggle its completion state (`[ ]` ↔ `[x]`).

### 🚀 Usage

1. **For Markdown Checklists**:
   - Open any `.md` (Markdown) file.
   - Click the **Checklist icon** (`PaperFlow: Open Interactive Preview`) in the top-right editor title bar, or run `PaperFlow: Open Interactive Preview` from the Command Palette (`F1` or `Ctrl+Shift+P` / `Cmd+Shift+P`).
   - Click checkboxes in the side-by-side preview to toggle tasks.
2. **For LaTeX & Math Completion**:
   - Open a `.tex` file or write inside a `$...$` / `$$...$$` math block in `.md`.
   - Type `\`, `\usepackage{`, or `\cite{` to trigger context-aware autocompletion.

### ⚙️ Settings

| Setting                                  | Default | Description                                                                         |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `paperflow.autoSave`                     | `true`  | Automatically save the Markdown document when a task checkbox status is changed.    |
| `paperflow.latex.enableCompletion`       | `true`  | Enable LaTeX command autocompletion in LaTeX files and Markdown math blocks.        |
| `paperflow.latex.includeBuiltinCommands` | `true`  | Include built-in common LaTeX commands in autocompletion.                           |
| `paperflow.latex.customCommands`         | `{}`    | User-defined custom LaTeX commands as `{ "command": "snippet" }` key-value pairs.   |
| `paperflow.latex.loadCommandsFromFiles`  | `true`  | Automatically scan local `.sty`/`.tex` files and TeX Live packages for macros.      |
| `paperflow.latex.commandFiles`           | `[]`    | Additional `.tex`/`.sty`/`.cls` files or directories to scan for commands.          |
| `paperflow.latex.texliveRoot`            | `""`    | TeX Live root directory (e.g. `/usr/local/texlive/2026` or `C:\texlive\2026`).      |
| `paperflow.latex.texliveFiles`           | `[]`    | TeX Live package names to always scan (e.g. `["amsmath", "physics"]`).              |
| `paperflow.latex.showSectionNumbers`     | `true`  | Display inline hierarchical section numbers (`1`, `1.1`, `1.1.1`) on section lines. |

#### Example: Custom LaTeX Commands (`settings.json`)

```json
{
  "paperflow.latex.customCommands": {
    "myvec": "\\mathbf{${1:v}}",
    "dudt": "\\frac{\\partial ${1:u}}{\\partial ${2:t}}"
  }
}
```

### ⌨️ Shortcuts & Commands

| Command                                  | Keybinding | Description                                                        |
| ---------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `PaperFlow: Open Interactive Preview`    | -          | Open the interactive checklist preview beside the active editor.   |
| `PaperFlow: Toggle Task on Current Line` | `Alt + X`  | Toggle the task checkbox on the current cursor line in the editor. |

---

<a id="japanese"></a>

## 🇯🇵 日本語

**PaperFlow** は、論文執筆・研究ワークフロー向けに、**LaTeX入力補完（コマンド・パッケージ・BibTeX引用）** と **MarkdownのTODOリスト（`- [ ]` / `- [x]`）の双方向インタラクティブプレビュー** を統合した VS Code 拡張機能です。

### ✨ 主な機能 (Features)

1. **LaTeX コマンド・パッケージ・BibTeX 引用タグの入力候補（オートコンプリート）**
   - LaTeXファイル（`.tex`）およびMarkdownファイルの数式内（`$...$` / `$$...$$`）で、`\` を入力すると頻出LaTeXコマンドの入力候補が表示されます。
   - スニペット形式（例: `\frac{num}{den}` や `\begin{aligned} ... \end{aligned}`）に対応しており、`Tab` キーで引数間をスムーズに移動できます。
   - **パッケージ補完（`\usepackage{...}` / `\RequirePackage{...}`）**: ワークスペースのルートや開いている `.tex` ファイルと同じディレクトリにある `.sty` ファイル（`\ProvidesPackage` の説明文も自動取得）と、定番の標準パッケージ（`amsmath`, `graphicx`, `hyperref`, `tikz` 等）を候補として表示します。
   - **BibTeX 引用補完（`\cite{...}` 等）**: ファイル内の `\bibliography{...}` や `\addbibresource{...}` で指定された `.bib` ファイルを自動解析し、`\cite{}` / `\citep{}` / `\citet{}` / `\parencite{}` / `\textcite{}` / `\autocite{}` 等の中で引用キー（および論文タイトル・著者名・発行年）を候補として表示します（`\cite{key1, key2}` のようなカンマ区切り複数指定にも対応）。
   - **セクション番号のインライン表示 & 階層折りたたみ（Folding）**: `\section`, `\subsection`, `\subsubsection` の行末に薄い文字で階層番号（`1`, `1.1`, `1.1.1` など）を自動表示し（`%` コメント行や `\section*` 等は除外）、エディタ左端の折りたたみアイコンからセクション・サブセクション単位で開閉できます。
   - **カスタムコマンド**: VS Code の `settings.json` から独自のカスタムLaTeXコマンドをキーバリュー形式で自由に追加・上書きできます。

2. **GitHubスタイルのインタラクティブプレビュー**
   - GitHub Markdown風のデザインでTodoリストやテキストを美しくレンダリングします。
   - ダークテーマ・ライトテーマの両方に自動適応します。

3. **チェックボックスと元のMarkdownの双方向同期**
   - プレビュー上のチェックボックスをクリックすると、元のMarkdownファイル上の該当行の `[ ]` と `[x]` が即座に書き換わります。
   - エディタ側でMarkdownを直接編集した場合も、リアルタイムにプレビューへ反映されます。
   - エディタのUndo / Redo（元に戻す / やり直す）履歴にも安全に記録されます。

4. **チェック変更時の自動保存 (Auto Save)**
   - プレビュー上でチェックボックスを切り替えた際、またはショートカットでトグルした際にMarkdownファイルを自動保存します（設定でオフにすることも可能）。

5. **画面チラつきのない高速ホットリロード (In-Place Hot Reload)**
   - エディタの編集内容をプレビュー全体のリロードなしにインプレースで更新します。スクロール位置が維持され、チラつきなくスムーズに作業できます。

6. **階層型スティッキー見出し (Hierarchical Sticky Headings)**
   - 縦に長いMarkdownファイルでも、スクロール時に見出しがレベル（階層）ごとに分かれて上部に固定表示されます（例: 大見出し「レベル2」の下に中見出し「レベル3」がスタック固定され、次のレベル3へ移動すると新しいレベル3に押し出されます）。現在どのカテゴリのタスクを操作しているかが迷子になりません。

7. **TODO進捗バーの表示**
   - ファイル内のタスク数と完了率（例: `3 of 5 tasks completed (60%)`）を上部に自動集計・プログレスバー表示します。

8. **クイックジャンプ**
   - プレビュー上のタスク行をダブルクリックすると、エディタの該当行へ即座にカーソルがジャンプします。

9. **エディタショートカットキー**
   - エディタ上でタスク行にカーソルを置き、`Alt + X` を押すだけでチェック状態（`[ ]` ↔ `[x]`）をトグルできます。

### 🚀 使い方 (Usage)

1. **Markdown チェックリストプレビュー**:
   - `.md`（Markdown）ファイルを開きます。
   - エディタ右上の **チェックリストアイコン**（`PaperFlow: Open Interactive Preview`）をクリックするか、コマンドパレット（`F1` または `Ctrl+Shift+P` / `Cmd+Shift+P`）から `PaperFlow: Open Interactive Preview` を実行します。
   - プレビュー上のチェックボックスをクリックすると、元のMarkdownファイルが自動更新＆自動保存されます。
2. **LaTeX 入力補完**:
   - `.tex` ファイル、または `.md` ファイルの数式ブロック（`$...$` / `$$...$$`）内で `\` や `\usepackage{`、`\cite{` を入力すると、文脈に応じた入力候補が表示されます。

### ⚙️ 設定 (Settings)

VS Code の設定画面（`Cmd+,` または `Ctrl+,`）から本拡張機能の動作をカスタマイズできます。

| 設定項目                                 | デフォルト値 | 説明                                                                                |
| ---------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `paperflow.autoSave`                     | `true`       | チェックボックスの状態を変更した際に、Markdownファイルを自動保存するかどうか        |
| `paperflow.latex.enableCompletion`       | `true`       | LaTeXファイルおよびMarkdownの数式ブロック内でLaTeXコマンドの入力補完を有効にするか  |
| `paperflow.latex.includeBuiltinCommands` | `true`       | 標準搭載の一般的なLaTeXコマンドを入力候補に含めるかどうか                           |
| `paperflow.latex.customCommands`         | `{}`         | ユーザー定義のカスタムLaTeXコマンド（`{ "コマンド名": "スニペット" }` 形式）        |
| `paperflow.latex.loadCommandsFromFiles`  | `true`       | ローカルの `.sty`/`.tex` および TeX Live パッケージから `\newcommand` 等を自動読込  |
| `paperflow.latex.commandFiles`           | `[]`         | 追加でコマンド定義を読み込む `.tex`/`.sty`/`.cls` ファイルまたはディレクトリの配列  |
| `paperflow.latex.texliveRoot`            | `""`         | TeX Live のルート（例: `/usr/local/texlive/2026`, `C:\texlive\2026`）。空で自動検出 |
| `paperflow.latex.texliveFiles`           | `[]`         | TeX Live から常時読み込むパッケージ名の配列（例: `["amsmath", "physics"]`）         |
| `paperflow.latex.showSectionNumbers`     | `true`       | LaTeXの `\section` / `\subsection` / `\subsubsection` 行末に階層番号を表示するか    |

#### カスタムLaTeXコマンドの設定例 (`settings.json`)

```json
{
  "paperflow.latex.customCommands": {
    "myvec": "\\mathbf{${1:v}}",
    "dudt": "\\frac{\\partial ${1:u}}{\\partial ${2:t}}"
  }
}
```

### ⌨️ ショートカット & コマンド

| コマンド                                 | キーバインド | 説明                                                 |
| ---------------------------------------- | ------------ | ---------------------------------------------------- |
| `PaperFlow: Open Interactive Preview`    | -            | インタラクティブなチェックリストプレビューを横に開く |
| `PaperFlow: Toggle Task on Current Line` | `Alt + X`    | エディタの現在行のタスク状態をトグルする             |

---

## 🛠 Development & Debugging / 開発とデバッグ

1. Press `F5` to launch the Extension Development Host window. / `F5` キーを押して、拡張機能開発用ホスト（Extension Development Host）を起動します。
2. Open a `.md` or `.tex` file (such as `sample.md`) to test the preview and LaTeX autocompletion. / 開いたウィンドウで `sample.md` などの `.md` ファイルや `.tex` ファイルを開き、プレビューやLaTeX補完をお試しください。
