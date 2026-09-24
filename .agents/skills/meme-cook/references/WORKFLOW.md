# Meme Cook — Full Workflow

A universal, agent-friendly workflow for turning any topic, tweet, thread, or link into a curated set of memes.

> **Before you start:** Check which mode you are in.
> - **Mode A (CLI):** Agent is running inside the cloned `meme-lord` repo. Use `npx tsx src/cli.ts` commands.
> - **Mode B (MCP):** User installed via npm and registered the MCP server. Use MCP tool calls (`render_meme`, `suggest_templates`, etc.).

---

## 1. Fetch the source material

- For a topic or description: use it directly as the brief.
- For an X/Twitter thread, use `https://api.fxtwitter.com/<status>` for the root tweet and `https://api.fxtwitter.com/2/conversation/<id>` for the full reply list.
- Save the JSON locally and parse the root tweet plus the top 20-40 replies.
- If the source is an article or another site, use a fetch/read tool to get the text.
- Extract the main claim, the jokes, quoted phrases, and any recurring memes or references.

## 2. Research named things

- If the topic mentions a person, company, product, or acronym, run a quick web search.
- Drop 1-3 sentences of the most useful context into the prompts that will generate captions.
- Do not over-research; only pull facts that make the meme land.

## 3. Generate angles

- Derive 6-10 distinct angles from the source material itself, not from generic meme templates.
- Each angle should be a single idea: a quoted reply, a central joke, a skeptical take, a pun, a milestone, a conflict, etc.
- If the user asked for "a lot" or "ultra", generate 15-20 angles, then curate.

## 4. Delegate each angle (if subagents are available)

- Spawn one worker per angle.
- Give every worker:
  - the full source context,
  - the assigned angle,
  - a template blacklist,
  - the render/verify instructions,
  - a shared structured output schema: `template_id`, `concept`, `caption_text`, `rendered_image_path`.
- If no subagents are available, run the same steps sequentially.

## 5. Render

### Suggesting Templates

When using `suggest_templates` or similar tools:
- **Brief MUST be in English**. Translate the user's scenario into a description of the humor mechanic (e.g. User: "trêu bạn bị limit quota Claude" -> Agent brief: "frustration, impatience, waiting, craving, addiction, comparison between tools").
- If `suggest_templates` returns empty, fall back to `meme templates list --search "<keywords>"` or `--category "<category>"`. Browse by category if needed.

### Mode A — CLI (repo cloned)

To render a single meme:
```sh
npx tsx src/cli.ts render --template <id> --text <slot>="<text>" ... -o <path> --force --json
```

To render multiple memes quickly, write an array of MemeSpecs to `specs.json` and run:
```sh
npx tsx src/cli.ts spec render specs.json --json
```

### Mode B — MCP (npm install)

Call `measure_meme` first to verify captions fit, then call `render_meme`:

```json
{
  "tool": "render_meme",
  "spec": {
    "base": { "kind": "template", "id": "<template_id>" },
    "texts": [{ "slot": "<slot>", "text": "<caption>" }],
    "output": { "path": "<output_path>", "format": "png", "onDegrade": "error" }
  }
}
```

Use 1-3 short lines per text slot. Verify the output file exists and `width`/`height`/`bytes` look reasonable.

## 6. Verify readability

- Inspect rendered text with an image-reading tool or by eye.
- Reject memes where text overflows, is hard to read, or the template does not reinforce the joke.

## 7. Curate

- Deduplicate by `template_id`; keep the strongest caption for each.
- Drop overly wordy, cluttered, or generic options.
- Aim for 6-12 final options.

## 8. Present

- Number each option.
- Give each a one-line description.
- Attach the rendered PNGs.
- End with: "Pick one and I'll clean it up."

## 9. Polish the chosen meme

- Adjust caption text, wording, or template if the user asks.
- Re-render and re-verify.
- If a user wants to add the image to the catalog, see [references/NEW_TEMPLATE.md](references/NEW_TEMPLATE.md).
