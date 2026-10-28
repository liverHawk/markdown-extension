# Checklist Markdown 機能拡張計画 (Plan)

本ドキュメントは、Checklist Markdown 拡張機能に対する以下の機能追加計画、およびそれに伴うアーキテクチャ・ファイル構成のリファクタリング計画をまとめたものです。

1. **Markdown編集時のリスト自動補完機能**（Enter改行時に `- [ ] ` を自動補完・空行時は解除）
2. **PDFエクスポート機能**（チェックリストやMarkdown全体を印刷/PDF出力）

---

## 1. ディレクトリ構成の設計

機能拡充に伴い、関心事（ドメイン）ごとにディレクトリを分割するモジュール構成を採用します。

```text
checklist-markdown/
├── docs/
│   └── plan.md                      # 本設計計画書
├── src/
│   ├── extension.ts                 # エントリポイント (コマンド登録・ライフサイクル管理)
│   │
│   ├── editor/                      # エディタ操作・入力支援
│   │   ├── taskToggler.ts           # タスク状態切り替え (既存)
│   │   └── listContinuation.ts      # [計画] 改行(Enter)時のリスト/チェックボックス補完
│   │
│   ├── export/                      # エクスポート関連機能
│   │   ├── pdfExporter.ts           # [計画] PDF生成および保存処理
│   │   └── pdfTemplate.ts           # [計画] 印刷/PDF専用スタイルおよびレイアウトテンプレート
│   │
│   ├── parser/                      # Markdown解析・構文処理
│   │   └── markdownParser.ts        # markdown-it を用いた構文解析 (既存)
│   │
│   ├── preview/                     # インタラクティブプレビュー
│   │   ├── previewPanel.ts          # Webviewパネル管理 (既存)
│   │   └── styles.ts                # プレビュー表示用CSS (既存)
│   │
│   └── test/                        # テストスイート
│       ├── extension.test.ts
│       ├── editor/
│       │   └── taskToggler.test.ts
│       └── parser/
│           └── markdownParser.test.ts
├── package.json
└── tsconfig.json
```

---

## 2. 機能別設計と実装計画

### 2.1 リスト自動補完機能 (`src/editor/listContinuation.ts`)

#### 概要

Markdownエディタ上でチェックリスト行（`- [ ] ` や `* [x] `、`1. [ ] ` など）を入力中に `Enter` キーで改行した際、次の行へ自動的に同じインデント・リストマーカー・未完了チェックボックス `[- ] ` を補完します。

#### 詳細仕様

1. **補完条件**:
   - カーソルがチェックリスト行にある状態で `Enter` が押下されたとき。
   - リスト項目にテキストが存在する場合：
     - 現在のインデント幅と記号（例: ` - [ ]`）を引き継いで次の行に挿入。
     - チェック状態は常に未完了 `[ ]` として新規行を開始する。
2. **リスト解除条件**:
   - チェックリスト記号のみ（本文テキストが空）の状態で `Enter` が押下された場合：
     - リスト行を通常の空行に戻し、リスト継続を終了する。
3. **キーバインド連携 (`package.json`)**:
   ```jsonc
   {
     "key": "enter",
     "command": "checklist-markdown.onEnterKey",
     "when": "editorTextFocus && editorLangId == markdown && !suggestWidgetVisible",
   }
   ```

---

### 2.2 PDFエクスポート機能 (`src/export/pdfExporter.ts`, `pdfTemplate.ts`)

#### 概要

チェックリストおよびMarkdown文書をスタイル付きPDFファイルとして保存します。

#### 詳細仕様

1. **テンプレート生成 (`src/export/pdfTemplate.ts`)**:
   - `markdownParser.ts` でレンダリングしたHTMLに対し、印刷用CSS（`@media print`、A4サイズマージン、ページブレーク制御、チェックボックスのベクター描画スタイル等）を適用。
2. **エクスポート処理 (`src/export/pdfExporter.ts`)**:
   - ユーザーに保存先ファイルパスを選択させる（`vscode.window.showSaveDialog`）。
   - プログレス表示（`vscode.window.withProgress`）で進捗通知。
   - レンダリング方式の候補:
     - **Option A (Puppeteer/Chromium)**: `puppeteer-core` を用いてバックグラウンドでローカルブラウザを呼び出し、ヘッドレスでPDF生成。
     - **Option B (Webview Print)**: Webview内で `window.print()` をトリガーしてOS標準の印刷ダイアログを呼び出す方式。
3. **コマンド定義 (`package.json`)**:
   - コマンド名: `checklist-markdown.exportPdf`
   - エディタ右上メニュー（`editor/title`）およびコマンドパレットから実行可能にする。

---

## 3. 実装ロードマップ

- [x] **フェーズ 1: ディレクトリ構成のリファクタリング**
  - 現在の既存ファイルを `editor/`, `parser/`, `preview/` 配下に移動。
  - 各モジュールの import パスを更新し、コンパイル・テスト・Lint が正常に通ることを確認。
- [ ] **フェーズ 2: リスト自動補完機能の実装**
  - `src/editor/listContinuation.ts` の作成。
  - `package.json` に `checklist-markdown.onEnterKey` コマンドおよび `enter` キーバインド追加。
  - 単体テスト（`src/test/editor/listContinuation.test.ts`）の実装。
- [ ] **フェーズ 3: PDFエクスポート機能の実装**
  - `src/export/pdfTemplate.ts` および `src/export/pdfExporter.ts` の作成。
  - コマンド追加とメニューコントリビューションの更新。
