# meme-maker v0.3.1 — Launch Strategy

Synthesized from the Subah Wadhwani playbook research
(`research/SECTION-PLAYBOOK.md`, `SECTION-HYDRA.md`, `SECTION-MAVE.md`,
`SECTION-MOTIONS.md`, `SECTION-CLIPPING.md`), `LAUNCH-PLAN.md`,
`DESIGN-BRIEF.md`, and the v2 video critique.

**Frame (use verbatim everywhere):** "the meme engine for AI agents."
Never "meme generator" — that puts us in the ImgFlip comparison set for a year.

**KPI:** curl installs + GitHub stars in the first 48h. Not views.

## Narrative arc

The tweet states the gap ("your agent can do everything except shitpost") and
the video proves the fix in 28 seconds — one JSON spec in, pixels out, live —
so the viewer's next action is the one-line install in the pinned reply.

## Launch day timeline (T-3 days → T+24h)

Launch: **Tuesday, July 22, 2026, 6:30 PM IST / 9:00 AM ET / 6:00 AM PT**.

| When | Task | Owner |
|------|------|-------|
| T-3d (Sat) | Lock frame + final tweet copy; verify install.sh, template count, video CTA. Build 3-tier amplifier list (tier 1: ~5-10 agent-builder QT voices; tier 2: ~20-30 AI-engineer commenters; tier 3: repost layer). | Kartik |
| T-3d | Pre-generate 30-50 reply memes *with meme-maker itself* (AI-agent culture, MCP jokes, self-deprecating). | Kartik / agent |
| T-2d (Sun) | DM tier 1 with early access + per-audience promo kit (copy angles below + pre-rendered memes). Check the week's launch calendar for collisions; confirm Tue slot. | Kartik |
| T-1d (Mon) | Calendar invite to personal network with assigned first-hour minute slots. Draft HN "Show HN" post. 30-min war-room sync night before; pre-draft first reply, dogfooding reply, and 3-5 seeded comments. | Kartik |
| T-0 −2h | Submit Show HN (anchor content lands before the tweet, Mave-style). | Kartik |
| T-0 +00m | Post main tweet with native video. Immediately post first reply (install command + repo link). Pin the tweet. | Kartik |
| +05m | Close friends/collaborators QT + comment (real network first — never influencers first). | Personal network |
| +15m | Substantive seeded comments land (threads below). | Reply accounts |
| +30m | Tier-1 agent-builder QTs go out; debate seed posted. | Tier 1 |
| +60m | Tier 2 comments + tier 3 reposts; post dogfooding reply ("the video itself was rendered by meme-maker"). | Tiers 2-3 |
| +0-4h | War room: reply to *every* comment fast, casual, with live-generated memes. Track installs/stars/impressions hourly. | Kartik |
| +4-8h | Second wave: afternoon push from personal network; drip 3-5 pre-made memes as replies/QTs of whatever angle is popping. | Kartik + network |
| +8-12h | Cross-post to Reddit (r/LocalLLaMA, r/mcp, r/commandline), relevant Discords, LinkedIn. Reply to HN comments. | Kartik |
| +24h | Retro: identify the winning hook/format, produce 5-10 variations, plan the follow-up week (1-2 assets/day for 4+ weeks). | Kartik |

## Main tweet (< 280 chars)

> meme-maker: deterministic meme generation for AI agents.
>
> 609 templates. one JSON spec in, pixels out. CLI, MCP, HTTP, web UI. no cloud, no npm — one curl to install.
>
> open source, MIT.

(~215 chars. Native video attached. No hashtags, no mentions.)

**First reply (posted immediately, then pin the main tweet):**

> install in 10 seconds:
>
> curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
>
> github.com/kartikkabadi/meme-maker

## Quote-tweet / amplifier angles

1. **Founder (Kartik, self-QT or thread):** "everything in this launch video
   was rendered by meme-maker itself — the storyboard is a JSON file in the
   repo. dogfooding all the way down."
