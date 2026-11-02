# Checklist Markdown

MarkdownのTODOリスト（`- [ ]` / `- [x]`）をGitHubスタイルのリッチなプレビューで表示し、**チェックボックスをクリックすることで元のMarkdownファイルの内容を即座に更新できる** VS Code 拡張機能です。

---

## ✨ 主な機能 (Features)

1. **GitHubスタイルのインタラクティブプレビュー**
   - GitHub Markdown風のデザインでTodoリストやテキストを美しくレンダリングします。
   - ダークテーマ・ライトテーマの両方に自動適応します。

2. **チェックボックスと元のMarkdownの双方向同期**
   - プレビュー上のチェックボックスをクリックすると、元のMarkdownファイル上の該当行の `[ ]` と `[x]` が即座に書き換わります。
   - エディタ側でMarkdownを直接編集した場合も、リアルタイムにプレビューへ反映されます。
   - エディタのUndo / Redo（元に戻す / やり直す）履歴にも安全に記録されます。

3. **チェック変更時の自動保存 (Auto Save)**
   - プレビュー上でチェックボックスを切り替えた際、またはショートカットでトグルした際にMarkdownファイルを自動保存します（設定でオフにすることも可能）。

4. **画面チラつきのない高速ホットリロード (In-Place Hot Reload)**
   - エディタの編集内容をプレビュー全体のリロードなしにインプレースで更新します。スクロール位置が維持され、チラつきなくスムーズに作業できます。

5. **階層型スティッキー見出し (Hierarchical Sticky Headings)**
   - 縦に長いMarkdownファイルでも、スクロール時に見出しがレベル（階層）ごとに分かれて上部に固定表示されます（例: 大見出し「レベル2」の下に中見出し「レベル3」がスタック固定され、次のレベル3へ移動すると新しいレベル3に押し出されます）。現在どのカテゴリのタスクを操作しているかが迷子になりません。

6. **TODO進捗バーの表示**
   - ファイル内のタスク数と完了率（例: `3 of 5 tasks completed (60%)`）を上部に自動集計・プログレスバー表示します。

7. **クイックジャンプ**
   - プレビュー上のタスク行をダブルクリックすると、エディタの該当行へ即座にカーソルがジャンプします。

8. **エディタショートカットキー**
   - エディタ上でタスク行にカーソルを置き、`Alt + X` を押すだけでチェック状態（`[ ]` ↔ `[x]`）をトグルできます。

9. **LaTeX コマンド・パッケージ・BibTeX 引用タグの入力候補（オートコンプリート）**
   - LaTeXファイル（`.tex`）およびMarkdownファイルの数式内（`$...$` / `$$...$$`）で、`\` を入力すると頻出LaTeXコマンドの入力候補が表示されます。
   - スニペット形式（例: `\frac{num}{den}` や `\begin{aligned} ... \end{aligned}`）に対応しており、`Tab` キーで引数間をスムーズに移動できます。
   - `\usepackage{...}`（および `\RequirePackage{...}`）内で、ワークスペースのルートや開いている `.tex` ファイルと同じディレクトリにある `.sty` ファイル（`\ProvidesPackage` の説明文も自動取得）と、定番の標準パッケージ（`amsmath`, `graphicx`, `hyperref`, `tikz` 等）を候補として表示します。
   - ファイル内の `\bibliography{...}` や `\addbibresource{...}` で指定された `.bib` ファイルを自動解析し、`\cite{}` / `\citep{}` / `\citet{}` / `\parencite{}` / `\textcite{}` / `\autocite{}` 等の中で引用キー（および論文タイトル・著者名・発行年）を候補として表示します（`\cite{key1, key2}` のようなカンマ区切り複数指定にも対応）。
   - VS Code の `settings.json` から独自のカスタムLaTeXコマンドをキーバリュー形式で自由に追加・上書きできます。

---

## 🚀 使い方 (Usage)

1. `.md`（Markdown）ファイルを開きます。
2. エディタ右上の **チェックリストアイコン**（`Checklist Markdown: Open Interactive Preview`）をクリックします。
   - または、コマンドパレット（`F1` または `Ctrl+Shift+P` / `Cmd+Shift+P`）を開き、`Checklist Markdown: Open Interactive Preview` を実行します。
3. エディタの横にGitHubスタイルのプレビューが表示されます。
4. チェックボックスをクリックして、タスクの完了・未完了を切り替えます。元のMarkdownファイルが自動更新＆自動保存されます！

---

## ⚙️ 設定 (Settings)

VS Code の設定画面（`Cmd+,` または `Ctrl+,`）から本拡張機能の動作をカスタマイズできます。

| 設定項目                                         | デフォルト値 | 説明                                                                               |
| ------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------- |
| `checklistMarkdown.autoSave`                     | `true`       | チェックボックスの状態を変更した際に、Markdownファイルを自動保存するかどうか       |
| `checklistMarkdown.latex.enableCompletion`       | `true`       | LaTeXファイルおよびMarkdownの数式ブロック内でLaTeXコマンドの入力補完を有効にするか |
| `checklistMarkdown.latex.includeBuiltinCommands` | `true`       | 標準搭載の一般的なLaTeXコマンドを入力候補に含めるかどうか                          |
| `checklistMarkdown.latex.customCommands`         | `{}`         | ユーザー定義のカスタムLaTeXコマンド（`{ "コマンド名": "スニペット" }` 形式）       |

### カスタムLaTeXコマンドの設定例 (`settings.json`)

```json
{
  "checklistMarkdown.latex.customCommands": {
    "myvec": "\\mathbf{${1:v}}",
    "dudt": "\\frac{\\partial ${1:u}}{\\partial ${2:t}}"
  }
}
```

---

## ⌨️ ショートカット & コマンド

| コマンド                                          | キーバインド | 説明                                                 |
| ------------------------------------------------- | ------------ | ---------------------------------------------------- |
| `Checklist Markdown: Open Interactive Preview`    | -            | インタラクティブなチェックリストプレビューを横に開く |
| `Checklist Markdown: Toggle Task on Current Line` | `Alt + X`    | エディタの現在行のタスク状態をトグルする             |

---

## 🛠 開発とデバッグ

1. `F5` キーを押して、拡張機能開発用ホスト（Extension Development Host）を起動します。
2. 開いた新しいVS Codeウィンドウで、同梱の `sample.md` などのMarkdownファイルを開きます。
3. エディタ右上のチェックリストアイコンをクリックしてプレビューをお試しください。
