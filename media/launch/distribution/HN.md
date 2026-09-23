# Show HN — meme-maker

## Title (72 chars)

Show HN: Meme-maker – deterministic meme generation for AI agents (MCP/CLI)

## Body

I built a headless meme generator for AI agents. You give it one JSON spec
(template id + text per slot) and it renders a finished PNG/WebP/GIF. Same
spec in, same pixels out, every time — no image-gen model, no cloud, no
accounts, no telemetry. MIT.

Repo: https://github.com/kartikkabadi/meme-maker

Install is one curl (no npm, only Node >= 20):

    curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
    meme render --template drake --text no="MANUAL MEME EDITORS" --text yes="A CLI FOR AGENTS" -o out.png

What's in it:

- 609 templates (546 images, 63 GIFs), each with named text slots and provenance tracking
- Four surfaces, one engine: CLI, MCP server, HTTP/JSON API, local web UI
- `--json` everywhere, Zod-validated inputs, structured errors, sandboxed filesystem access — built so an LLM can discover templates, fill slots, and render without a GUI
- Deterministic rendering (Sharp + SVG text engine with auto-fit/wrap), so meme output is testable — there are golden-image tests in CI

Why deterministic templates instead of image gen: for the "agent reacts with
a meme" use case you want the canonical template, correct text, instantly,
locally, and reproducibly. Diffusion gets you a slightly melted Drake in
8 seconds and a GPU bill.

This started as a joke ("my agent can do everything except shitpost") and
got out of hand — the launch video for it was storyboarded as a JSON file
and rendered by the tool itself. Happy to answer questions about the text
auto-fit engine, GIF frame pipeline, or the MCP integration.

## Why HN will care

- Deterministic rendering: same MemeSpec → same pixels; golden-image tests, reproducible pipelines. A contrarian, defensible technical position vs. LLM image gen.
- MCP: a real, working stdio MCP server (five tools) people can wire into Claude Desktop/Codex in one config line — MCP examples that aren't toy demos are in demand.
- CLI/local-first: one-curl install, no npm, no accounts, runs entirely on your machine — classic HN values.
- Agent use-case: schema-validated JSON in, machine-readable JSON out; a concrete example of designing a tool surface for LLMs rather than humans.

## OP comment (post after 15–30 min)

Likely first question: "why not just have the LLM generate the image?"

> Author here. The obvious question is "why not diffusion?" — and for memes
> specifically, generation is the wrong tool. A meme works because the
> template is canonical; a slightly-off Drake reads as slop. Templates + a
> text engine give you the exact image, in ~100ms, offline, and
> deterministically — which also means you can snapshot-test meme output in
> CI (the repo does; golden-image tests). The hard parts turned out to be
> boring ones: auto-fitting text into arbitrary slot rects (binary search on
> font size over SVG text metrics, per-codepoint font fallback for emoji),
> and keeping GIF timing/disposal metadata intact while compositing text on
> every frame.
