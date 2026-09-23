# Examples

Ready-to-render [MemeSpec](../DESIGN.md) files covering every base kind. Render any of them with:

```sh
meme spec render examples/<name>.json        # or: node dist/cli.js spec render ...
```

| File | Base kind | Demonstrates |
|------|-----------|--------------|
| [`drake.json`](drake.json) | `template` | Two-panel choice template, named slots |
| [`always-has-been.json`](always-has-been.json) | `template` | Two-slot reaction template |
| [`distracted-boyfriend.json`](distracted-boyfriend.json) | `template` | Three-slot labeling template |
| [`grus-plan.json`](grus-plan.json) | `template` | Multi-panel (4-step) template |
| [`mind-blown.json`](mind-blown.json) | `template` | Animated GIF template |
| [`gif-pack-frames.json`](gif-pack-frames.json) | `template` | Pack-prefixed GIF id + per-box `frames` range |
| [`image-base.json`](image-base.json) | `image` | Captioning your own image with free-form boxes (expects `photo.jpg` in cwd) |
| [`canvas-styled.json`](canvas-styled.json) | `canvas` | Blank canvas + text styling (color, stroke, italics, rotation, opacity) |
| [`layout-2x2.json`](layout-2x2.json) | `layout` | 2x2 grid composition (expects `a.jpg`..`d.jpg` in cwd) |

## Render everything

`render-all.mjs` renders every spec in this directory into a temp dir (generating
placeholder input images where needed) and verifies each output file exists:

```sh
npm run build
node examples/render-all.mjs
```

## Equivalent CLI one-liners

Most template specs map directly to `meme render`:

```sh
# two-panel choice
meme render --template drake --text no="MANUAL MEME EDITORS" --text yes="A CLI FOR AGENTS" -o drake.png

# multi-panel plan-backfires
meme render --template grus-plan \
  --text step1="SHIP THE FEATURE" --text step2="SKIP THE TESTS" \
  --text step3="PROD IS DOWN" --text step4="PROD IS DOWN" -o plan.png

# comparison
meme render --template buff-doge-vs-cheems --text buff="DEVS IN 1999" --text cheems="DEVS NOW" -o doge.png

# reaction
meme render --template hide-the-pain-harold --text top="CI IS GREEN" --text bottom="AFTER FORCE-PUSHING" -o harold.png

# animated GIF
meme render --template mind-blown --text top="AGENTS MAKING MEMES" -o mind-blown.gif
```

## Discovering templates

```sh
meme templates list --json          # full catalog (including packs)
meme templates show drake --json    # slots, rects, hints for one template
```

Want to add your own templates? See [docs/TEMPLATES.md](../docs/TEMPLATES.md).
