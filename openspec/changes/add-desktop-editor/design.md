# Design

The full approved design is `docs/superpowers/specs/2026-11-19-thetamark-design.md`; the implementation plan is `docs/superpowers/plans/2026-11-19-thetamark-v1.md`. Key decisions are summarised here.

## Context

Greenfield. Must run on macOS, Linux and Windows; PDF export is a core requirement.

## Goals / Non-Goals

**Goals:** see proposal. **Non-Goals:** inline/WYSIWYG editing, DOCX/HTML export (DOCX next), signing, auto-update, sync, plugins.

## Decisions

- **Electron over Tauri/native** — `webContents.printToPDF` gives dialog-free, identical PDF on all OSes; Tauri's system webviews don't; native means three codebases.
- **Split view over inline rendering** — supports every flavor for free; inline is several times the work and risks file damage.
- **In-app tab bar** — Electron has no cross-platform native tabs (macOS `tabbingIdentifier` only).
- **PDF via print stylesheet on the main window** — preview already rendered (fonts, images, Mermaid SVG), no hidden window.
- **mtime checks at save / export / focus instead of `fs.watch`** — `fs.watch` is unreliable across OSes.
- **Sanitise rendered HTML** (GitHub schema) and a sandboxed renderer with CSP.

## Risks / Trade-offs

- [App size ~100 MB] → accepted for PDF reliability.
- [Unsigned builds trigger OS warnings] → signing is a later change.
- [mtime granularity on some filesystems] → equality compare on milliseconds; worst case an extra prompt.
