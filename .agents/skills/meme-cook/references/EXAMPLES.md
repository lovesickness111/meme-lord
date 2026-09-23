# Meme Cook — Command Examples

## List templates

```sh
npx tsx src/cli.ts templates list --json
```

## Show a template's slots

```sh
npx tsx src/cli.ts templates show jordan-schlansky-staring --json
```

## Render a single meme

```sh
npx tsx src/cli.ts render \
  --template jordan-schlansky-staring \
  --text top="RATE MY SETUP" \
  --text bottom="JORDAN IS JUDGING YOU" \
  -o meme.png --json
```

## Render with a custom image base

```sh
npx tsx src/cli.ts render \
  --image assets/templates/images/jordan-schlansky-staring.jpg \
  --text top="CUSTOM TOP" \
  --text bottom="CUSTOM BOTTOM" \
  -o custom.png --json
```

## Subagent structured output schema (Devin example)

```json
{
  "type": "object",
  "properties": {
    "template_id": { "type": "string" },
    "concept": { "type": "string" },
    "caption_text": { "type": "string" },
    "rendered_image_url": { "type": "string" }
  },
  "required": ["template_id", "concept", "caption_text", "rendered_image_url"]
}
```

## Fetch an X thread (curl example)

```sh
curl -sL "https://api.fxtwitter.com/2/conversation/<status_id>" > thread.json
```

## Build and test the repo

```sh
npm install
npm run build
npm run build:manifest
npm run build:thumbs
npm test
npm run lint
```
