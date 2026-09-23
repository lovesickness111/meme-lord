# CRITIQUE-V2-MOTION.md — Frame-by-Frame Motion Critique of `launch-v2.mp4` (v0.3.1)

Reviewed asset: https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch-v2.mp4
Video: 1080x1080, 30fps, 28.03s, H.264 + AAC stereo. Frames extracted at 2fps (56 frames) plus 6fps zooms around every transition, the count-up, the hook, the proof grid, and the ending. Audio analyzed with `volumedetect`, `loudnorm`, and per-second RMS via `astats`.

Observed scene map (from burned-in timecodes): hook 0–3.2s · reveal 3.2–5.7s · demo 5.8–10.5s · surfaces 10.7–13.1s · deterministic 13.2–15.9s · templates 16.0–19.0s · proof 19.0–22.4s · cta 22.6–28.0s.

## Verified fixes from v1 critique

Confirmed on-frame, not taken on faith:

- **v1 B1 fixed** — count-up now lands on 609 (~17.1s) *before* the success-kid card pops in (~17.3s). Payoff order is correct.
- **v1 B2 fixed** — CTA curl command completes typing by ~23.7s and holds fully readable at full opacity for ~4.3s. Readable at rest.
- **v1 B3 fixed** — single cursor throughout the JSON typewriter (checked at 6fps, 5.9–8.2s). No double-caret glitch.
- **v1 M1 fixed** — proof grid now has 6 distinct templates (drake, expanding-brain, two-buttons, always-has-been, success-kid, change-my-mind), no duplicates, captions no longer clipped at card edges, headline visible from scene start, stagger completes in ~0.6s.
- **v1 P2 fixed** — cursor disappears after the JSON completes (no parked cursor 8.2–10.5s).
- **v1 M3 partially fixed** — bullets in scenes 4/5 now stagger in one at a time instead of ghost-fading all at once.

---

## [BLOCKER] Issues — must fix before shipping

### B1. Music does not start until ~4s — the hook plays in near-silence
- **Where:** 0–4s (hook scene + first second of reveal).
- **What:** Per-second RMS: 0s = -40.0 dB, 1s = -40.6 dB, 2s = -30.6 dB, 3s = -37.9 dB, then 4s onward a constant ~-17.5 dB. The entire hook — the one scene that must grab a muted-autoplay-then-unmuted X viewer — has effectively no music, and the track then pops in abruptly mid-reveal, unrelated to any cut. It reads as a broken audio export, not a creative choice.
- **Fix:** Start the music at frame 0 (or ≤0.2s in). If a quiet intro is intentional, use an audible low-level intro/riser that builds through the hook and hits on the 3.2s cut to the reveal — silence-then-pop at an arbitrary mid-scene moment is the worst of both.

### B2. Audio dies ~1s before the video ends — the CTA ends in silence on a freeze frame
- **Where:** 27–28s.
- **What:** RMS drops to -39.6 dB at 27s and -120 dB (digital silence) by 28s, while the picture holds the CTA at full opacity with no fade. The video just stops: silent, static, no ending button. Last impressions matter as much as the hook.
- **Fix:** Either (a) end the music with a clean resolution/hit exactly on the final frame, or (b) fade audio and picture out together over the last 0.5s. Never let audio end before picture.

---

## [MAJOR] Issues — hurt perceived quality

### M1. Music is still a flat bed with zero sync to picture (carried over from v1 M2)
- **Where:** 4–27s.
- **What:** Measured LRA is 2.6 LU and per-second RMS is pinned at -17.4 to -18.8 dB for 23 straight seconds. No accent on any of the 7 transitions, no hit on the 609 landing (~17.1s), no build into the CTA. Integrated loudness is -15.9 LUFS — still ~2 dB under the ~-14 LUFS social-feed norm, so it will sound quiet next to adjacent content on X.
- **Fix:** Master to ~-14 LUFS (true peak ≤ -1 dBTP). Add a stinger/drum hit on the 609 landing and on the hook punchline, and snap the hook→reveal and templates→proof cuts to beats. Even nudging scene boundaries ±3 frames to the track's grid would transform the feel.

### M2. ~8 seconds of dead freeze-frames spread across four scenes
- **Where:** reveal 3.4–5.7s (~2.3s static), demo 8.0–10.5s (~2.5s static after the JSON completes), surfaces 11.4–13.0s (~1.6s static), deterministic 14.3–15.8s (~1.5s static).
- **What:** In each case every element finishes animating and then nothing — no drift, no settle, no idle motion — for 1.5–2.5s. Combined that's ~28% of the runtime as literal freeze frames. The reveal is the worst: the MEME-MAKER logotype pops by 3.4s and is then a still image for 2.3s.
- **Fix:** Add persistent low-amplitude life: 1–2% slow scale drift (Ken Burns) on meme cards, a subtle shimmer or tracking-in on the logotype, cursor blink in held terminals. Alternatively trim reveal to 1.8s and demo's tail by 1s, donating time to the hook hold and proof grid.

### M3. Hook punchline still lands with no emphasis (carried over from v1 M4)
- **Where:** 0.9–1.1s.
- **What:** Checked at 6fps: "BUT IT CAN'T SHITPOST." fades in at constant size over ~0.2s — no scale snap, no overshoot, and (per B1) no audio at all under it. The best line in the script gets the flattest treatment, then sits static for ~2.1s before the cut.
- **Fix:** Snap-in at scale 1.12→1.0 with ease-out-back over ~150ms, paired with a music accent (see B1/M1). The long hold after is fine once the entrance has punch.

---

## [MINOR] Polish items

- **P1. Crossfade text-over-text ghosting at 13.0–13.2s.** "ONE ENGINE. FOUR SURFACES." ghost is legible underneath the incoming "SAME SPEC. SAME PIXELS." at the same screen position for ~0.2s. Muddy. Fade the outgoing text fully before the incoming text passes ~40% opacity, or offset their positions.
- **P2. Count-up opens as a bare context-free number.** At 16.0–16.2s the frame shows only "201"/"352" with no label; "TEMPLATES. ZERO CLOUD." fades in mid-count (~460). Show the label from the first counter frame, or hold it back until the 609 landing as a one-two reveal — the current halfway fade-in is neither.
- **P3. No landing pop on 609.** The counter reaches 609 at constant scale; the final tick of a count-up wants a small pop (1.0→1.08→1.0, ~120ms) ideally with an audio hit (M1).
- **P4. Proof grid composition is bottom-heavy.** ~180px of empty dark space between the headline and the grid (frame at 21.5s); grid center of mass sits low. Center the grid block vertically between headline and footer. Also, the expanding-brain card's four caption lines are illegible at grid scale — a bolder 2-panel or single-caption template would read better in a 3x2 grid.
- **P5. Demo output card fades in before the spec finishes typing.** The drake card is at full opacity by ~7.7s while the JSON is still typing `"a tool for ag…"` until ~7.9s. Weakens the input→output causality the arrow implies. Trigger the card on typewriter completion (or on the closing `}`).
- **P6. CTA hold is slightly overlong.** ~4.3s of full static after the command completes (23.7–28.0s). With B2/M1 fixed a ~3s hold plus a musical button would end tighter; alternatively add a blinking cursor after `sh` so the terminal stays alive.

---

## Suggested fix priority

1. B1 + B2 + M1 are one job: re-do the audio pass (start at 0s, sync accents, -14 LUFS, ending button). This is the single highest-leverage change.
2. M2/M3: add idle motion to held scenes and a snap-in on the hook punchline.
3. P1–P6 as time allows; P3 and P5 are one-line trigger/timing changes.
