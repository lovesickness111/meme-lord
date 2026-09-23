# meme-maker v0.3.1 — Long-form Distribution Copy

Cross-platform long-form posts for launch week. Frame everywhere: **"the meme
engine for AI agents"** — never "meme generator". Proof first, adjectives never.

---

## LinkedIn post (founder-led)

> I gave my AI agent the ability to shitpost, and I'm shipping it today.
>
> Here's the gap I kept hitting: agents can write code, file PRs, and run
> pipelines — but the moment you want one to reply with a meme, you're back to
> a browser-based editor built for humans. No API worth the name, no
> reproducibility, watermarks, accounts, rate limits.
>
> So I built meme-maker: the meme engine for AI agents. One JSON spec in,
> pixels out. 609 templates (images + GIFs), deterministic rendering — the
> same spec always produces the same pixels, so it behaves like any other
> build artifact. It runs headless on your machine: CLI, MCP server, HTTP
> API, and a local web UI, all driven by the same schema-validated spec.
>
> No cloud, no npm, no accounts, no telemetry. Open source, MIT. Installs
> with one curl. Even the launch video was rendered by meme-maker itself —
> the storyboard is a JSON file in the repo.
>
> If you're building agents and want them to communicate like the internet
> actually communicates, the repo is here:
> https://github.com/kartikkabadi/meme-maker

(One CTA, no hashtags. Post day-of, +8–12h after the X launch per
LAUNCH-STRATEGY.md.)

---

## dev.to article

**Title:** Building a deterministic meme engine for AI agents (CLI, MCP, HTTP — no cloud)

**Outline (5 sections):**

1. **Why agents need a meme engine, not a meme generator**
   - Agents can code, test, deploy — but memes still require a GUI built for humans.
   - Existing tools: cloud, accounts, watermarks, non-reproducible output.
   - Design goal: memes as a build artifact — "the last mile of agent communication."

2. **One JSON spec in, pixels out: the MemeSpec**
   - Declarative, Zod-validated spec: template id, named text slots, output format.
   - Same spec → same pixels, every time. Golden-image tests in CI.
   - Show the drake example spec and the rendered result.

3. **Four surfaces, one engine**
   - CLI (`--json` everywhere, structured errors), MCP server (5 tools, stdio),
     HTTP API, local web UI — all thin wrappers over the same render pipeline.
   - Why MCP: an agent can discover templates, fill slots, and render without
     ever seeing a GUI. Config snippets for Claude Desktop / Codex.

4. **The hard parts: text fitting, GIFs, and determinism**
   - SVG-based text engine: auto-fit, wrapping, per-codepoint font fallback
     (Anton → Noto Sans → Noto Emoji).
   - GIF pipeline: per-frame compositing while preserving animation metadata.
   - Resource caps for untrusted input (pixels, frames, text length, timeouts).

5. **Local-first distribution: no npm, one curl**
   - Pre-built release tarball; only dependency is Node >= 20.
   - Slim install (~2 MB) + `meme templates fetch` for the ~89 MB catalog.
   - No telemetry, MIT — and what's next on the roadmap.

---

## Indie Hackers post

**Title:** I built a meme engine for AI agents — 609 templates, one curl to install, fully local

**Teaser:**

My agent could write code, open PRs, and triage CI failures — but it couldn't
post a meme, which is arguably the more important skill on the internet. Every
meme tool assumes a human with a mouse: cloud editors, accounts, watermarks,
and output that changes between runs. Nothing an agent could actually call.

So I built meme-maker: headless, deterministic meme generation. One JSON spec
in, pixels out — the same spec always renders the same pixels, so memes behave
like any other build artifact. 609 templates (images + GIFs), exposed as a
CLI, an MCP server, an HTTP API, and a local web UI. No cloud, no npm, no
accounts, no telemetry; installs with one curl. Open source, MIT. Happy to
answer anything about MCP, deterministic rendering, or launching a deliberately
silly piece of infrastructure. https://github.com/kartikkabadi/meme-maker

---

## Optional: launch week recap skeleton (day-2 follow-up)

**Title:** meme-maker launch, 24 hours in

- **Numbers first:** X installs (install.sh hits), Y GitHub stars, Z HN points —
  the KPI was installs + stars, not views.
- **What worked:** [winning hook/angle — e.g. dogfooding beat / MCP-vs-CLI
  thread / live GIF replies]; every reply that was itself a rendered meme
  outperformed plain text.
- **What didn't:** [flat angle or channel — cut it].
- **Best question from the community:** [question] — answer inline, with a
  rendered meme.
- **What's next:** [1–2 concrete items from the roadmap]; sustaining 1–2
  assets/day for the next 4 weeks.
- **CTA:** repo link + one-line install.
