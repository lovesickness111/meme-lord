# meme-maker v0.3.1 — X launch plan

Product: agent-facing meme generator. 609 templates, deterministic rendering,
CLI / MCP / HTTP / Web UI, curl installer (no npm required). MIT.

## When to post

**Recommendation: Tuesday, July 22, 2026 at 6:30 PM IST** (9:00 AM ET / 6:00 AM PT / 3:00 PM CEST).

Rationale:

- Buffer's 2026 analysis of 8.7M posts: **Tuesday 9 a.m. is the single best
  slot** on X, followed by Wednesday 9–10 a.m.; Tue/Wed/Thu are the strongest
  days, mid-morning (9–11 a.m. local) the most reliable window. Fri/Sat are
  the worst.
- Primary audience is **US/EU devs + AI Twitter**, so "local time" means US
  Eastern for the biggest cohort. 6:30 PM IST = 9:00 AM ET — US devs settling
  in at work — while EU is mid-afternoon (2–3 PM London / 3–4 PM CET), still
  fully active. West Coast AI Twitter (6 AM PT) catches it as early-morning
  scroll and via the algorithm surfacing an already-warm post.
- **Today (Monday) vs. Tuesday:** Monday works (9–10 a.m. is fine per the same
  data), but 2:20 PM IST now = 4:50 AM ET — posting immediately would land in
  the US overnight dead zone. Since we'd have to wait until ~6:30 PM IST
  anyway, waiting one more day for the statistically best slot (Tuesday) costs
  little and gains the platform's peak engagement day.
- Fallback slots: **today (Mon) 6:30–7:30 PM IST**, or **Wednesday 6:30–8:00
  PM IST** (Wed 9–11 a.m. ET is nearly as strong as Tuesday).
- Avoid: after 10:30 PM IST (US lunchtime dropoff into afternoon), and any
  IST-morning slot (US asleep).

## Copy style: what the reference accounts do

Patterns from Nous Research and Andrew McCalip launch tweets:

- **No hashtags.** Zero. Hashtags read as marketing; AI Twitter ignores them.
- **Terse, declarative first line** that states what the thing *is*
  ("Introducing X", or just the name + one-line claim). No "We're excited to
  announce".
- **Concrete numbers and specifics** carry the tweet (param counts, benchmark
  deltas → for us: 609 templates, one JSON spec, zero cloud).
- **Native media attached** — video or image directly in the post, link in a
  reply or at the end, never a bare link-only tweet.
- **Lowercase / casual register** is common (McCalip especially); confidence
  over hype. Short sentences. Line breaks instead of commas.
- Details, benchmarks, and links go in a **short self-reply thread**, keeping
  the first post clean.

## Tweet copy options (all < 280 chars)

### Option A — short & punchy

> meme-maker: deterministic meme generation for AI agents.
>
> 609 templates. one JSON spec in, pixels out. CLI, MCP, HTTP, web UI. no cloud, no npm — one curl to install.
>
> open source, MIT.

(~215 chars. Attach launch video. Repo link in first reply.)

### Option B — medium, hook-first

> your agent can write code, book flights, and file PRs. but can it shitpost?
>
> meme-maker gives any agent a meme pipeline: 609 templates, deterministic rendering, one JSON spec. CLI + MCP + HTTP + web UI. MIT, runs anywhere, installs with one curl.

(~262 chars. Attach launch video. Link in reply.)

### Option C — mini-thread

**Tweet 1 (with video):**

> memes are the last mile of agent communication.
>
> meme-maker v0.3.1: a headless, deterministic meme generator built for agents. 609 templates, one JSON spec, zero cloud.

**Tweet 2 (reply):**

> - CLI, MCP server, HTTP API, web UI — same spec everywhere
> - same input → identical pixels, every time (CI-friendly)
> - GIFs, multi-panel grids, auto-fit text
> - curl installer, no npm needed
>
> github.com/kartikkabadi/meme-maker

**Tweet 3 (reply, optional):**

> everything in the launch video above was rendered by meme-maker itself — the storyboard is a JSON file in the repo. dogfooding all the way down.

## Hashtags and mentions

- **Hashtags: none.** Matches the reference accounts; hashtags depress
  engagement with this audience. If one is truly wanted, at most `#buildinpublic`
  in a reply, never the main post.
- **Mentions:** none in the main post (mentions throttle reach for
  non-followers). In replies or QTs, it's fair game to tag communities that
  engage with agent tooling if there's a genuine hook (e.g. MCP ecosystem
  accounts). Don't tag large labs cold.

## Video vs. link

**Attach the launch video (`media/launch/launch.mp4`, 18s, 1080x1080)
natively to the first tweet.** Native video autoplays in-feed and X's
algorithm favors native media and dwell time; external links are deprioritized.
Put the GitHub link in the **first reply** (or as trailing text in Option A) —
the standard "link in reply" pattern the reference accounts use.

- 18s @ 1080x1080 is ideal for in-feed autoplay (square = max feed area).
- Pin the tweet after posting; reply to early comments within the first hour
  (early engagement velocity drives distribution).

## Top recommendation

Post **Option A** with the native video on **Tuesday, July 22 at 6:30 PM IST**,
GitHub link in the first reply, no hashtags, then the Option C tweet-3
dogfooding line as a follow-up reply.
