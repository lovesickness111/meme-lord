# Launch Video v2 — Typography Critique

Frame-by-frame typography review of `launch-v2.mp4` (v0.3.1 release asset).
Source: 1080x1080, 30fps, 28.1s, 8 scenes. Frames extracted at 2fps and inspected
at full resolution plus zoomed crops.

Ratings: **[BLOCKER]** must fix · **[MAJOR]** hurts quality · **[MINOR]** polish.

---

## Issue 1 — [MAJOR] Scene 8 CTA: install command wraps mid-URL and nearly clips the pill edge

Frames ~00:24–00:28. The command

```
$ curl -fsSL https://raw.githubusercontent.com/
  kartikkabadi/meme-maker/main/install.sh | sh
```

- Line 1 ends with `githubusercontent.com/` almost touching the right edge of the
  code pill — right padding is ~10px vs ~70px on the left. It reads as clipped
  even though it isn't.
- The URL is broken across two lines with no continuation cue. A wrapped URL in
  the single most important frame of the video invites transcription errors.
- The `| sh` tail lands at the far right of line 2, easy to miss.

**Fix:** Shrink the mono font 15–20% so the whole command fits on one line, or
restructure the break deliberately (`curl -fsSL <url> \` newline `  | sh`) with a
trailing `\`. Equalize horizontal padding inside the pill. Better: ship a short
URL (e.g. GitHub Pages redirect) so the command is one clean line.

## Issue 2 — [MAJOR] Scene 7 grid: expanding-brain panel captions are illegible

Frames ~00:20–00:23 ("RENDERED BY MEME-MAKER ITSELF"). In the 3x2 montage, the
expanding-brain tile's four captions ("COPY-PASTING TEMPLATES", "…MEME EDITORS",
"A DETERMINISTIC CLI", "AGENTS RENDERING MEMES VIA MCP") are unreadable even at
full 1080px — at X feed size they are noise. Only "A DETERMINISTIC CLI" is
partially decipherable. The astronaut tile's "WAIT, IT'S ALL JUST ONE JSON SPEC?"
is likewise sub-legible at tile scale.

**Fix:** Either (a) zoom/pan across 2–3 tiles sequentially so each meme gets a
readable beat, or (b) swap the two densest memes (expanding brain, astronaut)
for templates with 1–2 large captions (success kid and change-my-mind read fine).
The scene's claim ("rendered by meme-maker itself") is undermined when the
renders can't be read.

## Issue 3 — [MAJOR] Scene 1 line break splits "file PRs" across lines

Frames ~00:01–00:03. The typed line wraps as:

```
your agent can write code, file
PRs, book flights.
```

"file / PRs" is broken mid-noun-phrase — on first read line 1 parses as
"…write code, file" (verb "file" dangling). Awkward for the opening hook.

**Fix:** Force the break after the comma: `your agent can write code,` /
`file PRs, book flights.` — or shorten the copy so it fits one line.

## Issue 4 — [MINOR] Scene 6 count-up: bare number with no context for ~1.5s

Frames ~00:15–00:17. During the count-up, a huge yellow "352…" sits alone,
left-anchored, with the right two-thirds of the frame empty (the success-kid
card and the "TEMPLATES. ZERO CLOUD." label only appear at 609). A viewer
scrubbing or joining mid-scene sees a context-free number.

**Fix:** Show the "TEMPLATES" label (dimmed is fine) from the first frame of the
count-up, and reserve the card slot with a placeholder so the composition isn't
lopsided during the count.

## Issue 5 — [MINOR] Footer/timestamp chrome contrast is below readability threshold

All scenes. `kartikkabadi/meme-maker` and the `00:xx.xx` timecode render in
dark gray (~#4a5058) on near-black (~#0d1117) — roughly 2.5:1 contrast. After
X's compression they will smear into the background.

**Fix:** Lift the chrome gray to ~#7d8590 (≥4.5:1), or drop the timecode
entirely — it adds no information.

## Issue 6 — [MINOR] Scene 3/8 headline color inconsistency in hierarchy

Headlines alternate between off-white ("ONE JSON SPEC IN. PIXELS OUT.",
"ONE ENGINE. FOUR SURFACES.", "SAME SPEC. SAME PIXELS.") and yellow
("RENDERED BY MEME-MAKER ITSELF"). Yellow is otherwise reserved for accent
copy (taglines, bullets, numbers, code). Scene 7's yellow headline breaks the
established hierarchy for no evident reason.

**Fix:** Keep all top-level headlines off-white; reserve yellow for accents.

---

## What works (verified, not padding)

- Anton headline face is consistent, well-tracked, no clipping or overflow
  detected in any headline across all 56 sampled frames.
- Scene 3 JSON code block: mono font, syntax coloring, and cursor block are
  crisp and readable; indentation is faithful.
- Scene 2 title card ("MEME-MAKER" + tagline) has strong hierarchy and correct
  optical centering.

## Top issues summary

1. [MAJOR] CTA install command wraps mid-URL, near-zero right padding (Scene 8)
2. [MAJOR] Expanding-brain / astronaut tile captions illegible in grid (Scene 7)
3. [MAJOR] "file / PRs" line break garbles the opening hook (Scene 1)
4. [MINOR] Bare count-up number lacks context and balance (Scene 6)
5. [MINOR] Footer chrome contrast too low; headline color hierarchy inconsistent
