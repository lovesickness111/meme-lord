# Launch Video Design Brief

Goal: make the meme-maker X launch video read as **polished motion graphics**, not
a slideshow of static memes. Based on frame-by-frame study of two reference
launches (July 2026):

- **Kickbacks.ai** — Andrew McCalip, [x.com/andrewmccalip/status/2065049432652189933](https://x.com/andrewmccalip/status/2065049432652189933) (~24s, 1080x1080)
- **Hermes Agent v0.19.0 "Quicksilver"** — Nous Research, [x.com/NousResearch/status/2079278653997809984](https://x.com/NousResearch/status/2079278653997809984) (~2:06, 1080x1080, 655K+ views)

(The "Mammon/Manum" video referenced by the user could not be located via search;
the patterns below are consistent across both confirmed references and typical
Remotion-made devtool launches.)

## What the references actually do

**Kickbacks (McCalip):** warm off-white "paper" background with subtle film
grain + chromatic aberration. Opens with iMessage-style chat bubbles popping in
one by one ("wait a second", "this is genius?") — social proof as the hook.
Then one huge black headline ("The most watched line on Earth"), a tiny animated
UI mockup (dark pill terminal chips) demonstrating the product, a wall of
scrolling micro-text as texture, and a closing logo card ("Kickbacks.ai — GET
PAID FOR WAITING") in the single green accent color. Text *animates in*
(pop/slide/typewriter); nothing is a static full-frame image.

**Hermes Agent (Nous):** monochrome analog-CRT aesthetic. Every scene is a
"card" inside a persistent HUD frame: corner brackets, header
(`hermes-agent · quicksilver`), scene counter (`01 / 15`), footer with repo path
and running timecode. Pixel/terminal display font for headlines, typewriter body
text with a blinking block cursor. Liquid-mercury metaball blobs morph between
scenes as the only illustration. Heavy but consistent treatment: scanlines,
vignette, RGB-split glitch on headline entrances. One feature per card, ~8s
each, ends on the logo alone.

## 3 key visual principles

1. **One persistent design system, not a slideshow.** A constant frame (HUD
   chrome, background texture, grain/scanline overlay) makes cuts feel like the
   *content* changing inside one world. Memes should live inside this frame as
   props — masked, tilted, drop-shadowed, animated in — never as raw full-bleed
   PNGs.
2. **Everything moves, on a beat.** Headlines slide/pop with spring easing,
   body copy typewrites with a blinking cursor, numbers count up, meme panels
   scale in with overshoot. No element should simply appear.
3. **Extreme restraint in palette and type.** One background, one text color,
   one accent. One display font for headlines + one mono for body. The texture
   layer (grain, chromatic aberration, vignette) unifies every scene and is what
   makes it read as "produced".

## Recommended scene structure & duration

Keep total at **20–30s** (Kickbacks-length; X autoplay attention span), 1080x1080, 30fps:

| # | Scene | ~Dur | Content |
|---|-------|------|---------|
| 1 | Hook | 3s | Typewriter headline: the problem ("your agent can't shitpost") — no logo yet |
| 2 | Reveal | 3s | `meme-maker` wordmark glitches in + one-line value prop |
| 3 | Demo | 5s | Terminal card: JSON spec typewrites in → rendered meme pops in beside it |
| 4 | Features | 3×3s | One card per feature (CLI·MCP·HTTP·UI / deterministic / 609 templates), meme as animated prop, count-up for "609" |
| 5 | Proof | 3s | Rapid-fire wall of rendered memes scaling in on a grid (texture, like Kickbacks' micro-text wall) |
| 6 | CTA | 4s | Logo + repo URL + `npx` install command typewriting, blinking cursor holds |

Persistent HUD: corner brackets, `meme-maker` header, scene counter `01/07`,
footer `kartikkabadi/meme-maker` + timecode.

## Typography, color, motion

- **Headline font:** keep Anton (already bundled, on-brand) or a pixel/terminal
  display face for the Nous vibe; ALL CAPS, tight tracking.
- **Body/UI font:** a mono (JetBrains Mono / IBM Plex Mono) — the product is a
  CLI, lean into it.
- **Palette:** near-black `#0d0d0d` background, off-white `#f2efe9` text, **one**
  accent (suggest meme-yellow `#ffd400` or terminal-green `#2fbf4f`) for
  highlights, counters, and the CTA. Invert (paper bg / black text) is also
  valid — pick one, never mix.
- **Motion:** spring easing on entrances (scale 0.9→1 with overshoot),
  typewriter at ~20 chars/s with block cursor, 6–10 frame crossfades or hard
  cuts on beat; add a global overlay of film grain + slight chromatic aberration
  + vignette on every frame. Count-up animation for any number.

## Audio direction

- Both references use minimal, rhythmic electronic beds — lo-fi/synthwave pulse
  around 90–110 BPM, no vocals, sidechained so it "breathes" with the cuts.
- Sync scene changes to the beat; add subtle SFX: keyboard clacks under
  typewriter text, a soft pop/thock when a meme panel lands, one riser into the
  CTA card, then the music cuts to near-silence on the final logo hold.
- Keep loudness modest (X compresses audio); the video must still work muted —
  all information is on-screen text.

## Tweet copy patterns

Both references: short declarative lines, one idea per line, blank lines between,
no hashtags, ends with the name/CTA. 4–7 lines total.

**Pattern A — problem → flip → CTA (McCalip style):**
> Your agents can write code, file PRs, and book flights.
>
> But they still can't make a decent meme.
>
> One JSON spec in → pixels out. CLI, MCP, HTTP. 609 templates, zero cloud.
>
> Introducing meme-maker

**Pattern B — version-release deadpan (Nous style):**
> meme-maker v1.0: memes as infrastructure
>
> Deterministic rendering. 609 templates. MCP server for your agents.
>
> Changelog below

**Pattern C — one-liner + repo:**
> memes are now a build artifact.
>
> deterministic, headless, agent-native meme rendering — CLI · MCP · HTTP · UI
>
> github.com/kartikkabadi/meme-maker
