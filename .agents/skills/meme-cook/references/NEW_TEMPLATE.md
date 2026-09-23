# Meme Cook — Adding a New Template to the Catalog

This is the repo's standard template-addition workflow.

1. Copy the image into `assets/templates/images/<id>.jpg` or `.png`.
2. Write `<id>.meta.json` next to it with:
   - `name`
   - `tags`
   - `category` (optional)
   - `slots` (rects + hints)
   - `source` (url, license, attribution)
3. Run `npm run build:manifest` to regenerate `assets/templates/manifest.json`.
4. Run `npm run build:thumbs` to regenerate thumbnails and `docs/contact-sheet.webp`.
5. Add source/attribution to `assets/templates/CREDITS.md` in alphabetical order.
6. Run `npm run build`, `npm test`, and `npm run lint`.
7. Test the new template:
   ```sh
   npx tsx src/cli.ts render --template <id> --text top="TEST" --text bottom="TEST" -o /tmp/test.png
   ```
8. Open a focused PR on a feature branch.

Do not edit `assets/templates/manifest.json` by hand.
