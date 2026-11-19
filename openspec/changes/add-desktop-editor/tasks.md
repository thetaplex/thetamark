# Tasks

Detailed steps: `docs/superpowers/plans/2026-11-19-thetamark-v1.md`.

## 1. Scaffold and tooling

- [ ] 1.1 Electron Forge Vite+TS app with Biome, Vitest, justfile, docs scaffolding, CI matrix — verify: `just check` passes and `just run` opens a window

## 2. File I/O

- [ ] 2.1 Read/write with EOL preservation and mtime conflict detection — verify: `tests/files.test.ts` passes

## 3. Rendering

- [ ] 3.1 Flavor-aware sanitised render pipeline with highlighting, math, front matter, relative images — verify: `tests/render.test.ts` passes

## 4. Tabs

- [ ] 4.1 Tab open/reuse/focus/close model — verify: `tests/tabs.test.ts` passes

## 5. App wiring

- [ ] 5.1 Main process (window, menus, dialogs, recent files, protocol, PDF, navigation guards), preload bridge, renderer UI (tabs, toolbar, panes, CodeMirror, Mermaid, prompts) — verify: `just check` green and manual smoke via `just run`

## 6. End-to-end

- [ ] 6.1 Playwright Electron test: open → edit → save → export PDF, flavor switch, dirty-close prompt — verify: `just e2e` passes
