#!/usr/bin/env bash
set -e

BUMP_TYPE="${1:-patch}"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "current" && ! "$BUMP_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  echo "❌ Error: Invalid bump type or version: '$BUMP_TYPE'"
  echo "Usage: pnpm run release [patch|minor|major|current|<version>]"
  exit 1
fi

# 1. 未コミット変更の事前チェック
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: Working tree has uncommitted changes. Please commit or stash them before releasing."
  exit 1
fi

# 2. テスト・コンパイルの事前チェック
echo "==> [1/6] Running checks & test..."
pnpm run pretest

# 3. バージョンの決定 (current の場合は繰り上げせず既存バージョンを使用)
if [[ "$BUMP_TYPE" == "current" ]]; then
  VERSION=$(node -p "require('./package.json').version")
  TAG="v$VERSION"
  echo "==> [2/6] Using current version: $VERSION ($TAG)"
  if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Creating git tag $TAG..."
    git tag -a "$TAG" -m "Release $TAG"
  fi
else
  echo "==> [2/6] Bumping version ($BUMP_TYPE)..."
  pnpm version "$BUMP_TYPE" -m "chore: release v%s"
  VERSION=$(node -p "require('./package.json').version")
  TAG="v$VERSION"
fi

VSIX="checklist-markdown-$VERSION.vsix"
echo "==> Target release: $TAG ($VSIX)"

# 4. リモートへコミットとタグを push
echo "==> [3/6] Pushing commit and tag to GitHub..."
git push origin HEAD
git push origin "$TAG"

# 5. vsix パッケージのビルド
echo "==> [4/6] Packaging vsix..."
pnpm exec vsce package --no-dependencies --out "$VSIX"

# 6. GitHub Releases に vsix を添付してリリース作成
echo "==> [5/6] Creating GitHub Release..."
if gh release view "$TAG" >/dev/null 2>&1; then
  echo "GitHub Release $TAG already exists, uploading $VSIX asset..."
  gh release upload "$TAG" "$VSIX" --clobber
else
  gh release create "$TAG" "$VSIX" --title "$TAG" --generate-notes
fi

# 7. 各マーケットプレイスに公開
echo "==> [6/6] Publishing to Marketplaces..."

echo "--> Publishing to VS Code Marketplace..."
if ! pnpm exec vsce publish --packagePath "$VSIX"; then
  echo "⚠️ Warning: VS Code Marketplace publish failed. (Have you run 'pnpm exec vsce login purple-hawk'?)"
fi

echo "--> Publishing to Open VSX..."
if ! pnpm exec ovsx publish "$VSIX"; then
  echo "⚠️ Warning: Open VSX publish failed. (Have you run 'pnpm exec ovsx login'?)"
fi

echo ""
echo "🎉 Release process for $TAG completed!"
