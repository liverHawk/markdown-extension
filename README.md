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

3. **TODO進捗バーの表示**
   - ファイル内のタスク数と完了率（例: `3 of 5 tasks completed (60%)`）を上部に自動集計・プログレスバー表示します。

4. **クイックジャンプ**
   - プレビュー上のタスク行をダブルクリックすると、エディタの該当行へ即座にカーソルがジャンプします。

5. **エディタショートカットキー**
   - エディタ上でタスク行にカーソルを置き、`Alt + X` を押すだけでチェック状態（`[ ]` ↔ `[x]`）をトグルできます。

---

## 🚀 使い方 (Usage)

1. `.md`（Markdown）ファイルを開きます。
2. エディタ右上の **チェックリストアイコン**（`Checklist Markdown: Open Interactive Preview`）をクリックします。
   - または、コマンドパレット（`F1` または `Ctrl+Shift+P` / `Cmd+Shift+P`）を開き、`Checklist Markdown: Open Interactive Preview` を実行します。
3. エディタの横にGitHubスタイルのプレビューが表示されます。
4. チェックボックスをクリックして、タスクの完了・未完了を切り替えます。元のMarkdownファイルが自動更新されます！

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

---

## 📦 リリース手順 (Releasing)

ローカルからワンコマンドで、バージョン更新・テスト・VSIXビルド・GitHub Releases・各マーケットプレイス（VS Code Marketplace / Open VSX）への一括公開が可能です。

```bash
pnpm run release patch   # 0.0.1 -> 0.0.2 (バグ修正など)
pnpm run release minor   # 0.0.1 -> 0.1.0 (新機能追加など)
pnpm run release major   # 0.0.1 -> 1.0.0 (メジャーアップデート)
pnpm run release current # 現行バージョンのまま再リリース
```

詳しいオプションや初回認証設定については [docs/release.md](docs/release.md) をご覧ください。
