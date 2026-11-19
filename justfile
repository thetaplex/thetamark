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
