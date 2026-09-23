# Section Report: Clipping / Content Factory Strategy

Source: `subah-playbook.md` (section from "Lovable has Antonosika…" through end).
Scope: content factory, engineered clips, curation, distribution network, the math, bottlenecks.

## Summary

Clipping is a distribution strategy borrowed from streamers and musicians: take long-form founder content (podcasts, talks, demos), extract hundreds of short clips, and flood short-form platforms with them so the same face and message hit the target audience 5-10 times a week (marketing rule of 7). Tech is just adopting it (Lovable, Replit, Wispr Flow, Emergent), and the playbook's core claims are: the bottleneck is source content quality, not editing; volume beats precision (most clips die, ~1 in 500 pops); curation and moderation must be human; and winners are found within 48 hours and then redeployed 10x. For meme-maker — a solo open-source devtool launch, not a funded GTM team — the applicable version is a scaled-down "content factory of one": record long raw sessions (building in public, live agent demos), engineer them so every 60-90s segment stands alone, curate ruthlessly, and post a steady high-volume stream of short demo clips and memes (fittingly, made with meme-maker itself) rather than betting everything on one launch post.

## Tactics

- **Volume math: post 100+ clips, expect most to die.** Every platform tests a post on a small audience in the first hour; engagement velocity decides its fate. The math only works at 100+ posts/week, not 10. `For meme-maker:` prepare a bank of 30-60 short clips/GIFs/memes before launch week and post several per day across X (and repurpose to LinkedIn/Reels/Shorts), instead of relying on one launch tweet.
- **Extract, don't create: 100 clips from one 3-hour shoot.** You can't write 100 unique posts a day, but you can slice one long recording into 100 clips with 50 variations. `For meme-maker:` record one long screen session — Kartik driving an agent that discovers templates and renders memes live — and cut it into dozens of standalone 15-60s clips.
- **Rule of 7: repetition builds trust.** Rogan feels familiar because you see 600 clips a week; the 7th exposure to a founder makes people trust him. `For meme-maker:` keep Kartik's face/voice and the meme-maker name in every clip so AI Twitter sees the same builder repeatedly during launch month.
- **Source content is the bottleneck — production over editing.** 90% of campaigns fail because raw footage is boring; clips need raw conviction, strong takes, complete stories, not media-trained PR speak. `For meme-maker:` script hooks in advance ("I gave my AI agent 609 meme templates and let it loose", "why deterministic rendering matters for agents") and deliver them unfiltered, building-in-public style.
- **Engineer for standalone segments.** Every 60-90s block should stand alone: question is a hook, answer is a complete story with a dopamine hit at the end. `For meme-maker:` structure demo recordings as hook → agent does something surprising → punchline meme appears; never a linear walkthrough.
- **Curate before distributing.** Passing raw footage to clippers yields 90% unusable output; someone with taste must watch everything and pull the 30-50 segments that convert with the ICP. `For meme-maker:` Kartik (or a Devin session) reviews all raw material and selects only clips that land with AI engineers/agent builders — funny AND technically credible.
- **Track for 48 hours, then double down 10x.** Winners reveal themselves fast (which hooks, formats, platforms); redeploy the winning content at 10x through the whole network. `For meme-maker:` watch impressions/bookmarks per clip during launch week; when one format pops (e.g. "agent makes a meme about its own failure"), immediately produce 5-10 variations of it.
- **Funnel attention back on every clip.** Bio links to founder + company, small logo overlay on the clip, founder + company tagged in every caption; one client's Google search interest jumped 50%. `For meme-maker:` every clip/meme carries the repo URL or `curl` installer one-liner, a small meme-maker mark, and links back to @kartikkabadi + the GitHub repo.
- **Moderate everything for brand safety.** One badly stitched clip that takes off can create a PR crisis; review every clip against guidelines soon after it goes live. `For meme-maker:` keep a simple checklist (no offensive template pairings, no misleading claims, MIT/attribution respected) and review each post — especially since memes are inherently edgy.
- **Sustained spend beats one-off experiments.** $10k experiments produce experimental results; the exponential curve starts with months of sustained repetition. `For meme-maker:` commit to 4-8 weeks of daily meme/clip output post-launch rather than a one-week burst.

## Don't do this (anti-patterns)

- Don't hand raw, boring footage to editors/clippers and expect virality — bad source content kills everything downstream.
- Don't make clips that are direct product pitches; "our product is great" content gets ignored. People follow people.
- Don't be media-trained/polished — sanded-down corporate delivery doesn't clip.
- Don't record linear, listen-through content; segments must stand alone.
- Don't run a tiny one-week experiment and conclude clipping doesn't work.
- Don't skip moderation at volume — one bad clip can become the story.
- Don't judge success clip-by-clip; judge the portfolio (most clips are supposed to die).

## Concrete next steps for the meme-maker launch

1. Record one long (60-120 min) raw screen+voice session: Kartik + an agent using meme-maker end-to-end (install via curl, MCP discovery, CLI render, GIF, web UI), engineered so each segment stands alone with a hook and payoff.
2. Cut 30-60 short clips (15-60s) with varied hooks/captions; make companion memes with meme-maker itself (dogfooding is the meta-story).
3. Curate to the best ~20 for launch week; every asset carries the repo link, install one-liner, and @kartikkabadi tag.
4. Post 3-5 assets/day across X during launch week; track impressions/bookmarks in a simple sheet.
5. At 48h, identify the winning hook/format and produce 5-10 variations of it immediately.
6. Sustain a lighter cadence (1-2 assets/day) for 4+ weeks after launch; repetition compounds.
