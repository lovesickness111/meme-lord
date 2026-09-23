#!/usr/bin/env bash
# Renders media/launch/launch.mp4 from the storyboard using Remotion.
# Usage: ./render.sh   (from media/launch/)
set -euo pipefail
cd "$(dirname "$0")"

# 1. Re-render static meme assets from the repo's CLI (idempotent).
./render-assets.sh

# 2. Install Remotion deps locally (kept out of the root package.json).
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi

# 3. Render the final MP4 (1080x1080, 30fps, ~18s).
npx remotion render src/index.tsx Launch launch.mp4

echo "Done: $(pwd)/launch.mp4"
