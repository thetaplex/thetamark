# Project

**thetamark** — a desktop Markdown editor for macOS, Linux and Windows (Electron): live preview, Markdown flavors, PDF export.

<!-- agent-stack:start -->
## How we work here
- **Specs first (OpenSpec):** for anything non-trivial, propose a change with `/opsx:propose` (or the `openspec-propose` skill) before writing code. Specs live in `openspec/`.
- **Process (superpowers):** brainstorming -> writing-plans -> test-driven-development -> requesting-code-review.
- **Code (ponytail):** the simplest thing that works. Reuse what's already in the repo, the stdlib or the platform before adding code or dependencies. No abstractions nobody asked for.
- **Shell (rtk):** if commands aren't rewritten automatically, prefix noisy ones with `rtk` (e.g. `rtk git status`, `rtk just check`).
<!-- agent-stack:end -->

These tools are optional. If one isn't installed, follow its intent: propose before coding, test first, keep it simple. Get the `/opsx` commands with `openspec init` (see CONTRIBUTING.md).
