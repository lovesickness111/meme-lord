# CRITIQUE-VISUAL.md — Frame-by-Frame Visual Critique of launch.mp4 (v0.3.1)

Reviewed: 2026-07-21. Source: `https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch.mp4`
Specs: 1080x1080 @ 30fps, 27.0s, H.264 High, **1.39 Mbps video bitrate**, AAC audio (peak -6.0 dB, mean -25.4 dB).
Method: 1 fps full-res frame extraction (27 frames) + ffprobe/volumedetect audio analysis.

---

## Top issues (summary)

1. **[BLOCKER] Scene 07 (~21–23s) is a visual pile-up / z-order bug.** The "MEME MAKER" title renders semi-transparent *directly on top of* the montage cards, while a ghost terminal bar containing only a lone `$` overlaps the second row of dimmed cards. Three layers collide; it reads as a broken render, not a designed transition.
2. **[BLOCKER] Brand inconsistency: "MEME MAKER" vs "MEME-MAKER".** Scene 07's overlay title drops the hyphen; scenes 02 and 08 use "MEME-MAKER". One brand string, everywhere.
3. **[MAJOR] Meme-card caption text is clipped/garbled at card edges.** Drake card reads "A CL~ FOR AGENTS" (the "I" of CLI falls into the fold/edge), the two-buttons card's "CLI" button reads "CL~", and montage cards show cut-off captions ("S ALL JUST ONE JSON SPEC?", "ALWAYS HA…"). For a product whose whole pitch is *deterministic, correct text rendering*, clipped captions undermine the message.
4. **[MAJOR] JSON typing animation overflows its terminal card (Scene 03).** Mid-typing (~7s) the line `"text": "manual editor` runs unwrapped and un-closed, and the finished state (~9s) has `"manual editors" }` and `"a CLI for agents"` kissing/clipping the right edge of the code window. Also ~3s of dead right half before the meme pops in.
5. **[MAJOR] It reads as a slideshow.** Scenes 04, 05, 06 are static two-column holds with identical composition (headline left, single tilted card right) joined by plain cuts/fades. The only real motion in the middle third is the 508→609 counter tick. No camera drift, no card parallax, no per-scene entrance choreography.

---

## Detailed findings by scene

### Global / systemic

- **[MAJOR] Bitrate too low for 1080x1080 motion graphics.** 1.39 Mbps produces visible macroblocking on gradients and shimmer on the CRT-scanline texture over meme cards. Fix: render at CRF 18 or ~6–8 Mbps for the X upload master; X re-encodes anyway, so feed it a clean master.
- **[MAJOR] The CRT scanline/grain overlay is applied *on top of the meme cards themselves*,** which muddies small white impact-font captions and contributes to the "clipped/garbled" reading of card text. Fix: apply grain/scanlines to the background layer only; keep cards clean above the texture pass.
- **[MINOR] Background is nearly featureless.** The dark navy/charcoal field with faint vignette is fine, but there's no subtle texture drift or gradient motion, which amplifies the slideshow feel. A slow-moving radial glow or 2–3% noise drift would help.
- **[MINOR] HUD is well-executed and consistent** (corner brackets, `meme-maker` top-left, `01/08` counter, repo slug + timecode bottom) — genuinely the most professional element. Two nits: the timecode format `00:00.46` (frames? centiseconds?) is ambiguous, and the HUD never reacts to anything (a scene-change tick/flicker would sell the "recording" conceit).
- **[MINOR] Audio mix is quiet and flat.** Peak -6 dB, mean -25.4 dB with no perceptible hits on scene changes. Master to ~-14 LUFS for social; add soft whoosh/tick accents synced to cuts.

### Scene 01 — hook (0–3s)
- **[MINOR]** First ~1s shows only the faint grey "your agent can" line on black — nearly invisible at feed brightness; the hook reads slowly. Tighten the line-1 fade-in.
- **[MINOR]** Grey mono line vs. yellow Anton "BUT IT CAN'T SHITPOST." is a good contrast beat, but the block sits slightly high; the composition is bottom-heavy with dead space below.

