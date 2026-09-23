# Dependency Audit: `curl | sh` install experience

Audit of whether the installer installs all dependencies for the user, and what
happens when Node.js and/or npm are missing. Tested against `install.sh` at
v0.3.1 in fresh Docker containers (2026-07-21).

## Answers to the six questions

### 1. Does the current `curl | sh` installer install Node.js for the user?

**No (on `main`).** `install.sh` hard-requires Node >= 20 on PATH and exits 1
with an error if it is missing. The `devin/node-auto-install` branch changes
this: if Node is missing (or too old), the installer downloads the official
Node v20.20.2 binary for the detected platform into `~/.meme-maker/node` and
the wrappers use it.

### 2. Does it install npm?

**No, and it never needs to for supported platforms.** npm is only needed for
the build-from-source fallback (platforms with no prebuilt tarball, e.g. Linux
arm64). On the prototype branch, a downloaded Node runtime also ships npm and
is put on PATH before the source build, so even the source fallback works
without pre-installed npm.

### 3. Does it install the app's own dependencies (`node_modules`)?

**Yes, always.**

- **Prebuilt path** (linux-x64, macos-x64, macos-arm64): the release tarball
  contains `dist`, `assets`, and production `node_modules` (including sharp's
  platform-native libvips). `npm install` is never run. Verified in a fresh
  `node:20` container: install completed, `~/.meme-maker/node_modules` was
  populated from the tarball, and no npm process ran.
- **Source fallback** (no matching tarball): `npm ci && npm run build && npm
  prune --omit=dev` — requires npm; dies with
  `no pre-built tarball for <platform>-<arch> and npm is unavailable to build from source`
  if npm is missing.

### 4. User experience when Node is missing / npm is missing

- **No Node (main):** exits 1 immediately after platform detection:

  ```
  error: Node.js is required but was not found on your PATH.
  error: Install Node.js >= 20 first, e.g.:
  error:   - https://nodejs.org/en/download
  error:   - macOS:  brew install node
  error:   - Linux:  curl -fsSL https://install-node.vercel.app/lts | bash
  ```

  Nothing is installed; the user must install Node and re-run. (Verified in a
  fresh `debian:bookworm-slim` container with only curl.)
- **Node too old (main):** `Node.js >= 20 required, found vX. Please upgrade Node.` (exit 1).
- **Node present, npm missing (main):** fine on the prebuilt path (npm never
  used); on the source-fallback path the install dies with the
  `npm is unavailable to build from source` error.

### 5. What would it take to be truly dependency-free?

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Bundle Node in each release tarball** | one download | +40–47 MB on every tarball for every user, even those with Node; release pipeline changes |
| **B. install.sh downloads official Node only when missing** (prototyped) | zero prerequisites, no cost for users with Node, no release changes | one extra download for Node-less users; ~167 MB unpacked in `~/.meme-maker/node` |
| **C. Use nvm/fnm during install** | familiar to devs | installs/depends on a third-party tool, mutates shell profiles, fragile under `curl | sh` |
| **D. Document Node as a prerequisite** (status quo) | no code change | breaks the "no npm, one curl" spirit; README currently says "only Node >= 20" |

### 6. Smallest, safest change matching the "no npm, one curl" promise

**Option B** — auto-download Node in `install.sh` only when missing. It is
~50 lines in one file, changes nothing for users who already have Node
(verified: no `node/` dir bundled, wrappers fall back to PATH `node`), needs
no release-pipeline changes, and makes the one-liner work on a completely bare
machine.

## Official Node v20.20.2 binary sizes (nodejs.org/dist)

| Platform | Asset | Compressed |
| --- | --- | --- |
| linux-x64 | `node-v20.20.2-linux-x64.tar.gz` | 45.0 MB |
| macos-x64 | `node-v20.20.2-darwin-x64.tar.gz` | 40.8 MB |
| macos-arm64 | `node-v20.20.2-darwin-arm64.tar.gz` | 39.6 MB |
| win32-x64 | `node-v20.20.2-win-x64.zip` | 28.9 MB |

Unpacked footprint in `~/.meme-maker/node` on linux-x64: ~167 MB.

## Prototype: `devin/node-auto-install`

Changes to `install.sh` only:

- If Node >= 20 is on PATH, behavior is unchanged (verified).
- If Node is missing or `< 20`, download the official Node v20.20.2 binary for
  linux-x64, linux-arm64, macos-x64, macos-arm64, or win32-x64 from
  nodejs.org, extract to a temp dir, and copy to `$MEME_MAKER_HOME/node`
  during install. The downloaded runtime is also prepended to PATH so the
  source-build fallback gets npm for free.
- Wrappers prefer `$MEME_MAKER_HOME/node/bin/node` when it exists, falling
  back to `node` from PATH.
- Windows (Git Bash/MSYS/Cygwin) is no longer rejected: `PLATFORM=win32`, the
  Node zip (`node.exe` at the top of `node/`) is used, and `.cmd` wrappers
  calling `node.exe` are generated alongside the sh wrappers. Note: there is
  no win32 release tarball, so Windows always takes the source-build path.
- Unsupported platform/arch combos keep a clear "install Node first" error.

### Test results (fresh containers)

| Scenario | Result |
| --- | --- |
| `node:20` + main `install.sh` | OK; prebuilt tarball; no npm run; `node_modules` from tarball |
| `debian:bookworm-slim` (no Node) + main `install.sh` | exit 1 with "Node.js is required" error |
| `debian:bookworm-slim` (no Node) + prototype | OK; Node auto-downloaded; `meme --version` → 0.3.1; `meme render --template drake ... --json` rendered 1200x1200 PNG; `meme-maker-mcp` responded to MCP `initialize` |
| `node:20` + prototype (regression) | OK; no Node bundled; wrappers fall back to PATH `node` |

Not tested: macOS and Windows paths (no runners available in this session);
they follow the same code path with different asset names.

### Blockers / risks

- macOS/Windows untested — low risk for macOS (same tar.gz layout), moderate
  for Windows (`.cmd` wrappers + unzip requirement + source-build path).
- Node version is pinned (20.20.2); needs a bump cadence or a "latest v20"
  lookup later.
- README/docs/INSTALL.md still say "Node >= 20 required" and should be updated
  to "no prerequisites (Node auto-installed if missing)" if this merges.

## Recommendation

Merge Option B (this branch) for Linux/macOS — it is small, verified on Linux,
and delivers the "one curl, zero prerequisites" story before launch. If the
Windows portion feels risky pre-launch, it can be split out or reverted to the
previous WSL-only error while keeping the auto-download for Linux/macOS.

**Short answer: on `main`, no — Node >= 20 must be pre-installed. On
`devin/node-auto-install`, yes — verified end-to-end on a bare Linux container
with zero pre-installed dependencies.**
