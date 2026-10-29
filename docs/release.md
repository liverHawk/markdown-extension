# リリース手順ガイド (Release Guide)

このプロジェクトでは、[`scripts/release.sh`](../scripts/release.sh) を使って、ローカル環境から一発でバージョン更新・ビルド・タグ付け・各プラットフォーム（GitHub Releases / VS Code Marketplace / Open VSX）への公開を行えるよう自動化されています。

---

## 🚀 基本的な使い方

プロジェクトのルートディレクトリで以下のコマンドを実行します。

```bash
# パッチリリース (例: 0.0.1 -> 0.0.2 / バグ修正など)
pnpm run release patch

# マイナーリリース (例: 0.0.1 -> 0.1.0 / 新機能追加など)
pnpm run release minor

# メジャーリリース (例: 0.0.1 -> 1.0.0 / 破壊的変更など)
pnpm run release major

# バージョンを上げずに現行バージョンのまま再リリース・初回リリース
pnpm run release current

# 特定のバージョン番号を直接指定してリリース
pnpm run release 0.2.0
```

---

## ⚙️ スクリプトが自動実行する内容

`pnpm run release <引数>` を叩くと、以下のステップが順に自動実行されます。

1. **事前検証 (`pretest`)**:
   - `tsc` によるコンパイルチェック
   - `oxlint` によるリント検証
   - `oxfmt --check` によるコード整形検証
2. **バージョンの更新 & タグ作成**:
   - `package.json` のバージョン番号を自動更新
   - Git コミット (`chore: release vX.Y.Z`) と Git タグ (`vX.Y.Z`) を自動生成
   - _(※ `current` 指定時はバージョン繰り上げをスキップ)_
3. **リモートへ Push**:
   - `git push origin HEAD`
   - `git push origin vX.Y.Z`
4. **VSIX パッケージのビルド**:
   - `rolldown` で `markdown-it` を内包した `out/extension.js` を高速バンドル
   - `vsce package` で `checklist-markdown-X.Y.Z.vsix` を生成
5. **GitHub Releases への公開**:
   - `gh release create` でタグ付きリリースを作成し、生成された `.vsix` を自動添付
   - 直近のコミットログからリリースノートを自動生成
6. **各マーケットプレイスへの公開**:
   - **VS Code Marketplace**: `vsce publish`
   - **Open VSX Registry**: `ovsx publish`

---

## 🔑 事前準備（初回のみ必要な認証設定）

スクリプトを実行する前に、各サービスのログインまたはトークン設定を行ってください。

### 1. GitHub CLI (`gh`)

すでにログイン済みであれば追加設定は不要です。確認コマンド:

```bash
gh auth status
```

### 2. VS Code Marketplace

[Azure DevOps](https://dev.azure.com/) で発行した Personal Access Token (PAT) を使ってログインします。

```bash
pnpm exec vsce login purple-hawk
```

または環境変数に設定:

```bash
export VSCE_PAT="your-pat-token"
```

### 3. Open VSX Registry

[open-vsx.org](https://open-vsx.org/) (Settings > Access Tokens) で発行したトークンでログインします。

```bash
pnpm exec ovsx login purple-hawk
```

または環境変数に設定:

```bash
export OVSX_PAT="your-access-token"
```

---

## ❓ トラブルシューティング

### Q. 「Working tree has uncommitted changes」と怒られる

未コミットの変更があるとリリーススクリプトは中断されます。
変更をコミット（または `git stash`）してから再実行してください。

### Q. マーケットプレイスのログイン情報がない場合はどうなる？

スクリプトは警告を出してマーケットプレイスへの公開のみをスキップし、GitHub Releases の作成と Git タグのプッシュまでは安全に完了します。
後からトークンを取得して個別に公開することも可能です:

```bash
# VS Code Marketplace のみ公開
pnpm exec vsce publish --packagePath checklist-markdown-X.Y.Z.vsix

# Open VSX のみ公開
pnpm exec ovsx publish checklist-markdown-X.Y.Z.vsix
```
