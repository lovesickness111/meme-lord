# Launch Video v2 — Visual Critique

Source: `launch-v2.mp4` (release v0.3.1) — 1080x1080, 30fps, 28.1s.
Method: frame extraction at 1fps + 2fps (`ffmpeg`), full-res inspection of key frames.

---

## Issues

### 1. [BLOCKER] Scene 3 → 4 crossfade produces unreadable text-on-text mush
At ~10.2–10.7s the transition is a full-frame cross-dissolve: the incoming headline
"ONE ENGINE. FOUR SURFACES." renders directly on top of the outgoing JSON panel and
Drake card. For ~15 frames both scenes are simultaneously legible-but-not, which reads
as a rendering glitch, not a transition. The other cuts in the video are hard cuts or
fades-through-dark, so this one transition is also inconsistent with the rest.
**Fix:** fade scene 3 fully to background (or slide it out) before scene 4's text
enters; alternatively use a hard cut like the other scene changes. Never dissolve two
text layouts over each other.

### 2. [BLOCKER] HUD scene counter desyncs from scene content during the same transition
While scene 4's headline is already on screen (~10.4s), the top-right HUD still reads
`03 / 08`. It only flips to `04 / 08` after the new content is visible. This breaks the
"instrumented HUD" conceit — the chrome should never lag the content.
**Fix:** switch the counter on the first frame of the incoming scene (tie it to the
scene's sequence `from`, not to the end of the transition).

### 3. [MAJOR] Scene 5 astronaut meme card is too dark and blends into the background
The "Always Has Been" panel is a near-black source image on a near-black background at
~14–16s. The card edges dissolve into the backdrop, and the setup caption
"WAIT, IT'S ALL JUST ONE JSON SPEC?" is small, dim, and hard to read even at 1080px.
Every other meme card (Drake, Two Buttons, Success Kid) pops off the background; this
one doesn't.
**Fix:** add a visible card backing (the light rounded frame used elsewhere) or a 1–2px
light stroke + stronger drop shadow, and scale the card up ~15–20% so the top caption
is legible.

### 4. [MAJOR] Scene 7 gallery cards have inconsistent framing and letterboxing
In "RENDERED BY MEME-MAKER ITSELF" (~19–23s), three of the six thumbnails (Expanding
Brain, Always Has Been, Change My Mind) sit inside dark letterbox margins within their
card containers, while the others (Drake, Two Buttons, Success Kid) fill their cards
edge-to-edge. Mixed inner padding + mixed effective corner radii makes the grid read as
six screenshots pasted at different sizes rather than a designed gallery. The grid is
also top-heavy: noticeable dead band between the headline and the first row, and again
below the second row.
**Fix:** normalize all six thumbnails to the same card treatment — same aspect
container, cover-fit (crop) instead of contain-fit, same corner radius and shadow —
and tighten vertical spacing so the grid is optically centered between headline and
footer.

### 5. [MAJOR] Static dead time: title card and end card both freeze
- Scene 2 ("MEME-MAKER / deterministic memes for agents") holds completely static for
  ~3s (~3–6s).
- The end card is fully static for ~4.5s (~23.5–28.1s) — over 15% of the runtime is a
  freeze frame.
For a motion-graphics piece, any hold longer than ~1.5s with zero movement reads as an
encoding stall.
**Fix:** add slow drift (2–3% scale-up), letter-tracking animation, or a subtle shimmer
on the wordmark; trim the end-card hold to ~3s.

### 6. [MINOR] Scene 1 typewriter reflows mid-word
During the typing animation the line wraps while a word is mid-type (frame ~1s shows
`your agent can write code, f` before "file" jumps to line 2), causing a visible layout
pop.
**Fix:** pre-compute the final line breaks and type into fixed lines.

### 7. [MINOR] Install command wraps mid-URL on the end card
The curl one-liner breaks after `raw.githubusercontent.com/`, splitting the URL across
two lines with the second line not aligned under the command start. Functional, but
scruffy for the single most screenshot-able frame of the video.
**Fix:** drop the font size 2–3pt to fit one line, or break before `https://` with a
hanging indent.

### 8. [MINOR] Background reads flat — no perceptible grain or texture
The backdrop is a clean near-black with a faint vignette but no visible film grain or
noise at 1080p. Combined with the perfectly flat panel fills, large areas (scene 1
lower half, scene 6 lower half) look sterile/empty.
**Fix:** add a low-opacity (3–5%) animated grain layer and slightly stronger vignette;
this would also mask banding in the dark gradients.

---

## What works (verified, not padding)
- HUD chrome (corner brackets, `meme-maker` header, repo footer, running timecode) is
  consistent across all 8 scenes and sells the "instrument" framing.
- Color palette is disciplined: near-black + off-white + single yellow accent, applied
  consistently to headlines, bullets, and code strings.
- Meme cards in scenes 3, 4, 6 have consistent rounded corners, tilt, and shadow — the
  card language is right where it's applied (scene 5 and the gallery are the outliers).
- JSON → arrow → rendered-meme composition in scene 3 communicates the product in one
  glance.

## Top priority order
1. Replace the scene 3→4 cross-dissolve (issue 1) and fix the HUD counter sync (2).
2. Re-frame the scene 5 astronaut card (3).
3. Normalize the scene 7 gallery cards (4).
4. Kill the static holds (5).