2. **Investor / peer builder:** "most 'AI tools' are wrappers. this is
   infrastructure: deterministic output, schema-validated inputs, an MCP
   server your agent can actually use. memes as a build artifact is funnier
   than it has any right to be."
3. **User / customer:** "gave my agent access to meme-maker's MCP server an
   hour ago and it has been roasting my CI failures ever since. 609 templates,
   one curl to install, runs fully local."

## Seeded comment threads (brand + reply accounts)

1. **Debate seed (the controversy beat):** "hot take: deterministic template
   rendering > LLM image gen for memes. same spec, same pixels, every time —
   no slop." — reply account posts, brand replies with a meme *disagreeing
   with itself*, keeps the thread alive.
2. **MCP-vs-CLI angle:** "genuinely curious — if you're wiring this into an
   agent, do you go MCP server or just shell out to the CLI?" — brand replies
   "why not both" *as the why-not-both meme rendered live*.
3. **Live-demo bait:** "does it do GIFs?" — brand replies with a rendered GIF
   + the exact one-line command that made it. Every reply is a product demo.
4. **Skeptic seed:** "do agents actually need memes?" — brand replies with a
   meme about agents needing memes, plus one serious line: "memes are the last
   mile of agent communication."
5. **Practical seed:** "what's the catch? cloud? account?" — brand replies:
   "no cloud, no accounts, no telemetry. MIT. it's ~one curl and it runs on
   your machine."

## Low/no-budget amplification

- **Founder network first (minutes 0-30):** calendar invite with assigned
  slots — the algorithm classifies the post on first-hour velocity from
  accounts that look organic.
- **Hacker News:** "Show HN: Meme-maker – deterministic meme generation for
  AI agents (MCP/CLI)" submitted ~2h before the tweet as the anchor.
- **Reddit:** r/LocalLLaMA, r/mcp, r/commandline, r/selfhosted — native posts
  with a rendered example, not link-drops.
- **Discords:** MCP/agent-builder communities (Anthropic MCP, LangChain,
  CrewAI, smol-ai) — share in show-and-tell channels with a live demo.
- **Directories:** submit the MCP server to MCP registries/awesome-mcp lists
  same day.
- **Content factory:** drip pre-generated memes (all made with meme-maker)
  3-5/day during launch week; every asset carries the repo link or install
  one-liner; sustain 1-2/day for 4+ weeks (rule of 7).
- **One hyper-specific creator brief** (not a generic review ask): "let an
  agent run your meme replies for 24 hours using meme-maker."

## Metrics

**First 60 minutes (velocity window):**
- Replies + QTs in the first 15/30/60 min (algorithm classification signal)
- Impressions and bookmark rate on the main tweet
- Profile clicks → GitHub referral traffic
- First-hour installs (install.sh hits) and stars

**First 24 hours (the actual KPI):**
- curl installs and GitHub stars (the launch KPI — everything points here)
- Repo traffic: unique visitors, clones, referrers (X vs HN vs Reddit)
- HN position/points and comment sentiment
- MCP server setups (issues/questions mentioning MCP config)
- Which QT angle / seeded thread / meme format won → double down within 48h

## Anti-patterns (do NOT)

1. **Don't post and ghost.** The launch is won in real time; an unattended
   first hour kills the post and nothing revives it.
2. **Don't lead with influencers in hour one.** Stranger velocity reads
   low-signal; personal network first, tier-1 QTs at +30m.
3. **Don't use hype words or PR-speak** ("revolutionary", "game-changing",
   corporate replies). Proof-led copy; casual, funny, human replies only —
   ideally replies that are themselves meme-maker output.
4. **Don't optimize for views.** A viral post with no installs is a failed
   launch; every decision points at installs + stars.
5. **Don't accept the "meme generator" frame or a bare-link tweet.** Frame is
   "the meme engine for AI agents"; video native in the post, link in the
   pinned first reply — external links in the main post are deprioritized.
