# Contributing

1. For anything non-trivial, propose the change first as an OpenSpec change under `openspec/changes/` and record lasting decisions as an ADR in `docs/adr/`.
   To get the `/opsx` commands in your AI tool, install [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`pnpm add -g @fission-ai/openspec`) and run `openspec init`.
2. `just setup`, then work test-first: `just test` for unit tests, `just e2e` for the app.
3. Before opening a pull request, `just fmt` and `just check` must pass.
4. Keep pull requests small, describe the user-visible change, and add an entry under `[Unreleased]` in `CHANGELOG.md`.
