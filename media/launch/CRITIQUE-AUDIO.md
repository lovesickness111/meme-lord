# CRITIQUE-AUDIO — launch.mp4 (v0.3.1)

Frame-by-frame + waveform critique of the audio track for the X launch video.
Source: `https://github.com/kartikkabadi/meme-maker/releases/download/v0.3.1/launch.mp4`
(27.05s, 1080x1080 @ 30fps, AAC stereo 48kHz 317kb/s. Music source: `assets/music.mp3`, 20.04s, looped via Remotion `<Audio loop />` in `src/index.tsx`.)

Measured: integrated loudness **-23.5 LUFS**, loudness range **0.6 LU**, max peak **-8.6 dBFS**, no clipping.

---

## Issues

### 1. [BLOCKER] Audible loop seam at ~20.0s
`music.mp3` is 20.04s but the video is 27.05s, and Remotion's `loop` does a hard
restart with no crossfade. Waveform shows the music decaying to -33 dB, a ~10ms
near-silence gap (**-70 dB at 20.03s**), then an abrupt jump back to -19 dB as the
track restarts from its beginning — a clearly audible dropout/pop in the middle of
Scene 7 ("Rendered by meme-maker itself"), the emotional peak of the video.
**Fix:** use a track ≥ 27s, or render a seamless 27s bed offline (crossfade the loop
point in an editor / `ffmpeg acrossfade`) and drop `loop`. Never rely on Remotion's
raw loop for music.

### 2. [BLOCKER] Way too quiet for social
-23.5 LUFS integrated with -8.6 dBFS peaks. X/TikTok/IG normalize around **-14 LUFS**;
this video plays ~9-10 dB quieter than everything around it in the feed and reads as
low-energy/broken on phone speakers. The `musicVolume` cap of 0.55 plus an already
quiet source wastes ~9 dB of headroom.
**Fix:** loudness-normalize the music bed to about -14 LUFS / -1 dBTP
(`ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=7`) and raise the Remotion volume cap to ~0.9.

### 3. [MAJOR] Track does not feel like a launch track
Loudness range is **0.6 LU** — essentially a flat drone. Per-second RMS is -25 dB
(±0.5 dB) for all 27 seconds; spectral centroid is constant (~2300 Hz) start to
finish. There is no intro, no build, no drop, no ending hit. It reads as elevator /
lo-fi background, not a product launch.
**Fix:** pick or edit a track with an arc: sparse intro under "your agent can"
(0-3s), energy step-up at the title card (~3.5s), sustained groove through features,
riser into the CTA (~22s), and a final hit/stinger on the last logo frame.

### 4. [MAJOR] Zero SFX / no audio-video sync
The video has 8 scene transitions, a typing terminal, cards snapping in, a template
grid assembling, and a typed install command — and the audio acknowledges none of it.
RMS is uniform across every cut; nothing in the mix lands on any visual beat.
**Fix:** add subtle SFX ducked under the music: soft whoosh on scene cuts, keyboard
ticks under the JSON/terminal typing (scenes 3 and 8), a light "pop" as each meme
card lands, and a single accent hit on "609 TEMPLATES". Even 3-4 well-placed sounds
would transform perceived production value.

### 5. [MAJOR] Ending never reaches silence — hard cut on a live tail
`musicVolume` interpolates to **0.08, not 0**, over the last ~34 frames, so audio is
still at ~-50 dB when the file hard-stops at 27.05s. Combined with issue 3 (no
musical ending) the video just... stops.
**Fix:** fade to 0 by `total - 2` frames (`[0.55, 0]` not `[0.55, 0.08]`), or better,
end on a musical resolution/stinger timed to the final logo.

### 6. [MINOR] Abrupt cold start
Fade-in is only 12 frames (0.4s): first 50ms is near-silence, then the track lurches
in mid-phrase (mp3 also carries a 23ms encoder-delay offset). Sounds like the music
was already playing before the video started.
**Fix:** lengthen fade-in to ~1s, or start with a track that has a real intro.

### 7. [MINOR] Mono-safe but dull mix
Bass energy share is ~0.20 and constant; no low-end moment anywhere. Fine on phone
speakers, but the track never uses the spectrum for emphasis (e.g., a bass drop at
the title or CTA).
**Fix:** covered by choosing a better track (issue 3); otherwise a one-time low-end
swell at 3.5s and 24s helps.

### Positive
- No clipping anywhere (max peak -8.6 dBFS).
- No unintended mid-video silences other than the loop seam.
- A/V container is clean: audio and video streams are aligned, correct duration.

---

## Top priorities
1. Kill the 20s loop seam (blocker).
2. Normalize to ~-14 LUFS (blocker).
3. Replace/edit the track so it has an arc befitting a launch (major).
4. Add 3-5 synced SFX on key visual beats (major).
5. Fade fully to silence at the end (major).
