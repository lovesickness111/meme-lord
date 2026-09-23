# Update path audit

**Question:** "If I push updates, how will users update it? Is there anything for that yet, or not?"

**Answer:** There was no explicit update mechanism — no `update`/`upgrade` CLI command, no npm distribution (`npm update` doesn't apply), and no "Upgrade" docs. However, re-running the curl installer *was already* a clean full update; it just wasn't documented or discoverable. PR [#75](https://github.com/kartikkabadi/meme-maker/pull/75) adds `meme update` plus docs.

## Current state (before the fix)

Re-running `curl -fsSL .../install.sh | sh` after a new release:

- **Picks up the latest release tag automatically** — resolves it by following the `github.com/<repo>/releases/latest` redirect (falls back to `main`).
- **Overwrites `~/.meme-maker` completely** — `rm -rf "$MEME_MAKER_HOME"` before copying, so no stale `node_modules`/assets are left behind (verified with a sentinel file).
- **Rewrites the wrapper scripts** in `$PREFIX/bin` (`meme`, `meme-maker-mcp`).

So the installer was already idempotent and update-safe; the gap was purely discoverability (nothing in the CLI or docs told users this).

## Chosen fix (PR #75, branch `devin/update-command`)

Smallest reasonable mechanism: a `meme update` subcommand that delegates to the existing installer (single code path for install and update; no npm required, works wherever the installer works):

- `meme update` — resolves the latest tag (same redirect trick, no GitHub API/rate limits); exits early if up to date; otherwise re-runs the curl installer (wget fallback) with `MEME_MAKER_HOME` pointed at the current install root, so custom install locations self-update.
- `meme update --check` — report only; `--json` for machine-readable `{current, latest, upToDate}`.
- Source-checkout guard — refuses to run from a repo clone (detects `.git`/`src` next to `dist`) and suggests `git pull`.
- Docs: new "Upgrade" section in `docs/INSTALL.md`; `meme update` mentioned in the README quick start.

Note: binaries at v0.3.1 and earlier don't have `meme update` yet — those users upgrade once by re-running the install one-liner; every release after this PR has `meme update`.

## Test results (fresh `node:20` Docker container, real curl installs)

| Test | Result |
| --- | --- |
| Fresh install pinned to v0.3.0 (`MEME_MAKER_REF=v0.3.0`) → `meme --version` = 0.3.0 | passed |
| Re-run installer with no ref → auto-resolves v0.3.1, wrapper rewritten, old home wiped (sentinel gone) | passed |
| `meme update --check` / `--check --json` (branch build) report current vs latest correctly | passed |
| `meme update` with install faked to 0.3.0 → re-runs installer, ends at 0.3.1 | passed |
| Source-checkout guard: `node dist/cli.js update` from clone → `IO_ERROR` exit 1 | passed |

## PR

https://github.com/kartikkabadi/meme-maker/pull/75 — **not merged** (per instructions).
