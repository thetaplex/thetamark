# thetamark v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cross-platform desktop Markdown editor: tabs, split editor/preview, flavor dropdown, open/save, external-change checks, PDF export.

**Architecture:** Electron Forge (Vite + TypeScript template). Main process owns files, dialogs, menus, PDF. Sandboxed renderer runs CodeMirror 6 and a unified/remark render pipeline; a minimal preload bridge connects them.

**Tech Stack:** Electron, Electron Forge, Vite, TypeScript strict, CodeMirror 6, unified/remark/rehype, KaTeX, Mermaid, Vitest, Playwright, Biome, pnpm, just.

**Spec:** `docs/superpowers/specs/2026-11-19-thetamark-design.md`

## Global Constraints

- TypeScript strict; pnpm (`node-linker=hoisted` for Forge); Biome; Vitest; Playwright.
- `justfile` recipes `setup test lint fmt check run` (+ `make`), `default: @just --list` first; README/CI call recipes.
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict CSP, file I/O only in main.
- Save writes exactly the editor text (EOL restored); never reformats.
- Flavors: `commonmark` | `gfm` (default) | `extended`. PDF page size `A4` (default) | `Letter`.
- No LICENSE file (deferred by author).

## Review Focus

1. CRLF file opened and saved → bytes identical apart from the edit (test in Task 2).
2. Markdown containing `<script>`, `javascript:` links, `onerror=` → stripped in preview (Task 3).
3. Quit/close tab with unsaved edits → always prompts (Task 5, e2e Task 6).
4. File changed on disk then Save → conflict prompt, no silent overwrite (Task 2 unit, Task 5 wiring).
5. Unknown fenced-code language / mermaid block → renders without throwing (Task 3).

## Builder calls (deviations from spec, recorded)

- PDF uses `printToPDF` on the main window with an `@media print` stylesheet that shows only the preview, not a hidden window: same output, fonts/images/Mermaid SVG already loaded, less code.
- Relative images load through a `thetamark-file:` protocol (works in dev's http origin and prod).
- Last-used flavor and page size stored in renderer `localStorage`.

---

### Task 1: Scaffold + tooling

**Files:** Forge vite-typescript template at repo root; `.npmrc`, `biome.json`, `vitest.config.ts`, `justfile`, `.gitignore`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/` (CI workflow, issue/PR templates).

- [ ] `pnpm create electron-app` (template `vite-typescript`) in scratch, move into repo; drop ESLint for Biome; `tsconfig` strict.
- [ ] `just check` (lint + typecheck + test) passes on the empty app; `just run` opens a window.
- [ ] CI matrix (macos/ubuntu/windows): `just setup`, `just check`, `just make`; upload `out/make/**`.
- [ ] Commit.

### Task 2: Main-process file I/O — `src/main/files.ts`

**Interfaces (produces):**
- `type Eol = '\n' | '\r\n'`
- `readDoc(path: string): Promise<{ text: string; eol: Eol; mtimeMs: number }>` — text returned with `\n` only.
- `writeDoc(path: string, text: string, eol: Eol, expectedMtimeMs: number | null): Promise<{ ok: true; mtimeMs: number } | { ok: false; conflict: true; mtimeMs: number }>` — `expectedMtimeMs` null = no check (Save As / Overwrite).
- `statMtime(path: string): Promise<number | null>` (null if missing).

- [ ] Tests `tests/files.test.ts`: CRLF round-trip byte-identical; LF kept; BOM-free UTF-8; write with stale mtime → `conflict`; with null → writes.
- [ ] Implement with `node:fs/promises`; pass; commit.

### Task 3: Render pipeline — `src/renderer/render.ts`

**Interfaces (produces):**
- `type Flavor = 'commonmark' | 'gfm' | 'extended'`
- `renderMarkdown(md: string, flavor: Flavor, baseDir: string | null): Promise<string>` → sanitized HTML.

Pipeline: remark-parse → [gfm: remark-gfm] / [extended: remark-gfm, remark-math, remark-frontmatter] → remark-rehype → rehype-sanitize (default schema + `math-inline`/`math-display` classes) → [extended: rehype-katex] → rehype-highlight → relative-img rewrite to `thetamark-file://<abs path>` → rehype-stringify.

- [ ] Tests `tests/render.test.ts`: commonmark leaves `| a |` table as paragraph and `~~x~~` literal; gfm renders `<table>`, task checkbox, `<del>`; extended renders `class="katex"`, keeps `language-mermaid`, hides front matter; gfm shows front matter as text; sanitizer strips `<script>`, `javascript:` href, `onerror`; unknown language doesn't throw; relative img rewritten, absolute/http untouched.
- [ ] Implement; pass; commit.

### Task 4: Tab model — `src/renderer/tabs.ts`

**Interfaces (produces):** `interface Tab<S> { id: number; path: string | null; eol: Eol; mtimeMs: number | null; savedText: string; state: S }`; `planOpen(tabs, activeId, path, isPristine: (t) => boolean): { kind: 'focus'|'reuse'|'new'; id?: number }`; `nextActiveAfterClose(tabs, closingId): number | null`; `title(tab): string` (basename or `Untitled`).

- [ ] Tests `tests/tabs.test.ts`: already-open path → focus; pristine untitled active → reuse; otherwise new; closing middle tab activates right neighbour, last → left, only → null.
- [ ] Implement; pass; commit.

### Task 5: App wiring — `src/main.ts`, `src/main/pdf.ts`, `src/main/menu.ts`, `src/preload.ts`, `src/shared/api.ts`, `src/renderer.ts`, `index.html`, `src/renderer/*.css`

**Interfaces:** `window.api` (`src/shared/api.ts`): `openDialog(): Promise<string[]>`, `read(path)`, `write(path, text, eol, expectedMtimeMs)`, `saveAsDialog(defaultName): Promise<string | null>`, `stat(path)`, `exportPdf(pageSize, defaultName): Promise<string | null>`, `ask(message, detail, buttons: string[]): Promise<number>`, `openExternal(url)`, `addRecent(path)`, `setTitle(t)`, `confirmClose()`, `on(channel: 'menu' | 'open-path' | 'close-request' | 'focus', cb)`.

- [ ] Main: single-instance lock; open paths from argv / `open-file` / `second-instance`; window close → `close-request` to renderer; `will-navigate`/`setWindowOpenHandler` deny; `openExternal` http/https/mailto only; `thetamark-file:` protocol serving local files; recent list in `userData/recent.json` (max 10) feeding File ▸ Open Recent.
- [ ] Menu ids: `new open save save-as export-pdf close-tab view-editor view-split view-preview`.
- [ ] Renderer: tab bar, toolbar (pane toggle, flavor select, page-size select, Export PDF), CodeMirror (markdown, foldGutter, history, search, line wrapping), 150 ms debounced render, Mermaid lazily rendered (`securityLevel: 'strict'`), link clicks routed to `openExternal`/in-preview anchors, dirty dot + window title, Save conflict prompt (Overwrite/Reload/Cancel), pre-PDF prompt (Reload first/Export current text/Cancel), focus reload (silent if clean, ask if dirty), close/quit prompts listing dirty tabs.
- [ ] Print CSS: only `#preview`, full width.
- [ ] `just check` green; manual `just run` smoke; commit.

### Task 6: E2E — `e2e/app.spec.ts`

- [ ] Playwright `_electron` launches the packaged build with a fixture path: edit → menu `save` (dialog patched in main) → file contains edit; `export-pdf` → file starts with `%PDF`; flavor switch to commonmark changes table rendering; dirty close-tab triggers `ask`.
- [ ] `just e2e` green; commit.
