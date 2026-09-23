# meme-maker v0.3.1 — Reddit Distribution Copy

Cross-posting window: **T+8–12h after the X launch** (Tue, Jul 22, 2026, 6:30 PM
IST / 9:00 AM ET), per `LAUNCH-STRATEGY.md`. All posts are **text posts** — every
one of these subreddits deprioritizes or removes bare link-drops for self-promo.
Include a rendered example in each post (upload the image/GIF natively where the
subreddit allows media in text posts, otherwise link to the file in the repo).

Golden rules for all five posts:

- Stay in the thread and answer every comment for the first 2–3 hours.
- Answer comments plainly; render a meme in reply only where the subreddit's
  culture supports it (fine in r/LocalLLaMA and r/mcp, avoid in r/opensource).
- Disclose that you're the author in the first line or comment — all five
  subreddits require or expect it.
- One subreddit at a time, spaced ~30–60 min apart, so each post gets its own
  first-hour attention. Suggested order: r/LocalLLaMA → r/mcp → r/commandline →
  r/selfhosted → r/opensource.

Reusable rendered example (generate fresh before posting):

```sh
meme render --template drake \
  --text no="MANUAL MEME EDITORS" --text yes="A CLI FOR AGENTS" -o drake.png --json
# → { "path": "drake.png", "width": 1200, "height": 1200, "format": "png", ... }
```

---

## r/LocalLLaMA

**Title:** I built a local, deterministic meme engine my agents can call — 609 templates, MCP/CLI/HTTP, no cloud

**Post type:** Text post (attach a rendered meme + the JSON spec that produced it)

**Body:**

I got tired of my agents being able to refactor a codebase but not post a
decent meme, so I built meme-maker: a fully local meme rendering engine. One
JSON spec in, pixels out — same spec, same pixels, every time. No diffusion, no
cloud API, no accounts, no telemetry. It runs entirely on your machine
(Node >= 20, installed from a release tarball — no npm).

The agent-facing part is the interesting bit: an MCP server
(`list_templates`, `get_template`, `render_meme`, plus layout/preview tools),
an HTTP/JSON API, and a CLI where every command takes `--json` and returns
structured errors. 609 templates (546 images, 63 GIFs), each with named text
slots and schema-validated (Zod) inputs, so a local model can discover a
template, fill the slots, and render without ever seeing a GUI. The spec above
rendered the attached image.

Install is one curl:
`curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh`
— MIT, source at https://github.com/kartikkabadi/meme-maker. Happy to answer
questions about the deterministic text engine (SVG-based auto-fit/wrap) or the
GIF pipeline.

**Timing:** T+8h (first Reddit post; this community overlaps most with the X audience).

---

## r/mcp

**Title:** meme-maker-mcp: an MCP server that gives your agent 609 meme templates (deterministic rendering, local, MIT)

**Post type:** Text post (include the MCP config snippet and a `render_meme` call + its output image)

**Body:**

Author here. I shipped an MCP server that does exactly one thing: lets an
agent render memes. Stdio transport, five tools — `list_templates`,
`get_template`, `render_meme`, `render_layout`, `preview_template`. `render_meme`
takes a declarative MemeSpec (template id + text per named slot) and returns
the rendered image inline plus a file path. All inputs are Zod-validated and
rendering is deterministic, so the same call always produces the same pixels —
easy to test, easy to cache.

Setup is a one-line install
(`curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh`)
and one line of host config:

```json
{ "mcpServers": { "meme-maker": { "command": "meme-maker-mcp" } } }
```

Everything runs locally — no cloud, no accounts, no telemetry — and filesystem
access is sandboxed (outputs confined to an output root, image reads opt-in).
There's also a CLI, HTTP API, and local web UI driven by the same engine if
MCP isn't your integration path. MIT:
https://github.com/kartikkabadi/meme-maker

**Timing:** T+8.5–9h (right after r/LocalLLaMA; smaller sub, most targeted audience).

---

## r/commandline

**Title:** meme: a CLI that renders memes from the terminal — 609 templates, JSON output, no cloud

**Post type:** Text post (lead with the one-liner and attach the resulting image)

**Body:**

```sh
meme render --template drake \
  --text no="MANUAL MEME EDITORS" --text yes="A CLI FOR AGENTS" -o drake.png
```

That's the whole workflow — template id, text per slot, output file. 609
templates (546 images, 63 GIFs) with named slots you can inspect via
`meme templates show drake`. Every command accepts `--json` for
machine-readable output and `--strict` to turn degraded-render warnings (text
overflow, missing glyphs) into hard failures, and errors come out as
structured JSON with exit code 1 — so it composes cleanly in scripts and
pipelines. Rendering is deterministic: same input, same pixels.

Installs from a release tarball with one curl (no npm; needs Node >= 20),
runs fully local, MIT: https://github.com/kartikkabadi/meme-maker

**Timing:** T+9–10h.

---

## r/selfhosted

**Title:** meme-maker: self-hosted meme generation with a web UI and HTTP API — no cloud, no accounts, no telemetry

**Post type:** Text post (attach a screenshot of the web UI gallery/editor)

**Body:**

Most meme generators are SaaS with watermarks and accounts. This one is a
single local install: `meme ui` starts a web app on 127.0.0.1 with a
609-template gallery, a live-preview editor, render history, and batch mode.
The same server exposes a JSON API (`/api/templates`, `/api/render`, ...), so
you can wire it into scripts or home-automation flows — POST a small JSON spec,
get a PNG/WebP/GIF back. There's also a CLI and an MCP server for AI agents,
all driven by the same rendering engine.

Nothing leaves your machine: no cloud, no accounts, no telemetry. Install is
one curl (release tarball, no npm; Node >= 20):
`curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh`.
The full template pack is ~89 MB, but there's a ~2 MB slim install that fetches
templates on demand if you're tight on space. MIT, source:
https://github.com/kartikkabadi/meme-maker

**Timing:** T+10–11h (later slot; less time-sensitive audience, strong evening EU/US traffic).

---

## r/opensource

**Title:** I open-sourced a deterministic meme rendering engine for AI agents (MIT) — 609 templates with tracked provenance

**Post type:** Text post

**Body:**

meme-maker is a headless meme generator: you describe a meme as a small JSON
document (which template, what text in which slot) and it renders a PNG, WebP,
or GIF. One TypeScript engine drives four surfaces — CLI, MCP server for AI
agents, HTTP API, and a local web UI. Rendering is deterministic (same spec,
same pixels), which makes golden-image testing and reproducible pipelines
practical.

The open-source hygiene was a project in itself, and I'd welcome scrutiny:
every one of the 609 templates has provenance tracked in the manifest and
the manifest, bundled fonts are all OFL 1.1 with licenses shipped, and the
the package runs locally. No cloud, no accounts, no telemetry — it installs from a
GitHub release tarball with one curl and runs entirely locally.

Repo: https://github.com/kartikkabadi/meme-maker — contributions welcome,
especially new templates (there's a documented catalog workflow in
docs/CONTRIBUTING.md).

**Timing:** T+11–12h (last post; general audience, no urgency window).
