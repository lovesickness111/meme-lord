#!/bin/sh
# Build a self-contained release tarball for the current platform:
#   meme-maker-<platform>-<arch>.tar.gz
# Upload it to the GitHub Release for the tag; install.sh prefers it over
# building from source. Run from the repo root.
set -eu

case "$(uname -s)" in
  Linux)  PLATFORM=linux ;;
  Darwin) PLATFORM=macos ;;
  *) echo "unsupported OS" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) ARCH=x64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) ARCH=$(uname -m) ;;
esac

npm ci --no-audit --no-fund --loglevel=error
npm run build
npm prune --omit=dev --no-audit --no-fund --loglevel=error

OUT="meme-maker-$PLATFORM-$ARCH.tar.gz"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir "$STAGE/meme-maker"
cp -R dist assets node_modules package.json README.md CHANGELOG.md install.sh "$STAGE/meme-maker/"
tar -czf "$OUT" -C "$STAGE" meme-maker
echo "wrote $OUT"
