# ThetaMark by ThetaPlex

[![CI](https://github.com/thetaplex/thetamark/actions/workflows/ci.yml/badge.svg)](https://github.com/thetaplex/thetamark/actions/workflows/ci.yml)

A desktop Markdown editor for macOS, Linux and Windows: edit with a live side-by-side preview, switch between Markdown flavors, save back to disk, and export to PDF.

## Why

One small, fast tool for your own notes and docs that renders the Markdown you actually write (GitHub tables and task lists, math, Mermaid diagrams), never rewrites your files, and turns any document into a clean PDF.

## Features

- Tabs, with an editor-only, split or preview-only layout (<kbd>Ctrl/Cmd</kbd>+<kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd>) and section folding by heading
- Flavors: **CommonMark**, **GitHub (GFM)** and **Extended** (GFM + KaTeX math, Mermaid, YAML front matter)
- Syntax-highlighted code blocks
- Open, Save, Save As, Open Recent; prompts before discarding unsaved changes
- Detects when another program changed the file (before save, before export, on window focus)
- Export the preview to PDF, A4 (ISO 216) or Letter
- Preview is sanitised: document HTML can't run scripts

## Install

Download the installer for your OS from [Releases](https://github.com/thetaplex/thetamark/releases/latest) (`.dmg`/`.zip` for macOS, Squirrel `.exe` for Windows, `.deb`/`.zip` for Linux). Builds aren't signed with a developer certificate, so macOS and Windows warn on first launch. On macOS, open the app once, then choose **System Settings ▸ Privacy & Security ▸ Open Anyway**. On Windows, choose **More info ▸ Run anyway**.

## Build from source

Prerequisites: [Node.js 24+](https://nodejs.org/), [pnpm](https://pnpm.io/installation), [just](https://just.systems/man/en/packages.html). On Linux, `fakeroot` and `dpkg` for `.deb` builds.

```sh
just setup   # install dependencies
just run     # start the app in development mode
```

## Usage

```sh
just run    # open an empty tab
```

Open a file with **File ▸ Open** or **File ▸ Open Recent**, or right-click a `.md` file in your file manager and choose "Open With". **File ▸ Export PDF** (<kbd>Ctrl/Cmd</kbd>+<kbd>P</kbd>) writes the preview to a PDF using the page size picked in the toolbar.

## Development

```sh
just          # list recipes
just check    # lint, typecheck, unit tests
just e2e      # build and run the Playwright end-to-end tests
just fmt      # format
just make     # build installers for this OS into out/make
```

## Links

- [Design](docs/superpowers/specs/2026-11-19-thetamark-design.md) · [ADRs](docs/adr/) · [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md)

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE).
