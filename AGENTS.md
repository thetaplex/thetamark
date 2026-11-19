# Project

**thetamark** — a Markdown tool (render, lint or convert Markdown; scope set by the first OpenSpec change).

<!-- agent-stack:start -->
## How we work here
- **Specs first (OpenSpec):** for anything non-trivial, propose a change with `/opsx:propose` (or the `openspec-propose` skill) before writing code. Specs live in `openspec/`.
- **Process (superpowers):** brainstorming -> writing-plans -> test-driven-development -> requesting-code-review.
- **Code (ponytail):** the simplest thing that works. Reuse what's already in the repo, the stdlib or the platform before adding code or dependencies. No abstractions nobody asked for.
- **Shell (rtk):** if commands aren't rewritten automatically, prefix noisy ones with `rtk` (e.g. `rtk git status`, `rtk cargo test`).
<!-- agent-stack:end -->
