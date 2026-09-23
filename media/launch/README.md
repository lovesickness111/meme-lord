# meme-maker launch video

Scaffolding for the ~18-second, 1080x1080 X launch video, composed entirely of
memes rendered by this repo's own CLI.

## Toolchain decision

| Tool | Result on Node 20.18.1 |
| --- | --- |
| **hyperframes** | Rejected — hard runtime check: `HyperFrames requires Node.js >= 22 (current: 20.18.1)` (`engines: { node: ">=22" }`). |
| **Remotion 4.0.495** | **Chosen** — installs and renders on Node 20 without issues; a 1s 1080x1080 test rendered in ~30s using the system Chrome. |
| ffmpeg/sharp pipeline | Kept as documented fallback (ffmpeg 4.4.2 is available) but not needed. |

## Layout

- `storyboard.json` — 7 scenes (id, duration, template, image, text overlays, transition). Single source of truth; the Remotion composition reads it directly.
- `assets/` — static meme frames rendered deterministically by `node ../../dist/cli.js render ...` (see `render-assets.sh`).
- `src/index.tsx` — Remotion composition (`Launch`, 1080x1080 @ 30fps): dark title/outro cards, slide/fade transitions, per-scene captions.
- `remotion.config.ts` — points Remotion's public dir at `assets/`.
- `render-assets.sh` — re-renders all static frames from the repo CLI.
- `render.sh` — end-to-end: assets → npm install (local to this dir) → MP4.

## Storyboard (18s total)

1. **title** (2.5s, fade) — "meme-maker / deterministic memes for agents"
2. **drake** (2.5s, slide) — manual editors vs. a CLI for agents
3. **expanding-brain** (3s, slide) — evolve your meme pipeline up to MCP agents
4. **two-buttons** (2.5s, slide) — CLI vs MCP: why not both (+ HTTP + UI)
5. **always-has-been** (2.5s, slide) — it's all one JSON spec
6. **success-kid** (2.5s, slide) — 609 templates, zero cloud
7. **outro** (2.5s, fade) — repo URL CTA

## Re-render

```sh
# from the repo root (dist/ must exist: npm run build)
cd media/launch && ./render.sh
```

Output: `media/launch/launch.mp4`. Do not commit the MP4 (git-ignored).

For a 1080x1920 vertical variant, change `format.width/height` in
`storyboard.json` — the composition reads dimensions from there.
