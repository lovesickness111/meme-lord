# meme-maker v0.3.1 — X Thread + Follow-up Posts

Frame (verbatim, everywhere): **"the meme engine for AI agents."** Never "meme generator."
KPI: curl installs + GitHub stars in the first 48h. Link goes in a reply, never the main post.

## Main thread (5 tweets)

Tweet 1 is the launch tweet (native video attached, no hashtags, no mentions).
Tweets 2–5 post as replies to it, in order, right after the pinned install reply.

### 1/5 — the launch tweet (214 chars)

```
meme-maker: deterministic meme generation for AI agents.

609 templates. one JSON spec in, pixels out. CLI, MCP, HTTP, web UI. no cloud, no npm — one curl to install.

open source, MIT.
```

### 2/5 — proof: the spec (~250 chars)

```
the whole product is one JSON spec. this is a complete meme:

{
  "base": { "kind": "template", "id": "drake" },
  "texts": [
    { "slot": "no", "text": "MANUAL MEME EDITORS" },
    { "slot": "yes", "text": "A CLI FOR AGENTS" }
  ]
}

same spec, same pixels, every time.
```

### 3/5 — four surfaces (~230 chars)

```
one engine, four surfaces:

- CLI: meme render --template drake --text no="..." --text yes="..."
- MCP server: 5 tools your agent calls directly
- HTTP: POST the spec to /api/render
- web UI: gallery, live editor, batch mode

all local. no accounts, no telemetry.
```

### 4/5 — why deterministic (~240 chars)

```
why not just LLM image gen? because agents need reproducibility.

deterministic template rendering means the same spec renders the same bytes — you can golden-test memes in CI. inputs are zod-validated, errors are structured JSON. memes as a build artifact.
```

### 5/5 — install CTA (~200 chars)

```
609 templates (546 images + 63 GIFs), MIT, installs in 10 seconds:

curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh

repo: github.com/kartikkabadi/meme-maker

give your agent a sense of humor.
```

## Follow-up / quote-tweet posts (first 24h)

Standalone posts or QTs of the main tweet. Post 1–2 in the first 4h, drip the rest. Each under 280 chars.

### A — MCP angle (QT the main tweet)

```
if your agent speaks MCP, it can meme.

add one line to your config:

"meme-maker": { "command": "meme-maker-mcp" }

5 tools: list_templates, get_template, render_meme, render_layout, preview_template. the render comes back inline. that's the whole integration.
```

### B — 609 templates (standalone, attach the contact sheet image)

```
609 templates ship with meme-maker: 546 images + 63 GIFs. drake, distracted-boyfriend, expanding-brain, woman-yelling-at-cat, crab-rave...

every one has named text slots + hints so an agent knows what goes where. provenance tracked per template.
```

### C — dogfooding (QT the main tweet)

```
everything in the launch video was rendered by meme-maker itself — the storyboard is a JSON file in the repo. dogfooding all the way down.
```

### D — no npm (standalone)

```
meme-maker is not on npm. on purpose.

one curl fetches a pre-built tarball, drops two binaries on your PATH, done. only dependency is Node >= 20. no lockfile, no supply chain, no postinstall scripts.

uninstall = delete two files.
```

### E — community memes (standalone, post once replies start coming in with renders)

```
best part of launch day: people are replying with memes their agents made with meme-maker. every reply is a product demo.

keep them coming — one JSON spec, pixels out:

curl -fsSL https://raw.githubusercontent.com/kartikkabadi/meme-maker/main/install.sh | sh
```

## Reply memes (rendered by meme-maker itself)

Pre-rendered assets in `media/launch/distribution/memes/`, each with the exact command. Use them as replies in the war room.

### 1. `drake-reply.png` — for the "why not just use imgflip" replies

```sh
meme render --template drake \
  --text no="MEME APIS WITH ACCOUNTS AND RATE LIMITS" \
  --text yes="ONE CURL, RUNS ON YOUR MACHINE" \
  -o media/launch/distribution/memes/drake-reply.png
```

### 2. `expanding-brain-reply.png` — for the MCP-vs-CLI thread

```sh
meme render --template expanding-brain \
  --text level1="COPY MEMES FROM GOOGLE IMAGES" \
  --text level2="SHELL OUT TO THE CLI" \
  --text level3="POST A SPEC TO THE HTTP API" \
  --text level4="YOUR AGENT CALLS render_meme OVER MCP" \
  -o media/launch/distribution/memes/expanding-brain-reply.png
```

### 3. `woman-yelling-reply.png` — for the "do agents actually need memes" skeptics

```sh
meme render --template woman-yelling-at-cat \
  --text woman="AGENTS DON'T NEED MEMES" \
  --text cat="DETERMINISTIC SHITPOSTING, 609 TEMPLATES" \
  -o media/launch/distribution/memes/woman-yelling-reply.png
```

Serious line to pair with #3: "memes are the last mile of agent communication."
