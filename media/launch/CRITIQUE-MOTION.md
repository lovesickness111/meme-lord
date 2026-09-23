# CRITIQUE-MOTION.md — Frame-by-Frame Motion Critique of `launch.mp4` (v0.3.1)

Reviewed asset: https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch.mp4
Video: 1080x1080, 30fps, 27.0s, H.264 + AAC stereo. Frames extracted at 2fps (54 frames) and inspected individually; audio analyzed with `volumedetect` / `astats`.

Scene map (per `storyboard.json`): hook 0–3s · reveal 3–6s · demo 6–11s · surfaces 11–14s · deterministic 14–17s · templates 17–20s · proof 20–22.5s · cta 22.5–27s.

---

## [BLOCKER] Issues — must fix before shipping

### B1. Count-up payoff is spoiled — meme card shows "609 TEMPLATES" while the counter is still at 583
- **Where:** Scene 6 (templates), 17.0–18.7s (frames 035–037).
- **What:** At ~17.7s the big yellow counter reads **583** and is still climbing, but the success-kid meme card on the right already displays **"609 TEMPLATES"** at full opacity. The number reveal — the entire point of a count-up — is dead on arrival.
- **Fix:** Either (a) delay the meme card's caption reveal until the counter lands on 609 (fade/pop the caption in sync with the final tick), or (b) have the card's caption count up in lockstep with the big number. Add a small scale "pop" + ease-out on the final 609 landing for punch.

### B2. CTA typewriter finishes on the literal last frame — the install command is never readable at rest
- **Where:** Scene 8 (cta), 22.5–27.0s (frames 046–054).
- **What:** The terminal box sits **empty except for `$`** for ~1 full second (22.5–23.5s), then the long curl command typewrites for the remaining ~3.5s and only completes at ~26.5s — while the whole frame is already fading to black, cursor still lit (frame 054 shows the fade mid-typewriter-cursor). Viewers get **zero seconds** of the completed command at full opacity. This is the CTA; it's the one thing that must be readable.
- **Fix:** Cut the empty-prompt dead air to ≤0.3s, speed the typewriter up 2x (or type only `curl -fsSL .../install.sh | sh` shorthand), and hold the completed command static for ≥1.5s before any fade. Alternatively drop the typewriter here entirely and pop the command in fully formed.

### B3. Double typewriter cursor glitch in the JSON demo
- **Where:** Scene 3 (demo), ~6.5–7.0s (frame 014, t=6.73s).
- **What:** Two block cursors are visible **simultaneously** on two different lines (`"template": "drak▮` and `"t▮` on the next line). A typewriter has exactly one caret; two reads as a rendering bug and is very visible at 1080p.
- **Fix:** In the typewriter component, render the cursor only on the single line currently receiving characters (index by global character offset, not per-line).

---

## [MAJOR] Issues — hurt perceived quality

### M1. Proof grid is rushed, half-empty, and contains a duplicated meme
- **Where:** Scene 7 (proof), 20.0–22.5s (frames 040–045).
- **What:**
  1. At 20.2s (frame 041) only **2 of 6** cards have popped in — the frame is ~70% empty black, and the headline "RENDERED BY MEME-MAKER ITSELF" hasn't appeared yet. The stagger eats ~1.2s of a 2.5s scene.
  2. The **galaxy-brain card appears twice** (grid positions 2 and 6, identical "A DETERMINISTIC CLI" caption). With 609 templates available, a dupe in a 6-card showcase undermines the very claim being made.
  3. Card captions are clipped at card edges: "S ALL-JUST ONE JSON SPEC?" (leading char cut), "ALWAYS H…" (right edge cut), "CL" on two-buttons, and drake's "A CLI FOR AGENTS" renders as an illegible smear at this scale.
  4. 2.5s total is not enough to parse 6 memes + a headline; it reads as a flash.
- **Fix:** Replace the duplicate with a distinct template; tighten the stagger to ~0.5s total (60–80ms per card, ease-out-back); show the headline from scene start; extend scene to ~3.5s (steal 1s from scenes 4/5); re-render grid thumbnails at the correct aspect so captions aren't clipped.

