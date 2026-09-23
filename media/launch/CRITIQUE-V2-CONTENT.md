# CRITIQUE-V2-CONTENT — launch-v2.mp4 (v0.3.1)

Frame-by-frame content critique of the X launch video v2.
Source: `https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch-v2.mp4`
Video: 1080x1080, 30fps, 28.03s, h264 + AAC (mean −18.7 dB, peak −2.6 dB, no clipping).

## Scene map (as observed)

| # | Time | Content |
|---|------|---------|
| 1 | 0.0–3.5s | Hook: typewriter "your agent can write code, file PRs, book flights." → "BUT IT CAN'T SHITPOST." |
| 2 | 4.0–5.5s | Title card: MEME-MAKER / "deterministic memes for agents" |
| 3 | 6.0–10.0s | "ONE JSON SPEC IN. PIXELS OUT." — JSON typed, drake meme renders |
| 4 | 10.5–13.5s | "ONE ENGINE. FOUR SURFACES." — CLI/MCP/HTTP/WEB UI + why-not-both meme |
| 5 | 14.0–16.0s | "SAME SPEC. SAME PIXELS." — deterministic/reproducible/CI-friendly + always-has-been meme |
| 6 | 16.0–19.5s | Count-up to "609 TEMPLATES. ZERO CLOUD." + success-kid card |
| 7 | 20.0–23.0s | "RENDERED BY MEME-MAKER ITSELF" — wall of 6 memes |
| 8 | 23.5–28.0s | CTA: MEME-MAKER wordmark, curl install command, github URL |

## Verified facts (no issues)

- Install command is `curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh` — correct, no npm. URL verified live (HTTP 200 on `install.sh` at `main`).
- "609 templates" matches `assets/templates/manifest.json` (609 entries).
- Scene counter reads 08/08 on the final card (v1's counter bug is fixed).
- Count-up spoiler from v1 is fixed: counter reaches 609 (~17.3s) *before* the success-kid card appears (~18s).
- Duration (28s) is right for X feed; final CTA holds ~4.5s, long enough to read.

## Issues

### [MAJOR] M1. Dead-black opening — weak first frame for muted autoplay
Frames 0–1.3s are near-black with small mid-gray typewriter text ("your agent can w…"). In the X feed the first frame *is* the thumbnail; this one reads as a broken/blank video and gives scrollers no reason to stop. The payoff ("BUT IT CAN'T SHITPOST.") only lands at ~2.5s.
**Fix:** Put a bold visual on frame 0 — e.g. flash the yellow "BUT IT CAN'T SHITPOST." punchline first (0.5s), then replay the setup; or start the typewriter with the first clause already complete. Target: yellow display type visible within 0.3s.

### [MAJOR] M2. Success-kid meme is shown twice in 5 seconds, with text that just repeats the headline
Scene 6 pairs the headline "609 TEMPLATES. ZERO CLOUD." with a success-kid card that says… "609 TEMPLATES / ZERO CLOUD" — the prop adds zero information. Then the identical card reappears in the scene-7 wall (center-bottom slot). The drake card from scene 3 is *also* reused as the wall's first slot, so 2 of the 6 "rendered by meme-maker itself" proofs are re-runs the viewer just saw. That undercuts the breadth claim of both "609 templates" and the wall.
**Fix:** In scene 6 use a *different* template with a joke that complements (not repeats) the headline. In scene 7 swap the two repeated cards for fresh templates — six unique memes makes the "rendered by itself" claim land much harder.

### [MAJOR] M3. Scene 6 wastes ~1.5s on an empty right half
From 16.0s to ~18.0s the frame is a lone yellow counter on the left with the entire right half black (see 16.2s, 17.3s). In a 28s video that's 5%+ of runtime showing nothing.
**Fix:** Either shorten the count-up to ~0.8s, or have the meme card slide/scale in during the count so the payoff and the number resolve together (card content can stay hidden/blurred until 609 lands to preserve the reveal).

### [MINOR] m1. CTA tells the viewer nothing to *do*
The final card is wordmark + command + URL — informative, but there's no imperative ("Install in 10 seconds", "Star the repo", "Link in reply ↓"). On X the actual funnel is the reply/pinned comment; the video never points there.
**Fix:** Add one short action line under the URL (e.g. "one curl. no npm. link below ↓"). Also confirm the launch tweet's first reply carries the copy-pastable command since nobody will retype it from video.

### [MINOR] m2. Install command wraps mid-URL with no continuation cue
The command breaks after `githubusercontent.com/` onto a second line. It's readable at 1080p but at feed size (~13px glyphs) the wrap can read as two commands.
**Fix:** Add a `\` continuation glyph or a subtle dimming of the wrapped segment; or drop font size ~10% to keep `install.sh | sh` visually attached to the URL.

### [MINOR] m3. Scene 3→4 cross-dissolve creates a mushy overlap frame
At ~10.4s the incoming "ONE ENGINE. FOUR SURFACES." headline sits on top of the outgoing JSON panel and the old "ONE JSON SPEC IN. PIXELS OUT." header — for ~0.5s both scenes are simultaneously legible and neither reads cleanly.
**Fix:** Replace the dissolve with a hard cut or a directional slide; every other scene change in the video cuts crisply, so this transition is also stylistically inconsistent.

### [MINOR] m4. Scene 4's meme only shows 2 of the "four surfaces"
Headline claims FOUR SURFACES; the two-buttons meme pits CLI vs MCP SERVER only. Harmless joke, but HTTP and WEB UI get no visual reinforcement beyond the small bullet list.
**Fix (optional):** caption the bottom panel "why not all four?" or leave as-is — low priority.

### [MINOR] m5. Scene 2 title card is redundant with the CTA card
Scenes 2 and 8 are near-identical wordmark cards. The ~1.5s at 4–5.5s stalls momentum right after the hook; the name reveal could ride the top chrome (which already says `meme-maker` throughout) or merge into scene 3's header.
**Fix (optional):** trim scene 2 to ~0.8s or cut it and give the reclaimed time to scene 7 (the wall currently gets only ~3s for 6 cards).

## Top issues summary

1. **[MAJOR]** Near-black first 1.3s — bad autoplay thumbnail, weak hook entry (M1).
2. **[MAJOR]** Success-kid + drake memes repeated; scene-6 card just parrots its own headline (M2).
3. **[MAJOR]** ~1.5s of empty right-half screen during the count-up (M3).
4. **[MINOR]** CTA has no explicit next action and doesn't point to the reply with the command (m1).
5. **[MINOR]** Scene 3→4 dissolve overlap; install command wraps mid-URL without a cue (m3, m2).

No blockers found: install command is correct and live, template count is accurate, scene counter and count-up sequencing bugs from v1 are fixed.
