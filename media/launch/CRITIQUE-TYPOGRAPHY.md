# CRITIQUE-TYPOGRAPHY.md — launch.mp4 (v0.3.1) typography & readability audit

Source: https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch.mp4
Video: 1080x1080, 30fps, 27.05s, H.264 + AAC. Frames sampled at 2 fps (54 frames) plus 1 fps contact sheet.

Scope: font choices, text size, contrast, alignment, line breaks, kerning, code readability, headline hierarchy, clipping/overflow, final CTA readability.

---

## Issues

### 1. [BLOCKER] JSON in Scene 3 is invalid and visually clipped at the right edge (~00:08.7)
The code window shows:

```
{
  "template": "drake",
  "texts": [
    { "slot": "no",
      "text": "manual editors" }
    { "slot": "yes",
      "text": "a CLI for agents"
  ]
}
```

Two problems for a product whose entire pitch is "one JSON spec in":
- **Missing comma** between the two array objects (`}` then `{` with no `,`) — the on-screen spec is not valid JSON.
- The `"a CLI for agents"` line **runs to the very edge of the code panel and its closing `}` is cut off / never shown**. It reads as clipped/overflowing text.

Fix: shorten strings (e.g. `"manual"` / `"CLI"`) or reduce font size ~10% so every line fits with padding, and render syntactically valid JSON (add the comma, show the closing `}`). This is the one frame technical viewers will screenshot — it must be correct.

### 2. [BLOCKER] Meme captions clipped in the Scene 7 grid (~00:20.7)
In the "RENDERED BY MEME-MAKER ITSELF" 2x3 grid, the astronaut meme (bottom-left) is cropped: top caption reads "…S ALL JUST ONE JSON SPEC?" and the bottom caption is cut mid-word ("ALWAYS HA…"). Cropped meme text in a video showcasing the renderer's text engine directly undermines the product claim.

Fix: use `object-fit: contain` (letterbox) for grid cells instead of cover-cropping, or pre-crop the grid thumbnails to safe regions where captions survive.

### 3. [MAJOR] "CLI" is nearly illegible in the Drake meme's Impact caption (Scenes 3 & 7)
"A CLI FOR AGENTS" renders with the `I` in "CLI" colliding with the `L` — at a glance it reads "A CL FOR AGENTS". Impact's narrow `I` plus tight tracking plus the white-fill/black-stroke style kills the most important word in the caption.

Fix: add letter-spacing to short all-caps acronyms, or rewrite the slot text to avoid "CLI" in Impact (e.g. "a cli for agents" lowercase, or "ONE COMMAND").

### 4. [MAJOR] Bullet list alignment is inconsistent in Scenes 4 and 5
Scene 4: `CLI` (no leading `·`, flush left) followed by `· MCP`, `· HTTP`, `· WEB UI` (indented with dots). Scene 5 repeats the pattern: `deterministic` unbulleted, then `· reproducible`, `· CI-friendly`. The first item's left edge does not align with the others' text, so the list looks broken rather than styled.

Fix: either give every item the `·` marker or none, and align all text baselines to one left edge. (If the first item is intentionally a "lead" item, differentiate it by weight/color, not indentation.)

### 5. [MAJOR] Final CTA fades out with the URL — the payoff is dimmed exactly when it matters (~00:26–27)
The `github.com/kartikkabadi/meme-maker` URL only appears in the last ~1.5s and the global fade-to-black starts almost immediately, so the last frame shows the headline, install command, and URL all at reduced opacity. Viewers who pause on the end card get a washed-out CTA; the yellow install command drops well below comfortable contrast against the near-black background during the fade.

Fix: hold the fully-opaque end card (headline + command + URL) for ≥2.5s and fade only the vignette/grain, or cut to black without dimming the text. Also consider showing the URL for the entire Scene 8, not just the tail.

### 6. [MINOR] Install command wraps mid-URL at an awkward point
`https://raw.githubusercontent.com/` / `kartikkabadi/meme-maker/main/install.sh | sh` breaks after `.com/`. Acceptable, but the second line starts flush with the panel edge while the first line starts after the `$` prompt, creating a ragged left edge inside the terminal card.

Fix: hang-indent continuation lines to align under `curl`, or use a shorter vanity path so the command fits one line at a slightly smaller size.

### 7. [MINOR] Scene 6 counter vs. meme card mismatch during the count-up
While the big yellow number is still counting (e.g. "583" at ~00:17.7), the meme card beside it already reads "609 TEMPLATES". The final state (609/609) is correct, but mid-animation the two numbers contradict each other on screen.

Fix: drive both numbers from the same count-up value, or hide/blur the meme card caption until the counter lands.

### 8. [MINOR] Cold open types a single lowercase word in the dead center (~00:01)
"your▮" alone at 1080px center for ~2s is a weak first frame for autoplaying muted feeds — a paused/preview frame shows almost nothing. The typing cursor block is also noticeably taller than the x-height of the mono text next to it.

Fix: start the typewriter sooner / faster so the preview frame contains a full clause, and size the cursor to the font's cap height.

### 9. [MINOR] Corner-frame HUD text is very low contrast
`meme-maker`, `01 / 08`, `kartikkabadi/meme-maker`, and the timecode run at roughly 35–40% grey on near-black. On phone screens in bright conditions the progress indicator (`01 / 08`) is effectively invisible.

Fix: bump HUD text to ~55–60% grey; it stays subordinate to content but survives compression and small screens.

### 10. [MINOR] Scanline/CRT texture slightly erodes thin mono strokes
The horizontal scanline overlay visibly bands through the grey mono body text (Scene 1 "your agent can write code…") and the dimmed end card, thinning strokes and adding shimmer after H.264 compression.

Fix: reduce scanline opacity over text layers, or mask the effect off text bounding boxes.

---

## What works well
- Strong three-tier hierarchy: Anton-style condensed display headlines (white), yellow accent numerals/kickers, grey mono body — consistent across all 8 scenes.
- The yellow #FFD400-ish accent on near-black has excellent contrast for headlines and the install command (pre-fade).
- Headline line breaks are deliberate and clean ("ONE ENGINE. / FOUR / SURFACES.", "SAME SPEC. / SAME PIXELS.").
- 1:1 aspect and centered composition are right for X feed autoplay.

## Top fixes in priority order
1. Fix the Scene 3 JSON (comma + clipped closing brace) — issue 1.
2. Un-crop the astronaut meme captions in the Scene 7 grid — issue 2.
3. Re-track/rewrite "CLI" in the Drake Impact caption — issue 3.
4. Align the bullet lists in Scenes 4/5 — issue 4.
5. Hold the end card at full opacity before fading — issue 5.