### Scene 02 — title card (3–6s)
- Good: strong Anton lockup, clean tagline. **[MINOR]** Tagline fades from dull olive to full yellow across ~2s — the mid-fade frame looks like a mistake (muddy gold). Snap it in faster.

### Scene 03 — JSON → meme (6–10s)
- **[MAJOR]** See top issue 4: typing overflow + right-edge clipping inside the terminal card.
- **[MAJOR]** The right half of the frame is empty for ~60% of the scene, then the Drake card pops in with a small arrow. Reveal the output card progressively (e.g. wipe/scale-in as the last brace types) to fill the dead space and dramatize input→output.
- **[MINOR]** The yellow arrow between card and meme is tiny and low-contrast — either animate it or drop it.

### Scene 04 — one engine, four surfaces (10–14s)
- **[MINOR]** Bullet list styling is inconsistent: `CLI` has no leading `·` while `MCP`, `HTTP`, `WEB UI` do. Align all four.
- **[MINOR]** "FOUR SURFACES" text lists 4 items but the meme shows only 2 buttons (CLI / MCP SERVER) — a mild message mismatch; acceptable as a joke, but the button text "CL~" clipping (top issue 3) must be fixed.

### Scene 05 — same spec, same pixels (14–17s)
- **[MINOR]** Composition is a near-copy of Scene 04 (headline+bullets left, tilted card right) — vary the layout or the card motion.
- **[MINOR]** The "Always Has Been" card is small and its caption "WAIT, IT'S ALL JUST ONE JSON SPEC?" is at the edge of legibility under the scanline texture at 1.4 Mbps.

### Scene 06 — 609 templates (17–20s)
- Good: the 508→609 counter tick is the best motion beat in the video.
- **[MINOR]** Dead space below the headline block; card is static while the number animates — let the card swap templates during the count for a much stronger beat.

### Scene 07 — montage (20–23s) — the weakest scene
- **[BLOCKER]** See top issues 1–2: title-over-cards collision, ghost `$` terminal bar, hyphen-less "MEME MAKER".
- **[MAJOR]** The grid is unbalanced at ~20.5s: 3 cards on top row + 1 lone card bottom-left with a huge empty area — it looks like assets failed to load before the remaining cards appear.
- **[MAJOR]** Montage cards are dimmed to near-illegibility behind the overlay in the second phase; either keep them bright behind a solid title plate or blur them properly. The current 50%-dim + sharp text = accidental-looking.
- **[MINOR]** "RENDERED BY MEME-MAKER ITSELF" (yellow, bottom) is the best line in the video — give it its own clean beat instead of sharing the frame with the collision above.

### Scene 08 — CTA / end card (23–27s)
- **[MINOR]** The install command wraps mid-URL (`raw.githubusercontent.com/` / `kartikkabadi/...`) — acceptable, but the typing cursor sits *on top of* the final `sh` at ~25s before settling. End the type-on with the cursor after the command, then blink.
- **[MINOR]** The video ends on a hard cut at 27.0s with no fade or logo settle; audio duration (27.05s) slightly exceeds video, risking a click on some players. Add a 0.5s fade-out on both.

---

## Concrete fix list (priority order)

1. Scene 07: rebuild the transition — cross-fade montage OUT fully *before* the title enters, or place the title on a solid/blurred plate; remove the stray `$` terminal bar; restore the hyphen ("MEME-MAKER").
2. Add safe-area padding (≥6% card width) on all meme-card captions; verify no caption glyph touches a card edge in any frame.
3. Fix Scene 03 typing: wrap long values, keep 2ch right padding inside the terminal card, and reveal the output meme progressively.
4. Move the grain/scanline pass behind the cards; re-render at CRF 18 / 6–8 Mbps.
5. Add motion glue: 200–300ms card entrance (scale 0.96→1 + fade) per scene, slow background glow drift, and audio ticks on cuts — this alone converts slideshow → produced piece.
6. Normalize bullet styling (Scene 04), speed up tagline fade (Scene 02), brighten line 1 (Scene 01), add end fade-out (Scene 08).
