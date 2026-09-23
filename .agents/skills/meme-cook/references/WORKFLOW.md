# Meme Cook — Full Workflow

A universal, agent-friendly workflow for turning a tweet, thread, topic, or link into a curated set of memes.

## 1. Fetch the source material

- For an X/Twitter thread, use `https://api.fxtwitter.com/<status>` for the root tweet and `https://api.fxtwitter.com/2/conversation/<id>` for the full reply list.
- Save the JSON locally and parse the root tweet plus the top 20-40 replies.
- If the source is an article or another site, use a fetch/read tool to get the text.
- Extract the main claim, the jokes, quoted phrases, and any recurring memes or references.

## 2. Research named things

- If the thread mentions a person, company, product, protocol, or acronym (e.g., OpenCode, Dax Raad, BUZZ, Codex resets), run a quick web search.
- Drop 1-3 sentences of the most useful context into the prompts that will generate captions.
- Do not over-research; only pull facts that make the meme land.

## 3. Generate angles

- Derive 6-10 distinct angles from the thread itself, not from generic meme templates.
- Each angle should be a single idea: a quoted reply, a central joke, a skeptical take, a pun, a milestone, a conflict, etc.
- If the user asked for "a lot" or "ultra", generate 15-20 angles, then curate.

## 4. Delegate each angle (if subagents are available)

- Spawn one worker per angle.
- Give every worker:
  - the full thread context,
  - the assigned angle,
  - a template blacklist,
  - the render/verify/upload instructions,
  - a shared structured output schema: `template_id`, `concept`, `caption_text`, `rendered_image_url`.
- If no subagents are available, run the same steps sequentially.

## 5. Render

- Use the repo's CLI:
  ```sh
  npx tsx src/cli.ts render --template <id> --text <slot>="<text>" ... -o <path> --json
  ```
- If the repo is built and installed, `meme render` works too.
- Use 1-3 short lines per text slot.
- Verify the output file exists and `width`/`height`/`bytes` look reasonable.

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
