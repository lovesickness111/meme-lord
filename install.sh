#!/bin/sh
# meme-maker installer
#
#   curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
#
# Installs the `meme` CLI and `meme-maker-mcp` server. Uses Node.js >= 20 from
# your PATH if present; otherwise downloads an official Node runtime into
# $MEME_MAKER_HOME/node so no pre-installed Node or npm is needed.
# Prefers a pre-built self-contained tarball from GitHub Releases
# (meme-maker-<platform>-<arch>.tar.gz); falls back to building from source.
# The app itself lives in $MEME_MAKER_HOME (default ~/.meme-maker); thin
# wrappers are placed in $PREFIX/bin.
#
# Environment overrides:
#   PREFIX           install prefix for wrappers (default: /usr/local as root,
#                    otherwise $HOME/.local)
#   MEME_MAKER_HOME  where the app is installed (default: $HOME/.meme-maker)
#   MEME_MAKER_REF   git ref / release tag to install (default: latest release,
#                    falling back to main)
#   MEME_MAKER_TARBALL  path to a local pre-built tarball (skips all downloads;
#                    mainly for testing scripts/package-release.sh output)
#
# Uninstall:
#   rm -f "$PREFIX/bin/meme" "$PREFIX/bin/meme-maker-mcp"
#   rm -rf "$MEME_MAKER_HOME"

set -eu

REPO="kartikkabadi/meme-maker"
NODE_MIN_MAJOR=20
NODE_VERSION=20.20.2

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

# --- platform detection -----------------------------------------------------
OS=$(uname -s 2>/dev/null || echo unknown)
ARCH=$(uname -m 2>/dev/null || echo unknown)
case "$OS" in
  Linux)  PLATFORM=linux ;;
  Darwin) PLATFORM=macos ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM=win32 ;;
  *) die "unsupported OS: $OS" ;;
esac
case "$ARCH" in
  x86_64|amd64) ASSET_ARCH=x64 ;;
  aarch64|arm64) ASSET_ARCH=arm64 ;;
  *) ASSET_ARCH="$ARCH" ;;
esac
info "Detected $PLATFORM/$ARCH"

# --- prefix -----------------------------------------------------------------
if [ -z "${PREFIX:-}" ]; then
  if [ "$(id -u)" = "0" ]; then PREFIX=/usr/local; else PREFIX="$HOME/.local"; fi
fi
BIN_DIR="$PREFIX/bin"
MEME_MAKER_HOME="${MEME_MAKER_HOME:-$HOME/.meme-maker}"

# --- helpers ----------------------------------------------------------------
fetch() { # url, dest
  if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else die "need curl or wget"; fi
}

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# --- node runtime -------------------------------------------------------------
# Use Node >= NODE_MIN_MAJOR from PATH if available; otherwise download the
# official Node binary for this platform into $MEME_MAKER_HOME/node.
NODE_CMD=
BUNDLE_NODE=no
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "$NODE_MAJOR" -ge "$NODE_MIN_MAJOR" ]; then
    NODE_CMD=node
  else
    info "Node $(node -v) found but >= $NODE_MIN_MAJOR is required"
  fi
