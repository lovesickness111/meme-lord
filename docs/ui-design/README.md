# UI design prototype

Static, self-contained HTML/CSS mockups of the key `meme ui` screens from
[`../UI-DESIGN.md`](../UI-DESIGN.md). Design-only — no build step, no JS framework, not
wired to any API.

## Viewing

Open any file directly in a browser:

```
open docs/ui-design/prototype/gallery.html   # macOS
xdg-open docs/ui-design/prototype/gallery.html  # Linux
```

Screens:

- `prototype/gallery.html` — template gallery (tabs, tag chips, card grid)
- `prototype/editor.html` — editor: preview + slot overlay + warning chip, inspector disclosures, live spec
- `prototype/history.html` — My Memes / filesystem history grid
- `prototype/batch.html` — batch / contact-sheet review with per-cell warnings and typed errors

All tokens live in `prototype/tokens.css` (UI-DESIGN §1). The ◐ button toggles dark/light.
Thumbnails are placeholder gradients; in the real app they come from `/thumbs/:id`.
