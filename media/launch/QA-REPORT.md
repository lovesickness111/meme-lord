# QA Report — launch.mp4 (X launch video)

**Reviewed:** 2026-07-21 · deterministic re-render from `render.sh` (mp4 is gitignored, not committed)
**Method:** ffprobe stream/format inspection; ffmpeg frame dump at 2 fps (36 frames, 1080x1080); visual review of ≥3 representative frames per scene (start/mid/end); audio RMS analysis via `astats`.

## Overall verdict

**NOT ready to ship.** Rendering pipeline works (18.05s, 1080x1080, 30fps, h264) and most scenes are legible, but there are two blocking defects — the outro URL overflows the frame and is unreadable, and "CLI" text is clipped in two meme assets — plus the video is essentially a static slideshow with a silent audio track.

## Technical facts

| Property | Value |
| --- | --- |
| Container / video | mp4, h264, 1080x1080, 30 fps, 18.048 s (540 frames) |
| Audio | AAC stereo track present, **completely silent** (Overall RMS level = -inf on every window) — placeholder confirmed |
| File size | ~2.2 MB |

## Per-scene review

### 1. title (0–2.5s, fade)
- ✅ "meme-maker" + subtitle centered, readable, good contrast.
- ⚠️ Fade-in only reaches full opacity ~0.4s in; text sits at low contrast for the first frames (f001 is noticeably dim).
- ⚠️ After the 0.4s fade the card is fully static for 2s. Large empty space above/below the two lines.
- ⚠️ No fade-out — hard cut into scene 2.

### 2. drake (2.5–5s, slide-left)
- ✅ Image well sized (~850px), captions readable ("one JSON spec in, pixels out").
- ⚠️ Slide-in lasts only 10 frames (0.33s); at f006 (0.25s into scene) it already appears settled. Remaining ~2.2s is a static freeze-frame.
- ⚠️ Right panel text "A CLI FOR AGENTS" nearly touches the right edge of the white panel — tight but not clipped.

### 3. expanding-brain (5–8s, slide-left)
- ❌ **Text clipped in the asset**: panel 3 reads "A DETERMINISTIC / CL|" — the "I" of "CLI" is cut off at the panel edge. This is baked into `assets/scene3-expanding-brain.png` (repo CLI text engine), not a Remotion issue.
- ⚠️ Tall 3:4 image leaves large black columns left/right (~280px each side).
- ⚠️ Static after slide-in; 3s is the longest scene and nothing moves.

### 4. two-buttons (8–10.5s, slide-left)
- ❌ **Text clipped in the asset**: left button reads "CL|" — the "I" of "CLI" is cut off at the button-paper edge (`assets/scene4-two-buttons.png`). Since the whole scene contrasts CLI vs MCP server, this clip undermines the joke.
- ✅ Bottom caption "CLI · MCP · HTTP · Web UI — one engine" readable and centered.
- ⚠️ Bottom text "WHY NOT BOTH? (+ HTTP API + WEB UI)" spans the full panel width, edge-to-edge — tight.

### 5. always-has-been (10.5–13s, slide-left)
- ✅ Best-composed scene: wide 16:9 image fills the width, both overlays readable, caption clear.
- ⚠️ Large black bands above/below the wide image (~260px each) with no content.
- ⚠️ Static after slide-in.

### 6. success-kid (13–15.5s, slide-left)
- ⚠️ Square source asset renders at only ~500x500 in the 1080 frame — the meme occupies <25% of the canvas, surrounded by dead black space on all sides. Weakest visual of the video.
- ✅ Text in the meme and caption are readable.

### 7. outro (15.5–18s, fade)
- ❌ **BLOCKER — title overflows the frame.** "github.com/kartikkabadi/meme-maker" at fixed 96px Arial Black is far wider than 1080px: it renders as "ub.com/kartikkabadi/me" wrapped to "ker", clipped on both left and right edges. The CTA — the single most important frame of a launch video — is unreadable and looks broken.
- ✅ Subtitle "npm i · MCP-ready · MIT" is fine.
- ⚠️ Same dim fade-in as scene 1; video ends on a hard stop with no fade-out.

## Transitions & motion

- Scene changes are hard cuts: each `Sequence` starts abruptly and only the incoming scene animates (10-frame slide/fade). There is no exit animation and no cross-fade/overlap, so every boundary pops.
- Within scenes, all motion completes in the first 0.33s; ~90% of the runtime is frozen frames. The video reads as a slideshow, not a video.

## Actionable fix list (for the next agent)

Ordered by priority:

1. **Fix outro title overflow (blocker)** — in `src/index.tsx` `TitleCard`, either auto-fit font size to width (measure or clamp), drop to ~52–60px for the URL, allow word-wrap with `maxWidth: WIDTH - 120`, or split into two intentional lines ("github.com/" / "kartikkabadi/meme-maker"). Verify the full URL fits with margins.
2. **Fix "CLI" clipping in assets (blocker)** — re-render `scene3-expanding-brain.png` and `scene4-two-buttons.png` via `render-assets.sh` with shorter text, smaller font, or wider slot padding so "CLI" is never truncated to "CL". Root cause is the repo text engine's fit within those template slots.
3. **Add continuous motion** — give every scene a slow Ken Burns (scale 1.0→1.06 or subtle translate) across its full duration so nothing is a freeze-frame. Animate the caption in separately (e.g. 5-frame delayed fade/slide-up).
4. **Add exit transitions / cross-fades** — fade or slide the outgoing scene out over ~8 frames (overlap sequences or add an exit interpolation in the last frames of each scene), and add a final fade-to-black on the outro.
5. **Fix success-kid dead space** — scale the square asset up (maxHeight can afford ~800px) or add a blurred/duplicated background fill behind small assets so no scene is <50% content.
6. **Reduce letterboxing on brain / always-has-been scenes** — add a subtle background (blurred image echo, gradient, or brand color panel) behind non-square assets instead of flat black bars.
7. **Add music** — the AAC track is silent. Add an upbeat royalty-free track (~18s, with a hit on the outro) via Remotion `<Audio>`; keep the render deterministic by committing the audio file.
8. **Typography polish** — captions at 42px Arial are functional but generic; consider the repo's bundled Anton font for brand consistency, and add ~0.5 letter-spacing / subtle text-shadow for pop on bright frames.
9. **Timing** — with motion added, consider trimming drake/two-buttons to 2.0s and giving the outro 3.0s so the CTA has more dwell time.
