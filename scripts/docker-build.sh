#!/usr/bin/env bash
# Build the meme-maker container image.
# Usage: scripts/docker-build.sh [tag]
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-meme-maker:latest}"
docker build -t "$TAG" .
docker image ls "$TAG"
