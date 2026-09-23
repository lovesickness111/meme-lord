# Launch Video v2 — Audio Critique (CRITIQUE-V2-AUDIO)

Source: `launch-v2.mp4` from release v0.3.1 (28.03s video / 28.10s audio, 1080x1080@30fps, AAC-LC stereo 48kHz ~317kbps, Remotion 4.0.495).

Measured with ffmpeg/ffprobe: `ebur128`, `astats`, `silencedetect`, per-100ms peak envelope, spectrogram, and 1fps frame extraction.

## Measurements

| Metric | Value |
|---|---|
| Integrated loudness | **-15.9 LUFS** |
| Loudness range (LRA) | **3.8 LU** |
| True peak | -2.2 dBTP (no clipping) |
| Sample peak | -2.6 dBFS, flat factor 0 (clean) |
| Trailing silence | 27.60s → 28.10s (~0.5s digital silence) |
| Intro level (0.0–3.9s) | peaks ≈ **-30 dBFS** (typing ticks), one small hit -18 dB @ 2.0s |
| Music entry | 4.0s, peak jumps -44 dB → **-5.7 dB** in one 100ms window |
| Body (4–26.5s) | RMS pinned at -17.5 ±0.6 dB — essentially flat |
| Outro | fade 26.5–27.6s, then silence to end of file |

## Issues

### 1. [BLOCKER] Loop seam is a ~5-second energy hole
X autoplays and loops. The track fades out at 26.5–27.6s, sits in 0.5s of pure digital silence, then loops into ~4s of near-silent typing ticks (-30 dBFS) before the music slams back at 4.0s. On loop, that's ~5s of effective dead air out of a 28s video — viewers will assume the video is over and scroll.
**Fix:** end on a musical hit/stinger that lands on the final frame (no fade-to-silence), trim the 0.5s trailing silence so audio and video end together, and put a low music bed or filtered version of the track under the 0–4s typing intro so the loop seam carries energy.

### 2. [MAJOR] No track arc — it reads as a background loop, not a launch track
LRA is 3.8 LU and body RMS never moves more than ~1 dB from 4s to 26.5s. Aside from a slight brightness change ~17.5s, there is no build, no drop, no section change across the 8 visual scenes. A launch track needs momentum: tension → payoff.
**Fix:** arrange at least three sections — riser into the 4.5s title drop, an energy lift or fill at the "RENDERED BY MEME-MAKER ITSELF" gallery (~22.5s), and a final hit on the CTA card.

### 3. [MAJOR] Music entry at 4.0s is a +25 dB cliff
Peaks go from ≈ -44 dB (3.9s) to -5.7 dB (4.0s) with zero transition. The drop-on-title concept is right, but with nothing preceding it, it's a jump-scare rather than a payoff — especially bad on headphones.
**Fix:** add a 1–1.5s riser/sweep ending exactly at 4.0s, or side-chain the intro bed up into the hit.

### 4. [MAJOR] Typing SFX are effectively inaudible
The 0–4s typewriter ticks peak around -30 dBFS (≈25 dB below the music body). On phone speakers, and after platform loudness normalization, they will not be heard — the intro plays as silence.
**Fix:** raise typing SFX ~+10–12 dB (peaks around -18 to -15 dBFS) and keep them present against the intro bed from issue #1.

### 5. [MINOR] Riser at ~24.5–26.2s resolves into a fade-out, not an impact
The spectrogram shows a rising sweep in the last section that leads directly into the fade — anticlimactic under the CTA/install card, and it compounds issue #1.
**Fix:** land the riser on a final stinger/impact aligned with the CTA card.

### 6. [MINOR] Loudness ~2 LU under platform target
-15.9 LUFS integrated with -2.2 dBTP true peak; X/most platforms normalize around -14 LUFS. The quiet intro also drags the integrated number down. Safe headroom, but the video will play slightly quieter than neighboring content.
**Fix:** after fixing #1/#4, master to ~-14 LUFS integrated, -1.0 dBTP ceiling.

### 7. [MINOR] No transition SFX between scenes
8 scene changes (cards at ~2.5s, 4.5s, and every ~3–4s after) with no whoosh/tick/impact marking any of them; only the music bed runs underneath. Audio never acknowledges the editing.
**Fix:** add subtle whoosh or click transients on scene cuts, -18 to -12 dBFS, ducked into the music.

### 8. [MINOR] (Non-audio, noticed while reviewing frames) CTA curl command truncated
The end card shows `curl -fsSL https://raw.githubusercontent.com/ kartikkabadi/meme-maker/main/install.sh | sh` wrapping awkwardly and visually clipping at the box edge (`| sh` overflow). Consider a shorter display command or smaller monospace size.

## What's fine
No clipping (true peak -2.2 dBTP, flat factor 0), no mid-track dropouts, clean stereo, A/V start aligned, and the music drop is correctly timed to the title card at ~4.5s.

## Top priority order
1. Fix the loop seam (#1) — the single biggest launch-quality problem.
2. Give the track an arc (#2) + riser into the title drop (#3).
3. Make the typing SFX audible (#4).
4. Re-master to -14 LUFS / -1 dBTP (#6).
