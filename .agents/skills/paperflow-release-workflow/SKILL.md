---
name: paperflow-release-workflow
description: >-
  End-to-end PR creation, self-review, release documentation preparation
  (SemVer classification, CHANGELOG.md, bilingual README.md), and release
  execution workflow for the PaperFlow VS Code extension. Use when the user
  asks to create a PR, review changes, prepare a release (vX.Y.Z), update
  CHANGELOG/README for a new version, or publish a release.
---

# PaperFlow PR, Review & Release Workflow

## Overview

Automates the end-to-end post-implementation workflow for the **PaperFlow** VS Code extension (`paperflow`):

1. Local formatting, linting, compilation, and test verification
2. Feature/fix branch creation, push, and GitHub Pull Request creation
3. Self-review of the PR diff, automated fix application, and CI verification
4. SemVer version bump classification (`major` / `minor` / `patch`) and synchronized updates to `CHANGELOG.md` and bilingual `README.md` (English & Japanese)
5. User approval gate before merging the PR and running `pnpm run release <level>`

## Dependencies

None (uses repository scripts in `package.json`, `scripts/release.sh`, and `gh` CLI).

## Quick Start

Trigger this skill with prompts such as:

- 「PRを作ってレビューして」
- 「v0.3.0のためのファイル変更（CHANGELOG / README）をお願いします」
- 「PR作成からリリース準備まで進めて」

## Workflow

### 1. Local Verification (`fmt`, `pretest`, `test`)

1. Run formatting, compilation, linting, and the VS Code extension test suite:
   ```bash
   pnpm run fmt && pnpm run pretest && pnpm test
   ```
2. **Error Handling**: If compilation (`tsc`), linting (`oxlint`), formatting (`oxfmt --check`), or any unit test fails, diagnose the root cause, fix the code or test automatically, and re-run until all checks pass. Only ask the user if an external dependency or ambiguous requirement blocks resolution.

### 2. Branch & Pull Request Creation

1. Check current branch and status with `git status` and `git branch`.
2. If currently on `main`, create and switch to a descriptive branch (`feat/<topic>` for new features, `fix/<topic>` for bug fixes).
3. Stage and commit the implementation changes using Conventional Commits (e.g., `feat(completion): ...`, `fix(editor): ...`), and push to `origin`:
   ```bash
   git push -u origin <branch-name>
   ```
4. Create a GitHub Pull Request against `main` using `gh pr create`:
   ```bash
   gh pr create --base main --head <branch-name> --title "<type>(<scope>): <summary>" --body "## Summary
   - ...

   ## Test Plan
   - \`pnpm run fmt:check\`
   - \`pnpm run lint\`
   - \`pnpm test\`"
   ```

### 3. Self-Review & CI Verification

1. Inspect the full PR diff (`git diff main...HEAD`) and check for:
   - Edge cases (e.g., escaping, nested syntax, comments, unsaved editor buffers vs. disk files)
   - Unnecessary filesystem or I/O calls on hot paths
   - Missing unit test coverage
2. Check GitHub Actions CI status:
   ```bash
   gh pr checks <pr-number>
   ```
3. Present a structured review report to the user. If actionable improvements or bugs are found (or requested by the user), apply the fixes, add tests, run `pnpm run fmt && pnpm test`, commit, and push to the PR branch.

### 4. SemVer Classification & Release Documentation (`CHANGELOG.md` & `README.md`)

1. Determine the appropriate SemVer level based on changes since the last tag:
   - **`major`**: Breaking changes to existing configuration keys, commands, or behavior.
   - **`minor`**: Backwards-compatible new features or new configuration properties in `package.json`.
   - **`patch`**: Backwards-compatible bug fixes, performance improvements, or internal refactoring.
2. Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format:
   - Insert `## [X.Y.Z] - YYYY-MM-DD` right below `## [Unreleased]`.
   - Categorize entries under `### Added`, `### Changed`, or `### Fixed`.
3. Update `README.md` in **both English (`## 🌐 English`) and Japanese (`## 🇯🇵 日本語`)** sections:
   - Add or update feature bullets under `### ✨ Features` and `### ✨ 主な機能 (Features)`.
   - If any settings were added or modified in `package.json`, update both the `### ⚙️ Settings` table and the `### ⚙️ 設定 (Settings)` table so every `paperflow.*` property is documented in both languages.
4. Run formatter verification after editing documentation:
   ```bash
   pnpm run fmt && pnpm run fmt:check
   ```
5. Commit and push documentation updates if preparing the release on the branch (`docs: update changelog and readme for vX.Y.Z release`).

### 5. Approval Gate & Release Execution (`scripts/release.sh`)

1. **Mandatory Approval Gate**: Always ask the user for confirmation before merging the PR and running the release script.
2. Once approved by the user:
   - Ensure the PR is merged into `main` (`gh pr merge <pr-number> --merge --delete-branch` or confirm manual merge) and checkout up-to-date `main` (`git checkout main && git pull origin main`).
   - Run the release script with the determined SemVer level:
     ```bash
     pnpm run release <patch|minor|major>
     ```
   - `scripts/release.sh` automatically runs `pretest`, bumps `package.json` version, creates the `chore: release vX.Y.Z` commit and `vX.Y.Z` tag, pushes to `origin`, builds the `.vsix` bundle, creates the GitHub Release, and publishes to VS Code Marketplace / Open VSX.

## Common Mistakes

1. **Manually bumping `version` in `package.json` before running `pnpm run release minor/patch/major`**:
   - Do **not** manually edit `"version"` in `package.json` during step 4. `scripts/release.sh` increments the version in `package.json` automatically; bumping it manually beforehand will cause `pnpm run release minor` to bump it twice (e.g. `0.2.1` -> `0.3.0` -> `0.4.0`).
2. **Updating only English or only Japanese in `README.md`**:
   - `README.md` is strictly bilingual. Every new feature bullet and every `paperflow.*` setting row must be added to both the English and Japanese sections.
3. **Forgetting to run `pnpm run fmt` after editing `CHANGELOG.md` or `README.md`**:
   - `oxfmt --check` runs during `pretest` (and inside `scripts/release.sh` and CI) across all files including Markdown tables. Always run `pnpm run fmt && pnpm run fmt:check` after editing `.md` files.
