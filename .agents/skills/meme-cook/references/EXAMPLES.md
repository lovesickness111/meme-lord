# Meme Cook — Command Examples

## Mode A — CLI mode (repo cloned locally)

### List all templates

```sh
npx tsx src/cli.ts templates list --json
```

### Suggest templates for a brief

```sh
npx tsx src/cli.ts templates suggest "sarcastic betrayal, trust and disappointment" --json
```

### Show a template's slots

```sh
npx tsx src/cli.ts templates show drake --json
```

### Render a single meme

```sh
npx tsx src/cli.ts render \
  --template drake \
  --text no="Còn đang dùng Claude Code" \
  --text yes="Bỏ sang Codex vì ngon hơn" \
  -o meme.png --json
```

### Render and save to a specific path

```sh
npx tsx src/cli.ts render \
  --template distracted-boyfriend \
  --text other-woman="Codex" \
  --text boyfriend="Dev đang dùng Claude" \
  --text girlfriend="Claude Code" \
  -o /tmp/meme_output.png --force --json
```

---

## Mode B — MCP mode (user installed via npm)

When the user has registered the MCP server, call these tools in order:

### 1. Suggest templates
```json
{
  "tool": "suggest_templates",
  "brief": "sarcastic reaction, someone discovering a better tool after already paying for one"
}
```

### 2. Get template details
```json
{
  "tool": "get_template",
  "id": "drake"
}
```

### 3. Measure meme (verify before render)
```json
{
  "tool": "measure_meme",
  "spec": {
    "base": { "kind": "template", "id": "drake" },
    "texts": [
      { "slot": "no", "text": "Còn đang dùng Claude Code" },
      { "slot": "yes", "text": "Bỏ sang Codex vì ngon hơn" }
    ]
  }
}
```

### 4. Render meme
```json
{
  "tool": "render_meme",
  "spec": {
    "base": { "kind": "template", "id": "drake" },
    "texts": [
      { "slot": "no", "text": "Còn đang dùng Claude Code" },
      { "slot": "yes", "text": "Bỏ sang Codex vì ngon hơn" }
    ],
    "output": { "path": "meme.png", "format": "png", "onDegrade": "error" }
  }
}
```

---

## Subagent structured output schema

```json
{
  "type": "object",
  "properties": {
    "template_id": { "type": "string" },
    "concept": { "type": "string" },
    "caption_text": { "type": "string" },
    "rendered_image_path": { "type": "string" }
  },
  "required": ["template_id", "concept", "caption_text", "rendered_image_path"]
}
```

---

## Fetch an X/Twitter thread (curl example)

```sh
curl -sL "https://api.fxtwitter.com/2/conversation/<status_id>" > thread.json
```

---

## Build and test the repo (Mode A setup)

```sh
npm install
npm run build
npm run build:manifest
npm run build:thumbs
npm test
npm run lint
```
