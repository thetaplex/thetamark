# 1. Electron with a split editor/preview

Date: 2026-11-19

## Status

Accepted

## Context

thetamark must run on macOS, Linux and Windows and export the rendered preview to PDF. Candidates were Electron, Tauri, and native per-OS apps; editing models were split view or inline (Typora-style) rendering.

## Decision

Use Electron with a TypeScript renderer, CodeMirror 6 for editing and a unified/remark pipeline for rendering, in a split editor/preview layout with in-app tabs. PDF export uses `webContents.printToPDF` with a print stylesheet that shows only the preview.

## Consequences

- PDF output is identical and dialog-free on all three OSes.
- The app is large (~100 MB) and uses more memory than a native or Tauri app.
- Every Markdown flavor works in the preview without custom editing behaviour; inline editing remains possible later on the same file format.
- Electron has no cross-platform native tabs, so the tab bar is our own.
