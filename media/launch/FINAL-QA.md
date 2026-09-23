# Final QA — Launch Video (`launch.mp4`, release v0.3.1)

Reviewed: 2026-07-21 · frame-by-frame at 1fps plus 3 targeted frames per scene (start/mid/end).

## Technical specs

| Check | Expected | Actual | Result |
|---|---|---|---|
| Resolution | 1080x1080 | 1080x1080 | PASS |
| Frame rate | 30fps | 30/1 | PASS |
| Video codec | h264 | h264 | PASS |
| Audio | AAC stereo 48kHz | AAC stereo 48kHz | PASS |
| Audio not silent | mean_volume > -60 dB | -24.4 dB (max -5.2 dB) | PASS |
| Duration | 18–20s | 18.35s | PASS |
| File size | < 15MB | 6.7MB (7,043,629 bytes) | PASS |

## Scene-by-scene review

| # | Scene | Frames checked | Result | Notes |
|---|---|---|---|---|
| 1 | title | 0.2s / 1.2s / 2.2s | PASS | Title + subtitle centered, high contrast, no clipping |
| 2 | drake | 2.6s / 3.6s / 4.6s | PASS | Text readable; blurred background fill looks good; caption fades in cleanly |
| 3 | expanding-brain | 5.0s / 6.2s / 7.4s | PASS | All four panel texts legible; caption fully visible |
| 4 | two-buttons | 7.8s / 8.8s / 9.8s | PASS | Button labels and caption "CLI · MCP · HTTP · Web UI — one engine" fully readable |
| 5 | always-has-been | 10.2s / 11.2s / 12.2s | PASS | Meme text and caption legible; smooth slide-in motion visible across frames |
| 6 | success-kid | 12.6s / 13.6s / 14.6s | PASS | "609 TEMPLATES / ZERO CLOUD" crisp; caption fades in cleanly |
| 7 | outro | 15.0s / 16.5s / 18.0s | PASS | URL `github.com/kartikkabadi/meme-maker` fully readable; subtitle fades in |

Transitions (fade / slide-left) are smooth with no tearing or clipped text observed at scene boundaries.

## Overall verdict

**PASS** — the video meets all technical and visual requirements and is ready to publish.

Download: `gh release download v0.3.1 -p launch.mp4 --clobber -R kartikkabadi/meme-maker`
