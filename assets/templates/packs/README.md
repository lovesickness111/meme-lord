# Template packs

Packs let many contributors add templates in parallel without id conflicts.
Each pack lives in its own directory:

```
assets/templates/packs/<pack>/
  pack.json          # optional pack metadata
  images/            # image templates + <id>.meta.json sidecars
  gifs/              # gif templates + <id>.meta.json sidecars
```

## pack.json

Optional. If missing, the pack id is derived from the directory name.

```json
{
  "id": "my-pack",
  "name": "My Pack",
  "tags": ["shared", "tag"]
}
```

- `id` (optional): prefix for generated template ids (defaults to the directory name).
- `name` (optional): human-readable pack name.
- `tags` (optional): merged into every template's tags.

## Generated ids and paths

For `assets/templates/packs/my-pack/images/foo.png`, `npm run build:manifest`
generates a template with `id: "my-pack-foo"`, `file: "packs/my-pack/images/foo.png"`,
and `pack: "my-pack"`. Sidecar `<id>.meta.json` files use the bare filename
(`foo.meta.json`) and the same format as root templates.

After adding files, run `npm run build:manifest` then `npm run build:thumbs`.