fi
if [ -z "$NODE_CMD" ]; then
  case "$PLATFORM-$ASSET_ARCH" in
    linux-x64|linux-arm64) NODE_ASSET="node-v$NODE_VERSION-linux-$ASSET_ARCH.tar.gz" ;;
    macos-x64|macos-arm64) NODE_ASSET="node-v$NODE_VERSION-darwin-$ASSET_ARCH.tar.gz" ;;
    win32-x64)             NODE_ASSET="node-v$NODE_VERSION-win-x64.zip" ;;
    *) die "Node.js >= $NODE_MIN_MAJOR is required and no bundled Node is available for $PLATFORM/$ARCH; install Node first (https://nodejs.org/en/download)" ;;
  esac
  info "Node.js >= $NODE_MIN_MAJOR not found; downloading Node v$NODE_VERSION ($NODE_ASSET)"
  fetch "https://nodejs.org/dist/v$NODE_VERSION/$NODE_ASSET" "$TMP_DIR/$NODE_ASSET" \
    || die "failed to download Node from nodejs.org; install Node >= $NODE_MIN_MAJOR manually and re-run"
  mkdir -p "$TMP_DIR/node"
  case "$NODE_ASSET" in
    *.tar.gz) tar -xzf "$TMP_DIR/$NODE_ASSET" -C "$TMP_DIR/node" --strip-components=1 ;;
    *.zip)
      command -v unzip >/dev/null 2>&1 || die "unzip is required to extract the Node runtime on Windows"
      unzip -q "$TMP_DIR/$NODE_ASSET" -d "$TMP_DIR/node-zip"
      mv "$TMP_DIR/node-zip/node-v$NODE_VERSION-win-x64"/* "$TMP_DIR/node/"
      ;;
  esac
  if [ "$PLATFORM" = win32 ]; then
    NODE_CMD="$TMP_DIR/node/node.exe"
    PATH="$TMP_DIR/node:$PATH"
  else
    NODE_CMD="$TMP_DIR/node/bin/node"
    PATH="$TMP_DIR/node/bin:$PATH"
  fi
  export PATH
  BUNDLE_NODE=yes
fi
info "Using Node $("$NODE_CMD" -v)"

REF="${MEME_MAKER_REF:-}"
if [ -z "$REF" ]; then
  # Prefer the latest tagged release (follow the /releases/latest redirect);
  # fall back to main.
  if command -v curl >/dev/null 2>&1; then
    REF=$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" 2>/dev/null \
      | sed 's|.*/tag/||')
  fi
  case "$REF" in
    ''|*https://*|*/*) REF=main ;;
  esac
fi
info "Installing $REPO@$REF"

SRC_DIR="$TMP_DIR/src"
mkdir -p "$SRC_DIR"
TARBALL="$TMP_DIR/meme-maker.tar.gz"
NEED_BUILD=yes

# 0) Local pre-built tarball (testing / air-gapped installs).
if [ -n "${MEME_MAKER_TARBALL:-}" ]; then
  [ -f "$MEME_MAKER_TARBALL" ] || die "MEME_MAKER_TARBALL not found: $MEME_MAKER_TARBALL"
  info "Using local tarball $MEME_MAKER_TARBALL"
  tar -xzf "$MEME_MAKER_TARBALL" -C "$SRC_DIR" --strip-components=1
  NEED_BUILD=no
# 1) Pre-built, self-contained release asset (no npm needed at all).
elif [ "$REF" != "main" ] && ASSET_URL="https://github.com/$REPO/releases/download/$REF/meme-maker-$PLATFORM-$ASSET_ARCH.tar.gz" && fetch "$ASSET_URL" "$TARBALL" 2>/dev/null; then
  info "Using pre-built release tarball ($PLATFORM-$ASSET_ARCH)"
  tar -xzf "$TARBALL" -C "$SRC_DIR" --strip-components=1
  NEED_BUILD=no
# 2) Source tarball for the ref.
elif { info "No pre-built tarball for $PLATFORM-$ASSET_ARCH at $REF; falling back to source (requires npm)"; false; } || fetch "https://codeload.github.com/$REPO/tar.gz/refs/tags/$REF" "$TARBALL" 2>/dev/null \
  || fetch "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" "$TARBALL" 2>/dev/null; then
  tar -xzf "$TARBALL" -C "$SRC_DIR" --strip-components=1
# 3) git clone as a last resort.
elif command -v git >/dev/null 2>&1; then
  info "Tarball download failed; falling back to git clone"
  git clone --depth 1 --branch "$REF" "https://github.com/$REPO.git" "$SRC_DIR" >/dev/null 2>&1 \
    || die "could not download $REPO@$REF"
else
  die "could not download $REPO@$REF (and git is not available)"
fi

# --- build (source installs only) --------------------------------------------
cd "$SRC_DIR"
if [ "$NEED_BUILD" = "yes" ]; then
  command -v npm >/dev/null 2>&1 \
    || die "no pre-built tarball for $PLATFORM-$ASSET_ARCH and npm is unavailable to build from source"
  if [ ! -f dist/cli.js ] || [ ! -f dist/mcp.js ]; then
    info "Building from source (this may take a minute)..."
    npm ci --no-audit --no-fund --loglevel=error >/dev/null
    npm run build >/dev/null
  fi
  info "Pruning dev dependencies..."
  npm prune --omit=dev --no-audit --no-fund --loglevel=error >/dev/null
