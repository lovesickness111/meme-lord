# PR #73 Review Fixes

Fixes applied to `devin/install-combined` (commit `960a38c`) after the harsh review of PR #73.

## Changes

1. **No-Node CI leg** — added an `install-no-node` job to `.github/workflows/install-test.yml`. It runs in a `debian:bookworm-slim` container with only `curl` and `ca-certificates` (no `setup-node`), asserts Node is absent, runs the curl installer, and verifies `meme --version` and `meme render`. This exercises the Node auto-download path end-to-end in CI.
2. **cygpath fallback** — `install.sh` now `die`s with a clear error when `cygpath` is missing and `MEME_MAKER_HOME` is non-default, instead of writing a broken `.cmd` wrapper pointing at `%USERPROFILE%\.meme-maker`.
3. **Verify diagnostics** — the final `"$BIN_DIR/meme" --version` check no longer swallows stderr; on failure it prints an explanatory error before dying.
4. **REF hardening** — after the `sed` that extracts the release tag, `REF` falls back to `main` if it is empty or still contains `https://` or `/`.

## CI

- Install Test run (all green: ubuntu, macos, windows, install-no-node):
  https://github.com/kartikkabadi/meme-maker/actions/runs/29835567652