### M2. Music is a flat, quiet loop with zero sync to picture
- **Where:** Entire audio track.
- **What:** Per-second RMS is a near-constant **-25 dB** for all 27 seconds (mean -25.4 dB, max -6.0 dB), dropping off only in the final second. There is no build, no drop, no accent on any of the 7 scene transitions, no hit on the "609" landing, no ending button. It is also ~10 dB quieter than typical social-feed loudness (~-14 LUFS), so on X it will sound anemic next to adjacent content.
- **Fix:** Master to ~-14 LUFS. Pick/edit a track with a beat grid and align cuts to beats (at 27s, an ~120 BPM track gives a 0.5s grid — shift scene boundaries a few frames to snap). Add a riser or drum fill into the reveal (3s) and a hit/stinger on the 609 landing (~18.7s) and on the final CTA hold. End with a clean musical resolution, not a passive fade.

### M3. Scenes 4 and 5 are motion-dead for 3 seconds each, and their bullet fade-in reads as a rendering error
- **Where:** Scene 4 (surfaces) 11–14s (frames 023–027); Scene 5 (deterministic) 14–17s (frames 028–033).
- **What:** In both scenes everything is fully composed within ~0.5s and then **nothing moves for ~2.5s** — 5 combined seconds (nearly 20% of the video) of freeze-frame. Worse, at scene start the bullet list fades in **all at once at low opacity** (frame 023 shows all four bullets simultaneously ghost-grey), which looks like a failed render rather than intentional motion.
- **Fix:** Stagger the bullets (80–120ms apart, slide 8–12px up with ease-out) so the fade reads as intentional. Add a slow Ken-Burns-style drift or 1–2° rotation settle on the meme card so the hold isn't dead. Consider trimming each scene to 2.5s and donating the time to Scene 7.

### M4. Hook punchline lands with no emphasis and gets hard-cut
- **Where:** Scene 1 (hook), 0–3s (frames 001–005).
- **What:** The typewriter body finishes by ~1.5s and "BUT IT CAN'T SHITPOST." pops in as a plain static block by ~1.7s — no scale, no shake, no beat accent — then the scene hard-cuts at 3.0s. The strongest line in the script gets the weakest treatment, and the cut arrives ~1.3s after the punchline with no rhythm to justify it.
- **Fix:** Give the punchline a snap-in (scale 1.15→1.0 over ~150ms, ease-out) synced to a music accent, and hold it a beat longer (extend hook to 3.5s if needed). The hard cut to the reveal is fine *if* it lands on a beat — see M2.

---

## [MINOR] Polish items

- **P1. Inconsistent bullet markers:** In scenes 4 and 5 the first list item ("CLI", "deterministic") has no `·` marker while the following items do (frames 026, 032). Make all items consistent.
- **P2. Lingering cursor after JSON completes:** In Scene 3 the block cursor stays parked on the closing `}` from ~8.2s to the end of the scene (frames 017–021) even though typing is done. Blink it 2–3 times then hide it.
- **P3. Closing brackets pre-rendered during typing:** Frames 014–016 show the JSON's closing `]`/`}` already present below the line still being typed. A real typewriter types top-to-bottom; pre-rendered scaffolding breaks the illusion.
- **P4. "ALWAYS HAS BEEN" caption touches the card edge** in Scene 5 (frame 032) — "BEEN" is flush against the rounded corner. Add padding or shrink the caption.
- **P5. CTA URL wraps mid-path:** the curl command breaks after `raw.githubusercontent.com/` (frames 049–054), splitting the path awkwardly across two lines. Use a smaller mono size or the shorter `github.com/kartikkabadi/meme-maker` one-liner install form so it fits one line — commands that look copy-pastable convert better.
- **P6. No end-card breathing room:** the last visible state is the fading terminal (frame 054). Consider 0.5–1s of a clean end card (wordmark + repo URL, no cursor) so a paused/final frame is shareable.
- **P7. Meme card in Scene 3 pops in fully formed at ~8.2s** with no transition tied to the arrow (frame 017): a quick draw-on of the yellow arrow followed by the card scaling in would sell the "spec → pixels" causality better.
- **P8. Messaging note:** "SHITPOST" in the first 2 seconds may throttle paid amplification/reposts on some surfaces; keep it if the brand voice demands, but know the trade-off.

---

## Summary of the biggest wins

1. Fix the 609 count-up spoiler (B1) — it's the emotional peak of the video.
2. Rework CTA timing so the install command holds readable (B2).
3. Kill the double-cursor glitch (B3).
4. De-dupe and slow down the proof grid (M1).
5. Re-master and beat-sync the audio (M2) — the flat -25 dB loop makes every transition feel arbitrary.

Overall: the structure and copy are strong, but motion currently oscillates between "glitchy" (double cursor, ghost bullets, spoiled counter) and "dead" (5s of combined freeze in scenes 4–5), and audio does no narrative work. Fixing the three blockers plus M1/M2 would move this from "obviously generated" to "credible launch asset."