fi

# --- install ----------------------------------------------------------------
info "Installing to $MEME_MAKER_HOME"
rm -rf "$MEME_MAKER_HOME"
mkdir -p "$MEME_MAKER_HOME"
for item in dist assets node_modules package.json README.md CHANGELOG.md; do
  if [ -e "$item" ]; then cp -R "$item" "$MEME_MAKER_HOME/"; fi
done
if [ "$BUNDLE_NODE" = yes ]; then
  info "Bundling Node v$NODE_VERSION into $MEME_MAKER_HOME/node"
  cp -R "$TMP_DIR/node" "$MEME_MAKER_HOME/node"
fi

mkdir -p "$BIN_DIR"
if [ "$PLATFORM" = win32 ]; then BUNDLED_NODE_BIN="$MEME_MAKER_HOME/node/node.exe"; else BUNDLED_NODE_BIN="$MEME_MAKER_HOME/node/bin/node"; fi
write_wrapper() { # name, entry
  cat > "$BIN_DIR/$1" <<EOF
#!/bin/sh
if [ -x "$BUNDLED_NODE_BIN" ]; then exec "$BUNDLED_NODE_BIN" "$MEME_MAKER_HOME/dist/$2" "\$@"; fi
exec node "$MEME_MAKER_HOME/dist/$2" "\$@"
EOF
  chmod +x "$BIN_DIR/$1"
}
write_wrapper meme cli.js
write_wrapper meme-maker-mcp mcp.js
if [ "$PLATFORM" = "win32" ]; then
  if command -v cygpath >/dev/null 2>&1; then
    MEME_MAKER_HOME_WIN=$(cygpath -w "$MEME_MAKER_HOME")
  elif [ "$MEME_MAKER_HOME" = "$HOME/.meme-maker" ]; then
    MEME_MAKER_HOME_WIN='%USERPROFILE%\.meme-maker'
  else
    die "cygpath not found; cannot write a correct .cmd wrapper for custom MEME_MAKER_HOME=$MEME_MAKER_HOME. Install cygpath (Git Bash/MSYS2 include it) or unset MEME_MAKER_HOME."
  fi
  write_cmd_wrapper() { # name, entry
    printf '@echo off\r\nsetlocal\r\nset "MEME_MAKER_HOME=%s"\r\nif exist "%%MEME_MAKER_HOME%%\\node\\node.exe" ("%%MEME_MAKER_HOME%%\\node\\node.exe" "%%MEME_MAKER_HOME%%\\dist\\%s" %%*) else (node "%%MEME_MAKER_HOME%%\\dist\\%s" %%*)\r\n' \
      "$MEME_MAKER_HOME_WIN" "$2" "$2" > "$BIN_DIR/$1.cmd"
  }
  write_cmd_wrapper meme cli.js
  write_cmd_wrapper meme-maker-mcp mcp.js
fi

# --- verify -----------------------------------------------------------------
if ! "$BIN_DIR/meme" --version >/dev/null; then
  err "'$BIN_DIR/meme --version' failed; output above may explain why"
  die "installed binary failed to run"
fi

info "Installed meme and meme-maker-mcp to $BIN_DIR"
case ":$PATH:" in
  *":$BIN_DIR:"*) : ;;
  *)
    printf '\n\033[1;33mnote:\033[0m %s is not on your PATH. Add it with:\n' "$BIN_DIR"
    # shellcheck disable=SC2016
    printf '  export PATH="%s:$PATH"\n' "$BIN_DIR"
    ;;
esac

printf '\nGet started:\n'
printf '  meme templates list\n'
printf '  meme render --template drake --text no="MANUAL EDITORS" --text yes="curl | sh" -o out.png\n'
printf '\nUninstall:\n'
printf '  rm -f "%s/meme" "%s/meme-maker-mcp" && rm -rf "%s"\n' "$BIN_DIR" "$BIN_DIR" "$MEME_MAKER_HOME"
