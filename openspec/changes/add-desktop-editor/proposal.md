## Why

The author wants one desktop tool on macOS, Linux and Windows for their own notes and docs: open Markdown from disk, edit with a live preview in the common flavors, save safely, and export to PDF.

## What Changes

- New Electron desktop app with in-app tabs and a split editor/preview whose panes fold.
- Flavor dropdown: CommonMark, GFM (default), Extended (GFM + math, Mermaid, front matter).
- Open/Save/Save As via native dialogs, recent files, unsaved-change prompts, checks for changes made on disk by other programs.
- Export the rendered preview to PDF (A4 default, Letter).
- Installers for all three OSes built in CI.

## Capabilities

### New Capabilities
- `document-editing`: opening, editing, tabbing, saving files and guarding against data loss.
- `markdown-preview`: rendering Markdown per flavor, safely, alongside the editor.
- `pdf-export`: exporting the rendered preview to a PDF file.

### Modified Capabilities
None.

## Impact

New codebase (no existing code). Dependencies: Electron, Electron Forge, CodeMirror 6, unified/remark/rehype, KaTeX, Mermaid. DOCX export is the next change.
