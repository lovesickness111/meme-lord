# Releasing meme-maker

Every tagged release produces two distribution channels:

- The npm package, which is the primary Windows/macOS/Linux install path.
- GitHub Release assets for the standalone curl/tarball path.

The npm tarball is always built and attached to the GitHub Release. Publishing
it to npm is an explicit, conditional step.

## 1. Prepare the fork and npm publisher

Before the first publish, confirm that the npm account or organization controls
the `meme-lord` package name. A first publication may need to be
bootstrapped before npm exposes package settings.

> **Fork safety:** `package.json` fields `repository`, `bugs`, and `homepage`
> must point to the exact fork performing the release. The npm Trusted
> Publisher organization/user, repository, and workflow filename must also
> match that fork exactly, including case. Do not publish from a fork while
> those values still identify `kartikkabadi/meme-maker` unless that is the
> repository actually running the workflow.

Configure npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
for the fork's GitHub repository and `.github/workflows/release.yml`. The
`publish-npm` job uses a GitHub-hosted runner, Node 24, npm 11.6.2, and
`id-token: write`; it does not require a long-lived npm publish token. Node 24
also satisfies Trusted Publishing's CI requirements, while package consumers
only require Node.js **>= 20.19.0**.

The workflow pins npm 11.6.2. When configuring a new Trusted Publisher, ensure
its publishing mode permits the direct `npm publish` command used by the
workflow rather than requiring a separate staged-release promotion.

Keep the GitHub Actions repository variable `NPM_PUBLISH` unset or set to
`false` while validating a fork. Set it to `true` only after package ownership,
repository metadata, and the Trusted Publisher are correct.

## 2. Bump the version and changelog

Use npm so `package.json` and `package-lock.json` stay synchronized:

```sh
npm version X.Y.Z --no-git-tag-version
```

The CLI and MCP server read the package version through `src/version.ts`, so
they do not have separate version literals. Add a `## X.Y.Z` section near the
top of `CHANGELOG.md`; the heading must have no `v` prefix because the release
workflow extracts that section as the GitHub Release notes.

Regenerate the template manifest and review the resulting diff:

```sh
npm run build:manifest
git diff -- package.json package-lock.json CHANGELOG.md assets/templates/manifest.json
```

## 3. Verify locally

Use the same important gates as the release workflow:

```sh
npm ci
npm run build:manifest
npm run build
npm run lint
npm test
npm audit --omit=dev --audit-level=high
npm run test:package
npm pack --dry-run
```

`npm run test:package` builds an npm tarball by default, installs it into a
clean temporary project, runs the installed CLI and stdio MCP entry points
directly, renders a smoke-test image, and audits the installed production
dependency tree. In CI, `MEME_PACKAGE_TARBALL` points it at the final artifact
so the exact uploaded bytes are tested. Treat a failure here as a release
blocker.

Inspect `npm pack --dry-run` to confirm that `dist`, `assets`, notices, and the
expected binaries are included without source-only or temporary files.

## 4. Merge, tag, and push

Land the release commit on `main`, then create a tag whose version exactly
matches `package.json`:

```sh
git checkout main
git pull --ff-only
git tag vX.Y.Z
git push origin vX.Y.Z
```

The workflow rejects a tag/package version mismatch.

## 5. What the Release workflow does

Pushing a `v*` tag triggers
[`release.yml`](../.github/workflows/release.yml):

1. **`build`** runs build, lint, and tests on Linux x64, macOS x64, macOS
   arm64, and Windows x64, then creates a self-contained platform tarball with
   production dependencies and assets.
2. **`npm-package`** runs on Node 24, verifies the tag/package version match,
   builds, lints, tests, runs the production `npm audit`, creates the npm
   tarball, executes `npm run test:package` against that exact tarball, and
   uploads it as a workflow artifact.
3. **`publish-npm`** downloads that tested tarball and publishes the exact file
   through npm Trusted Publishing only when the repository variable condition
   `vars.NPM_PUBLISH == 'true'` is satisfied. When the variable is absent or
   false, this job is skipped.
4. **`release`** waits for `publish-npm` to succeed or be skipped, verifies all
   required artifacts, creates a source tarball, extracts release notes from
   `CHANGELOG.md`, and creates the GitHub Release.

Skipping `publish-npm` does not remove the npm tarball from the GitHub Release;
it remains available for review or local installation.

## 6. Release assets

The GitHub Release must contain:

- `meme-maker-linux-x64.tar.gz`
- `meme-maker-macos-x64.tar.gz`
- `meme-maker-macos-arm64.tar.gz`
- `meme-maker-win32-x64.tar.gz`
- `meme-lord-X.Y.Z.tgz` (the tested npm tarball)
- `meme-lord-vX.Y.Z.tar.gz` (source)
- `install.sh`

The `.tgz` filename intentionally omits the `v`, matching `npm pack` output.

## 7. Verify the published release

If npm publishing was enabled:

```sh
npm view meme-lord@X.Y.Z version
npx -y meme-lord@X.Y.Z --version
npx -y meme-lord@X.Y.Z templates list
```

Also configure a temporary MCP client with
`npx -y meme-lord@X.Y.Z mcp` and confirm it lists and calls the server's
tools. This validates the same npx path documented for Codex and Claude Code.

Verify the standalone channel on a supported platform:

```sh
curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh \
  | MEME_MAKER_REF=vX.Y.Z sh
meme --version
meme templates list
```

The installer should select a pre-built tarball, not the source fallback. To
test a platform tarball before tagging:

```sh
sh scripts/package-release.sh
MEME_MAKER_TARBALL="$PWD/meme-maker-linux-x64.tar.gz" sh install.sh
```

Finally, check the GitHub Actions run. A skipped `publish-npm` job is expected
when `NPM_PUBLISH` is not `true`; an attempted publish that fails authentication
usually means the Trusted Publisher repository/workflow metadata does not
exactly match the fork.
