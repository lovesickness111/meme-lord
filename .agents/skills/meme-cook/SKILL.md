---
name: meme-cook
description: Cook banger memes from a tweet, thread, topic, or link using the kartikkabadi/meme-maker catalog. Use when the user asks for a meme, reaction image, banger, or wants to turn a thread into memes.
license: MIT
metadata:
  author: Kartik Kabadi
  version: "1.0"
---

# Meme Cook

This skill turns a tweet, thread, topic, or link into a curated set of high-quality, platform-ready memes using the `kartikkabadi/meme-maker` repository.

## When to use

- User asks for a meme for a tweet/thread/link.
- User says "cook", "make a banger", "meme this", or "give me options".
- User wants to add a new reaction image/template to the catalog.

## Inputs

- A tweet/Thread URL, article link, or a short description/topic.
- Desired tone (funny, serious, huge, anti-something, etc.).
- Number of options desired (default 6-10; if user says "a lot" or "ultra", generate 15-20 then curate down).

## Outputs

- A curated set of rendered PNG memes with one-line descriptions.
- The user picks one; then polish/tweak the chosen one.

## Quick workflow

1. **Fetch** the source material.
2. **Research** any people, products, protocols, or in-jokes that appear.
3. **Generate angles** from the thread (not generic jokes).
4. **Render** one meme per angle using the repo's CLI.
5. **Verify** text is readable and the template fits the joke.
6. **Curate** down to the strongest, least-cluttered options.
7. **Present** with one-line descriptions and ask the user to pick one.

See [references/WORKFLOW.md](references/WORKFLOW.md) for the full universal workflow, [references/GUIDE.md](references/GUIDE.md) for caption/template rules, and [references/EXAMPLES.md](references/EXAMPLES.md) for example commands.

## On delegation

If your platform supports parallel workers or subagents (e.g., Devin's `devin_mcp devin_session_create` with `devin_mode: ultra`), delegate each angle to a dedicated worker. Pass the full thread context and a template blacklist to every worker. Collect rendered images and metadata, then curate.

If your platform does not support subagents, run the steps in order while keeping each angle self-contained.
