# Product Hunt Launch — meme-maker v0.3.1

## Name

**meme-maker** — the meme engine for AI agents

## Tagline (under 60 chars)

> The meme engine for AI agents

(30 chars. Alternates, all under 60:
- "Deterministic meme generation for AI agents" — 43 chars
- "One JSON spec in, pixels out — memes for your agent" — 51 chars)

## Short description (under 260 chars)

> Headless, deterministic meme generation for AI agents. 609 templates (images + GIFs). One JSON spec in, pixels out. CLI, MCP, HTTP, web UI. No cloud, no npm, no accounts, no telemetry. Installs with one curl. Open source, MIT.

(226 chars.)

## Expanded description

Your agent can write code, file PRs, and answer support tickets — but it can't shitpost. meme-maker fixes that.

It's a headless meme engine built for programmatic use: you (or your agent) describe a meme as a small JSON document — which template, what text in which slot — and it renders finished pixels. Same spec, same pixels, every time.

- **609 templates** — 546 static images and 63 animated GIFs, each with named text slots and provenance tracking
- **One JSON spec in, pixels out** — every input is schema-validated, every output is machine-readable
- **Four surfaces, one engine** — CLI, MCP server, HTTP API, and a local web UI for humans
- **Fully local** — no cloud, no npm, no accounts, no telemetry

Install in 10 seconds:

```sh
curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
```

Then point your agent at the MCP server (`meme-maker-mcp`) and let it discover templates, fill slots, and render — no GUI, no image-gen slop.

Open source, MIT: https://github.com/kartikkabadi/meme-maker

## What makes it different

- **Built for agents, not humans first** — MCP server, `--json` on every CLI command, structured errors, machine-readable schemas. An LLM can use the whole thing without ever seeing a GUI.
- **Deterministic, not generative** — template rendering, not image gen. The same spec always produces the same pixels, so memes work in tests and reproducible pipelines.
- **One spec, four surfaces** — the same MemeSpec JSON drives the CLI, MCP server, HTTP API, and web UI.
- **Zero dependencies on anyone's cloud** — one curl to install, runs entirely on your machine. No accounts, no API keys, no telemetry.
- **609 curated templates** — images and GIFs with named slots and hints (drake has `no` and `yes`), so agents know what goes where.

## Maker comment (first comment from Kartik)

Hey PH 👋 Kartik here.

I built meme-maker because my agents could do everything except shitpost. Every meme tool assumes a human with a mouse; agents need schemas, determinism, and machine-readable errors.

So this is a meme *engine*: one JSON spec in, pixels out. 609 templates with named text slots, and the same spec renders identically every time — which sounds boring until your agent's memes are part of a pipeline you actually want to test.

It runs fully local (no cloud, no accounts, no telemetry) and installs with one curl. Wire it into Claude, Codex, or any MCP host and your agent can browse templates and render memes on its own. There's also a plain CLI and a small web UI for humans.

Fun fact: our launch video was rendered by meme-maker itself — the storyboard is a JSON file in the repo.

It's MIT-licensed and I'd love feedback — especially from anyone wiring it into an agent. What's the first thing you'd have your agent meme about?

## Discussion prompts (to seed comments)

1. "If you're wiring this into an agent, do you go MCP server or just shell out to the CLI? Genuinely curious what people prefer."
2. "Hot take baked into the design: deterministic template rendering > LLM image gen for memes. Same spec, same pixels, no slop. Agree or fight me in the comments."
3. "Do agents actually *need* memes? My take: memes are the last mile of agent communication. What would yours meme about first — CI failures? Code review?"

## Category / tag suggestions

- **Primary category:** Developer Tools
- **Additional topics/tags:** Artificial Intelligence, Open Source, GitHub, API, Bots, Funny / Memes
- **Pricing:** Free (open source, MIT)

## Launch assets checklist

- Gallery: web UI editor screenshot (`docs/assets/screenshots/ui-editor-drake.webp`), gallery screenshot, MCP tool-call example, template contact sheet, and 1–2 rendered memes (including a GIF)
- Video: reuse the 28s launch video (square, works muted)
- First comment posted immediately by Kartik (above)
- Link: https://github.com/kartikkabadi/meme-maker
