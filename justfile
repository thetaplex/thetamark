default:
    @just --list

# Install dependencies (and make sure the Electron binary is present)
setup:
    pnpm install --frozen-lockfile
    node node_modules/electron/install.js

# Unit tests
test:
    pnpm exec vitest run

# Lint and format check
lint:
    pnpm exec biome check .

# Format and apply safe lint fixes
fmt:
    pnpm exec biome check --write .

# Lint, typecheck, unit tests
check: lint
    pnpm exec tsc --noEmit
    just test

# Run the app in development mode
run: dev-name
    pnpm exec electron-forge start

# macOS takes the menu-bar/Dock name from the bundle; rename dev Electron.app to ThetaMark
[private]
dev-name:
    #!/usr/bin/env sh
    plist=node_modules/electron/dist/Electron.app/Contents/Info.plist
    [ "$(uname)" = Darwin ] && [ -f "$plist" ] || exit 0
    /usr/libexec/PlistBuddy -c "Set :CFBundleName ThetaMark" -c "Set :CFBundleDisplayName ThetaMark" "$plist"
    touch node_modules/electron/dist/Electron.app

# Build the app and run the end-to-end tests against it
e2e:
    pnpm exec electron-forge package
    pnpm exec playwright test

# Build installers for this OS into out/make
make:
    pnpm exec electron-forge make

# Tag main with package.json's version and push the tag; CI builds and publishes the release
release:
    #!/usr/bin/env bash
    set -euo pipefail
    tag=v$(node -p "require('./package.json').version")
    git fetch -q --tags origin main
    [ "$(git branch --show-current)" = main ] || { echo "release from main" >&2; exit 1; }
    git diff --quiet HEAD || { echo "commit or stash local changes first" >&2; exit 1; }
    [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "main is not origin/main: pull or push first" >&2; exit 1; }
    git rev-parse -q --verify "refs/tags/$tag" >/dev/null && { echo "$tag already exists: bump the version first" >&2; exit 1; }
    grep -q "^## \[${tag#v}\]" CHANGELOG.md || { echo "CHANGELOG.md has no ## [${tag#v}] section" >&2; exit 1; }
    git tag "$tag"
    git push origin "$tag"
    echo "pushed $tag; CI publishes the release"
