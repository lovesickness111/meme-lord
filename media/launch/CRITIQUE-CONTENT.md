# Launch Video Critique — Content Pass (v0.3.1 `launch.mp4`)

Reviewed frame-by-frame (2 fps extraction, 54 frames) against the release asset
`https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch.mp4`.

**Video facts:** 1080x1080, 30fps, 27.0s, h264 + AAC audio (mean −25.4 dB, max −6.0 dB). 8 scenes per the HUD counter, matching `storyboard.json`.

---

## Verdict

The messaging is accurate (install command matches README, no npm/npx anywhere, 609-template claim matches `manifest.json`), the scene order is logical (hook → reveal → demo → surfaces → determinism → scale → proof → CTA), and the terminal-HUD aesthetic is consistent. But the video loses points where it matters most: the first second is nearly blank, and the final CTA — the one thing a viewer must be able to act on — fades out while it's still the only actionable content on screen. Several meme payloads are too small or clipped to read, which undercuts the "proof it works" argument.

---

## Issues

### 1. [BLOCKER] Final CTA dims/fades while it's still the payoff
At ~00:24.7 the install command is bright and legible. By ~00:26.7 (the closing frames) the entire command has faded to low-contrast gray while the GitHub URL fades in below. The last frame a viewer sees — the frame that persists as the "end card" — has the single actionable line at its *least* readable. On X, the final frame is also the frozen preview after playback.
**Fix:** Keep the install command at full brightness through the end; fade in the GitHub URL *in addition*, not as a replacement. Hold the final composed end card (title + command + URL, all at full opacity) for the last 2.5–3s.

### 2. [MAJOR] Weak first ~1.5 seconds (autoplay hook)
Frame at 00:00.2 shows only the word "your" with a cursor on a near-black screen; the body line finishes typing around 00:01.2 and the punchline ("BUT IT CAN'T SHITPOST.") lands ~00:01.7. On muted autoplay in a feed, ~1.5s of near-empty dark screen is an easy scroll-past. The typewriter effect is on the *least* interesting line.
**Fix:** Cut the body line's typewriter time in half (or show it instantly) and spend the animation budget on the yellow punchline (e.g. hard slam-in at ~00:00.8). Alternatively open with the punchline and let the setup line appear beneath it.

### 3. [MAJOR] Scene 7 montage crops the memes it's showing off
"RENDERED BY MEME-MAKER ITSELF" (00:20–00:22) is the credibility scene, but the six meme cards are cropped at their edges: the astronaut meme reads "…S ALL JUST ONE JSON SPEC?" and "ALWAYS HA…" (caption cut mid-word), the two-buttons card loses its top-right button label, and both expanding-brain cards have illegible top-panel text. Showing visibly clipped output invites the exact opposite conclusion ("the tool crops text").
**Fix:** Shrink each card ~10–15% so full meme bounds (including captions) fit inside the card, or letterbox each meme within its card instead of cover-cropping.

### 4. [MAJOR] Scene 5 meme is too small to read
"SAME SPEC. SAME PIXELS." (00:14–00:17) pairs a strong claim with an astronaut meme whose captions ("WAIT, IT'S ALL JUST ONE JSON SPEC?" / "ALWAYS HAS BEEN") are illegible at the rendered size — and "ALWAYS HAS BEEN" is additionally clipped at the card's right edge. A meme you can't read is dead weight.
**Fix:** Render the meme card ~1.5× larger (it has room — the left text block only uses half the canvas), and fix the right-edge clip.

### 5. [MAJOR] Scene 3 JSON appears syntactically clipped
In the finished JSON pane (00:08–00:10), the first slot object closes with `}` but the second line ends flush at `"a CLI for agents"` with no visible closing `}` before the `]` — either the brace is cropped by the pane edge or missing. For a product whose whole pitch is "one JSON spec in," showing (apparently) invalid JSON is a self-own that spec-literate viewers will catch.
**Fix:** Widen the code pane or shorten the string so `" }` is visibly present on the second slot line.

### 6. [MINOR] Scene 4 two-buttons meme label cropped
The left button reads "CL…" (the "I" is cut by the button edge / crop). Same class of problem as #3.
**Fix:** Same treatment — fit full meme bounds in the card.

### 7. [MINOR] Scene 2 holds a static frame for ~3s
The MEME-MAKER title card (00:03.7–00:06.7) is completely static between frames. In a 27s video that's 11% dead air.
**Fix:** Trim to ~2s, or add a subtle motion beat (tagline typewriter, HUD counter tick).

### 8. [MINOR] "SHITPOST" in the opening 2 seconds
It fits the meme-tool voice and is likely intentional, but note it constrains where the video can be reposted (some corporate/dev-rel accounts won't quote it) and may affect ad eligibility if ever boosted.
**Fix:** Only if broader distribution matters: an alternate cut with "MEME." as the punchline.

### 9. [MINOR] Two-line curl command is not realistically transcribable
The full raw.githubusercontent.com URL wraps across two lines and is on screen bright for only ~2s. Nobody types a 70-char URL from a video; the effective CTA is the GitHub URL / repo name.
**Fix:** Emphasize `github.com/kartikkabadi/meme-maker` as the primary CTA line (largest, longest-held) and keep the curl line as supporting detail — combined with fix #1.

---

## What's working (keep)

- **Messaging accuracy:** install command exactly matches README line 51 (`curl -fsSL .../install.sh | sh`); no npm/npx anywhere; "609 templates" matches `assets/templates/manifest.json` (609 entries).
- **Scene order:** problem → name → demo → breadth → differentiator → scale → proof → CTA is the right arc.
- **HUD chrome:** the scene counter, repo slug, and timecode framing is distinctive and on-brand.
- **Audio levels:** −6 dB peak / −25 dB mean is safe for feed playback.

## Top priorities
1. Un-fade the final CTA (#1)
2. Fix meme cropping in scenes 3/4/5/7 (#3, #4, #5, #6)
3. Tighten the first 1.5s hook (#2)
