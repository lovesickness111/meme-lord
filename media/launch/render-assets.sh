#!/usr/bin/env bash
# Re-renders the static meme frames used by the launch video via the repo CLI.
# Scenes with text that would auto-fit too close to a template slot edge use
# explicit MemeSpec files (specs/*.json) with fixed font sizes.
set -euo pipefail
cd "$(dirname "$0")"
CLI="node ../../dist/cli.js"
mkdir -p assets

$CLI render --template drake --force \
  --text-file specs/scene2-drake.json \
  -o assets/scene2-drake.png

$CLI render --template expanding-brain --force \
  --text-file specs/scene3-expanding-brain.json \
  -o assets/scene3-expanding-brain.png

$CLI render --template two-buttons --force \
  --text-file specs/scene4-two-buttons.json \
  -o assets/scene4-two-buttons.png

$CLI render --template always-has-been --force \
  --text-file specs/scene5-always-has-been.json \
  -o assets/scene5-always-has-been.png

$CLI render --template success-kid --force \
  --text top="609 TEMPLATES" --text bottom="ZERO CLOUD" \
  -o assets/scene6-success-kid.png

$CLI render --template change-my-mind --force \
  --text-file specs/scene7-change-my-mind.json \
  -o assets/scene7-change-my-mind.png

# Proof-grid tiles (v3): unique templates with 1-2 large captions each.
$CLI render --template this-is-fine --force \
  --text top="THE MEMES BUILD THEMSELVES NOW" \
  -o assets/proof-this-is-fine.png

$CLI render --template disaster-girl --force \
  --text top="DELETED THE DESIGN TOOLS" --text bottom="MEMES STILL SHIP" \
  -o assets/proof-disaster-girl.png

$CLI render --template characters-futurama-fry --force \
  --text top="NOT SURE IF HANDMADE" --text bottom="OR RENDERED BY AN AGENT" \
  -o assets/proof-futurama-fry.png

$CLI render --template buff-doge-vs-cheems --force \
  --text buff="ONE JSON SPEC" --text cheems="40 gui clicks" \
  -o assets/proof-buff-doge.png

$CLI render --template tuxedo-winnie-the-pooh --force \
  --text plain="making memes" --text fancy="rendering MemeSpecs" \
  -o assets/proof-tuxedo-pooh.png
