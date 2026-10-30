# Change Log

All notable changes to the "checklist-markdown" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
