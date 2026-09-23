# Installing meme-maker

`agent-meme-maker` ships the `meme` CLI, the `meme-maker-mcp` stdio server,
and the built-in template catalog. npm/npx is the primary installation path
on Windows, macOS, and Linux. The GitHub Release tarballs and curl installer
remain available as a standalone alternative.

## Requirements

- Node.js **>= 20.19.0** ([download Node.js](https://nodejs.org/en/download)).
- npm/npx, which are included with Node.js, for the primary install path.

## Install globally with npm

Use a global install when you want stable `meme` and `meme-maker-mcp`
commands on your `PATH`:

```sh
npm install -g agent-meme-maker@0.4.0
meme --version
meme templates list
```

Upgrade and uninstall npm-managed copies with npm:

```sh
npm install -g agent-meme-maker@latest
npm uninstall -g agent-meme-maker
```

Before a release is available on the registry, build and install the exact
same package from a checkout:

```sh
npm ci
npm pack
npm install -g ./agent-meme-maker-0.4.0.tgz
```

Do not use `meme update` for an npm-managed install. That command belongs to
the standalone curl/GitHub installation described below.

## Run without installing with npx

Use npx for one-off commands or an MCP configuration that should pin an exact
package version:

```sh
npx -y agent-meme-maker@0.4.0 --version
npx -y agent-meme-maker@0.4.0 templates list
npx -y agent-meme-maker@0.4.0 render \
  --template drake \
  --text no="MANUAL EDITORS" \
  --text yes="ONE COMMAND" \
  -o out.png
```

Change `0.4.0` deliberately when upgrading a pinned setup, or use `@latest`
when reproducibility is not required. The first npx run downloads the package
and its template catalog, so it can take longer than later cached starts.

## Configure the MCP server

The npm package exposes a local stdio MCP server through the `mcp` CLI
subcommand. It does not open a network port.

### Codex

Register the pinned npx command and verify it:

```sh
codex mcp add meme-maker -- npx -y agent-meme-maker@0.4.0 mcp
codex mcp list
```

If you installed the package globally, the shorter equivalent is:

```sh
codex mcp add meme-maker -- meme-maker-mcp
```

The npx form is equivalent to this entry in `~/.codex/config.toml`:

```toml
[mcp_servers.meme-maker]
command = "npx"
args = ["-y", "agent-meme-maker@0.4.0", "mcp"]
startup_timeout_sec = 120
```

See the official [Codex MCP documentation](https://developers.openai.com/learn/docs-mcp)
for configuration and troubleshooting details.

### Claude Code

On macOS, Linux, or WSL:

```sh
claude mcp add --scope user meme-maker -- npx -y agent-meme-maker@0.4.0 mcp
claude mcp list
```

On native Windows, Claude Code requires the `cmd /c` wrapper for local MCP
servers launched with npx:

```powershell
claude mcp add --scope user meme-maker -- cmd /c npx -y agent-meme-maker@0.4.0 mcp
claude mcp list
```

Then run `/mcp` inside Claude Code to confirm the server is connected. See the
official [Claude Code MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp).

## Standalone curl/GitHub installation

Choose this path when you prefer a self-contained GitHub Release install over
npm. On Linux and macOS, run:

```sh
curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
```

On native Windows, run the same command from Git Bash, MSYS2, or Cygwin. The
installer writes both shell wrappers and Windows `.cmd` wrappers. PowerShell
and Command Prompt users should normally use the npm installation instead.

The installer:

1. Detects the OS and architecture.
2. Uses a compatible Node.js already on `PATH`, or downloads a supported Node
   runtime into `MEME_MAKER_HOME` when necessary.
3. Resolves the latest tagged GitHub Release, falling back to `main`.
4. Downloads the matching platform tarball. If no tarball exists for the
   platform, it falls back to a source build, which requires npm.
5. Installs the app under `~/.meme-maker` by default and writes `meme` and
   `meme-maker-mcp` wrappers under the selected prefix.

Release assets are built for these targets:

| Platform    | Release asset                   |
| ----------- | ------------------------------- |
| Linux x64   | `meme-maker-linux-x64.tar.gz`   |
| macOS x64   | `meme-maker-macos-x64.tar.gz`   |
| macOS arm64 | `meme-maker-macos-arm64.tar.gz` |
| Windows x64 | `meme-maker-win32-x64.tar.gz`   |

You can also download one of those assets directly from the project's
[GitHub Releases](https://github.com/kartikkabadi/meme-maker/releases) page.

### Standalone installer options

| Variable             | Default                                    | Purpose                                                   |
| -------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `PREFIX`             | `/usr/local` as root, otherwise `~/.local` | Directory prefix for command wrappers (`$PREFIX/bin`)     |
| `MEME_MAKER_HOME`    | `~/.meme-maker`                            | App and optional bundled Node runtime location            |
| `MEME_MAKER_REF`     | Latest release tag, otherwise `main`       | Tag or branch to install                                  |
| `MEME_MAKER_TARBALL` | Unset                                      | Local platform tarball to install without downloading one |

Install a specific release:

```sh
curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh \
  | MEME_MAKER_REF=v0.4.0 sh
```

Install from an already downloaded tarball:

```sh
MEME_MAKER_TARBALL="$PWD/meme-maker-linux-x64.tar.gz" sh install.sh
```

### Upgrade a standalone install

`meme update` is **only for installations created by the curl/GitHub
installer**:

```sh
meme update --check
meme update
```

It checks GitHub Releases and reruns the standalone installer in place. If a
custom `PREFIX` was used, pass the same value while updating. npm users must
upgrade with `npm install -g agent-meme-maker@latest`; npx users update the
version in their command or MCP configuration.

### Uninstall a standalone install

```sh
rm -f ~/.local/bin/meme ~/.local/bin/meme-maker-mcp
rm -rf ~/.meme-maker
```

Adjust the wrapper path if you used a custom `PREFIX`. On Windows, also remove
the corresponding `.cmd` wrappers if they remain.

## Build from source

For contributors:

```sh
git clone https://github.com/kartikkabadi/meme-maker.git
cd meme-maker
npm ci
npm run build
node dist/cli.js templates list
```

Run the MCP server from a clone with `node dist/mcp.js`, or use
`node dist/cli.js mcp`.

## Troubleshooting

- **Unsupported Node version:** confirm `node --version` is at least 20.19.0.
- **`meme` is not found after a global npm install:** inspect
  `npm prefix --global` and ensure its executable directory is on `PATH`.
- **An npx-based MCP server times out on first start:** the initial package and
  template download is relatively large. Keep `startup_timeout_sec = 120` in
  Codex or retry after the first npx download completes.
- **Native Windows Claude Code cannot start npx:** remove and re-add the server
  with the documented `cmd /c npx ...` command.
- **The standalone installer cannot find a platform tarball:** install npm so
  it can use the source fallback, or download a matching Release asset and set
  `MEME_MAKER_TARBALL`.

## Verify any installation

```sh
meme --version
meme templates list
meme render --template drake --text no="MANUAL EDITORS" --text yes="ONE COMMAND" -o out.png
```
