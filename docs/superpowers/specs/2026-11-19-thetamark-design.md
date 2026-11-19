# thetamark — desktop Markdown editor: design

- Date: 2026-11-19 (ISO 8601)
- Status: Draft, awaiting approval

## Intent

A desktop app for the author's own notes and docs: open `.md` files from disk,
edit with a live side-by-side preview, save back, and export to PDF. Runs on
macOS, Linux and Windows.

## Goals

1. **Split view.** Raw Markdown editor on the left, rendered preview on the right,
   preview updates as you type.
2. **Foldable.** Either pane collapses: editor-only / split / preview-only
   (toolbar toggle + keyboard shortcut). The editor also folds sections by heading.
3. **Flavor dropdown** in the toolbar; preview re-renders on change:
   - **CommonMark** — strict CommonMark 0.31.
   - **GFM** — CommonMark + GitHub Flavored Markdown (tables, task lists,
     strikethrough, autolinks).
   - **Extended** — GFM + footnotes, math (`$…$`, `$$…$$`, KaTeX), Mermaid
     diagrams (```` ```mermaid ````), YAML front matter (hidden from preview).
   - All flavors: fenced code blocks with syntax highlighting.
4. **Files.** Open, Save, Save As via native dialogs; multiple files in tabs;
   detect changes made on disk by other programs; open a file passed on the
   command line / via "Open With"; recent files list; dirty indicator in the
   title; prompt on close/open with unsaved changes. Files read and written as
   UTF-8, line endings preserved.
5. **PDF export.** Exports the rendered preview (not the editor) to a PDF chosen
   via a save dialog. Page size A4 (ISO 216) by default, Letter selectable.
   No print dialog.
6. **Cross-platform installers** for macOS (`.dmg`), Windows (Squirrel `.exe`),
   Linux (`.deb` and `.AppImage` or `.zip`), built in CI on each OS.

## Non-goals (v1)

- Inline / WYSIWYG editing (Typora-style). Possible later; same file format.
- MultiMarkdown, Pandoc-specific syntax, wiki-links, a vault/folder sidebar.
- Export to anything other than PDF. **DOCX is the next change after v1**
  (mdast → `docx` library; math and Mermaid embedded as images).
- Code signing / notarisation, auto-update, app-store distribution.
- Sync, collaboration, plugins, themes beyond light/dark following the OS.

## Anti-goals

- **Corrupting a file.** Saving must write exactly the editor text; never
  reformat, normalise or round-trip through an AST.
- **Losing work.** Closing with unsaved changes never discards silently.
- **Preview executing content.** A Markdown file must not be able to run script,
  reach Node/Electron APIs, or navigate the app window.

## Constraints

- TypeScript strict, pnpm, Biome, Vitest, Playwright (author's standards).
- `justfile` with `setup test lint fmt check run` recipes; README and CI call them.
- Electron security baseline: `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`, a strict Content-Security-Policy, all file I/O in
  the main process behind a minimal `contextBridge` API.

## Approaches considered

| Approach | Trade-off | Verdict |
|---|---|---|
| **Electron + TS** | One language; Chromium's `webContents.printToPDF` gives exact, dialog-free PDF of the preview on all three OSes. Cost: ~100 MB app, higher RAM. | **Chosen** — PDF is a core requirement and this is the most reliable path to it. |
| Tauri + TS | ~10 MB app, but Rust shell; system webviews have no uniform save-as-PDF, so export needs the print dialog or per-OS Rust code. | Rejected — weakest at the one export feature. |
| Native (Swift etc.) | Re-implements Markdown/math/Mermaid rendering; per-OS codebases. | Rejected — far more work, contradicts cross-platform. |

Editing model: **split view** chosen over inline rendering (inline is several
times the work and risks breaking files; split supports every flavor for free).

## Design

**Shell:** Electron, scaffolded with Electron Forge + Vite plugin (official
template); Forge makers produce the installers.

**Processes:**
- *Main* — window, native menus, dialogs, file read/write, recent files
  (`app.addRecentDocument` + a small JSON in `userData`), PDF export.
- *Preload* — exposes `open()`, `save(path, text)`, `saveAs(text)`,
  `exportPdf(html, pageSize)` and menu-event subscriptions. Nothing else.
- *Renderer* — the UI, no Node access.

**Editor:** CodeMirror 6 with `@codemirror/lang-markdown`, heading folding
(`foldGutter`), search, undo history.

**Rendering:** unified pipeline — `remark-parse` → flavor plugins →
`remark-rehype` → `rehype-sanitize` → highlighting → `rehype-stringify`.
Flavor = plugin set:
- CommonMark: none.
- GFM: `remark-gfm` (includes footnotes, as GitHub does).
- Extended: `remark-gfm`, `remark-math` + `rehype-katex`,
  `remark-frontmatter`, Mermaid blocks rendered client-side by `mermaid`
  (`securityLevel: 'strict'`) after the HTML is inserted.
Render is debounced (~150 ms) while typing.

**Safety:** raw HTML in Markdown passes through `rehype-sanitize` (GitHub's
schema). Links in the preview open in the default browser
(`shell.openExternal`, http/https/mailto only); in-window navigation is
blocked. Relative images resolve against the open file's directory.

**PDF export:** main creates a hidden `BrowserWindow`, loads the rendered HTML
with the print stylesheet (KaTeX and highlight CSS inlined, Mermaid already
rendered to SVG), calls `printToPDF({ pageSize, printBackground: true })`, and
writes the result to the path from the save dialog.

**Tabs:** one window, an in-app tab bar (Electron has no cross-platform
native tabs; macOS-only `tabbingIdentifier` is not used). Each tab holds its own
CodeMirror `EditorState`, file path, flavor, dirty flag and last-known mtime;
one `EditorView` swaps state on tab switch. Opening a file already open focuses
its tab; opening from an empty, unmodified tab reuses it. New (Cmd/Ctrl+N)
opens an untitled tab; Cmd/Ctrl+W closes a tab (prompt if dirty); quitting
prompts once listing all dirty tabs.

**External changes:** main records the file's mtime on open/save. It re-checks:
- before Save — if changed on disk: *Overwrite* / *Reload* / *Cancel*;
- before PDF export — *Reload first* / *Export current text*;
- on window focus — reload silently if the tab is clean, otherwise ask.
No continuous file watching (`fs.watch` is unreliable across OSes).

**Flavor choice:** remembered per app (last used), default GFM.
Front matter field `flavor:` is not read (v1).

**Testing:** Vitest for the render pipeline (one fixture per flavor feature,
plus sanitiser cases: `<script>`, `javascript:` links, `onerror=`). Playwright
`_electron` for one end-to-end path: open → edit → save → export PDF (file
exists, starts with `%PDF`).

**CI:** GitHub Actions matrix (macos, ubuntu, windows) runs `just check` and
`just make`, uploads installers as artifacts.

## Left to the builder

- Exact keyboard shortcuts (follow platform conventions; Cmd on macOS, Ctrl elsewhere).
- Toolbar layout and styling; preview typography (a GitHub-like stylesheet is fine).
- Syntax highlighter choice (`rehype-highlight` or Shiki) — smallest that works.
- Whether Linux ships `.AppImage` or `.zip` alongside `.deb`.
- Repo scaffolding per the author's standards (CONTRIBUTING, etc.). **License
  deferred** — no LICENSE file until the author decides.

## Open items (my calls, flagged for review)

- Footnotes render in GFM too, since GitHub supports them.
- A4 default page size (ISO 216), Letter as the alternative.
