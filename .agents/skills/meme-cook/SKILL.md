---
name: meme-cook
description: Cook banger memes from a topic, tweet, thread, or link using the meme-lord catalog (610 templates). Use when the user asks for a meme, reaction image, banger, or wants to turn any content into memes.
license: MIT
metadata:
  author: nvcuong1
  version: "1.1"
---

# Meme Cook

This skill turns a topic, tweet, thread, or link into a curated set of high-quality, platform-ready memes using the `meme-lord` toolkit.

## When to use

- User asks for a meme for any topic, tweet, thread, or link.
- User says "cook", "make a banger", "meme this", "give me options", or similar.
- User wants to add a new reaction image/template to the catalog.

## Inputs

- A topic, tweet/thread URL, article link, or short description.
- Desired tone (funny, sarcastic, ironic, nostalgic, etc.).
- Number of options desired (default 6-10; if user says "a lot" or "ultra", generate 15-20 then curate down).

## Outputs

- A curated set of rendered PNG memes with one-line descriptions.
- The user picks one; then polish/tweak the chosen one.

## How to render (choose based on setup)

### Mode A — CLI mode (repo cloned locally)

Use this when the agent is running inside the cloned `meme-lord` repo workspace:

```sh
npx tsx src/cli.ts render --template <id> --text <slot>="<text>" ... -o <path> --json
```

### Mode B — MCP mode (user installed via npm)

Use this when the user has registered `meme-lord` as an MCP server via:
```sh
claude mcp add --scope user meme-lord -- cmd /c npx -y @nvcuong1/meme-lord mcp
```

Call the MCP tools in this order:
1. `suggest_templates` — get template candidates for the humor mechanic. **Brief MUST be in English** and describe the humor mechanic (e.g., "sarcastic betrayal, trust and disappointment", not "Claude bị limit"). Translate user's intent into English humor keywords before calling suggest.
2. `get_template` — inspect slots of the chosen template.
3. `measure_meme` — verify caption fits before rendering.
4. `render_meme` with `output.onDegrade: "error"` — render the final image.

> The MCP server runs as a **local stdio process** on the user's machine — not on any remote server. All rendering is offline and local.

## Quick workflow

1. **Fetch** the source material (URL, topic, or description).
2. **Research** any people, products, or in-jokes that appear.
3. **Generate angles** — 6-10 distinct humor angles (not generic jokes).
4. **Render** one meme per angle using Mode A (CLI) or Mode B (MCP).
5. **Verify** text is readable and the template fits the joke.
6. **Curate** down to the strongest, least-cluttered options.
7. **Present** with one-line descriptions and ask the user to pick one.

See [references/WORKFLOW.md](references/WORKFLOW.md) for the full workflow, [references/GUIDE.md](references/GUIDE.md) for caption/template rules, and [references/EXAMPLES.md](references/EXAMPLES.md) for example commands.

## On delegation

If your platform supports parallel workers or subagents, delegate each angle to a dedicated worker. Pass the full context, the assigned angle, and a template blacklist to every worker. Collect rendered images then curate.

If your platform does not support subagents, run the steps in order while keeping each angle self-contained.
