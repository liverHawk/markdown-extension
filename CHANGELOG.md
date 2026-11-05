# Change Log

All notable changes to the "paperflow" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.2.1] - 2026-11-05

### Added

- **LaTeX Section Number Inline Decorations**: Added subtle end-of-line section number annotations (`1`, `1.1`, `1.1.1`) on `\section`, `\subsection`, and `\subsubsection` lines in LaTeX documents (configurable via `paperflow.latex.showSectionNumbers`).
- **LaTeX Section Folding**: Added hierarchical code folding (`FoldingRangeProvider`) for `\section`, `\subsection`, and `\subsubsection` blocks in LaTeX documents.

## [0.2.0] - 2026-11-02

### Changed

- **Rebranded Extension to PaperFlow**: Renamed extension ID from `checklist-markdown` to `paperflow` and display name to `PaperFlow: LaTeX & Markdown Checklist` to reflect its integrated academic writing and task management workflow.
- **Updated Commands**: Renamed commands to `paperflow.openPreview` (`PaperFlow: Open Interactive Preview`) and `paperflow.toggleCurrentTask` (`PaperFlow: Toggle Task on Current Line`).
- **Updated Configuration Keys**: Changed configuration prefix from `checklistMarkdown.*` to `paperflow.*` (`paperflow.autoSave`, `paperflow.latex.enableCompletion`, `paperflow.latex.includeBuiltinCommands`, and `paperflow.latex.customCommands`).

## [0.1.2] - 2026-11-02

### Added

- **LaTeX Command Autocompletion**: Added snippet-based autocompletion for built-in and custom LaTeX commands in `.tex` files and Markdown math blocks (`$...$` / `$$...$$`).
- **LaTeX Package Autocompletion (`\usepackage`)**: Added completion for local `.sty` files (with automatic `\ProvidesPackage` description extraction) and built-in standard LaTeX packages inside `\usepackage{...}` and `\RequirePackage{...}`.
- **BibTeX Citation Key Autocompletion**: Added completion for citation keys (including paper title, author, and year metadata) from `.bib` files referenced via `\bibliography{...}` or `\addbibresource{...}` inside `\cite`, `\citep`, `\citet`, `\parencite`, `\textcite`, and `\autocite`.
- **LaTeX Completion Settings**: Added `checklistMarkdown.latex.enableCompletion`, `checklistMarkdown.latex.includeBuiltinCommands`, and `checklistMarkdown.latex.customCommands` configuration options.

## [0.1.1] - 2026-10-30

### Changed

- **Hierarchical Sticky Headings**: Improved sticky headings so `h1`, `h2`, and `h3` stack hierarchically with dynamic vertical offsets when scrolling.

## [0.1.0] - 2026-10-30

### Added

- **Sticky Headings**: Headings (`h1` - `h6`) in the preview now remain sticky at the top when scrolling, keeping section context visible in long documents.
- **Auto Save on Toggle**: Automatically saves the Markdown document whenever a checklist checkbox status is updated.
- **Seamless In-Place Hot Reload**: Editor edits now seamlessly update the preview in-place without full webview reloading, preserving scroll position and eliminating screen flickering.
- **Configuration Option**: Added `checklistMarkdown.autoSave` (default: `true`) to enable or disable automatic document saving on checkbox toggle.

## [0.0.2] - 2026-10-30

### Added

- Interactive checklist preview with GitHub-styled markdown rendering.
- Two-way synchronization between preview checkboxes and Markdown document.
- Real-time task progress bar and completion percentage indicator.
- Quick jump to editor line on task double-click.
- Keyboard shortcut (`Alt + X`) to toggle tasks directly from editor.
- Dark and light theme auto-adaptation.
