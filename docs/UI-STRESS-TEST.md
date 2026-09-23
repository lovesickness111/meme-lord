# UI Stress Test — Results

Automated browser stress test of the web UI (`meme ui`) using Playwright (headless Chromium)
against `http://127.0.0.1:37002` on main with 609 templates.

## Summary

47 automated checks across gallery, editor, edge-case text, download, My Memes, batch mode,
theme, keyboard shortcuts, mobile viewport, accessibility (axe-core), and performance.

**Final result: 47/47 pass** after the three fixes in this branch. No console errors or page
errors were observed across the whole run.

## Bugs found and fixed

1. **Stale keyboard handler race (`ui/src/app.tsx`)** — the global keydown listener was
   re-attached on every `view`/`showHelp` change via a deferred effect, so a keypress landing
   right after a state change hit a stale closure. Reproducible effects: `Esc` failed to close
   the `?` help dialog when pressed quickly after opening it, and `Esc` failed to leave the
   editor immediately after opening it from Batch → Edit. Fixed by attaching the listener once
   and reading current state through refs.
2. **Horizontal overflow at mobile width (`ui/src/styles.css`)** — at 375×667 the gallery top
   bar (brand + tabs + icon buttons) and the editor toolbar overflowed the viewport
   (`scrollWidth` 424px vs 375px), causing horizontal scrolling. Fixed by allowing `.topbar`
   and `.editor-topbar` to wrap.
3. **Missing a11y landmarks** — axe flagged no level-one heading and no `main` landmark in the
   editor. The brand is now a level-1 heading (`role="heading"`, `aria-level=1`) and the editor
   body is a `<main>` element.

## Test results by area

| Area | Checks | Result |
| --- | --- | --- |
| Gallery | 609 templates via API; 546 image + 63 GIF cards; tag chips filter (e.g. "reaction" → 76); search filters; empty state + clear filters; canvas/layout presets | pass |
| Editor | Templates from different packs load; preview renders; textareas match template slots; live preview updates while typing; GIF templates render | pass |
| Edge-case text | Empty, 1000+ chars, unicode/emoji/RTL, HTML/special chars — no crashes, preview renders, overflow warnings shown | pass |
| Download | Produces a valid PNG (magic bytes verified, 1.3 MB) | pass |
| My Memes | Save via button and Ctrl+S with toast; saved list shows entries; clicking re-opens editor; delete works | pass |
| Batch | Multiple spec files render (2 rendered), invalid JSON marked `INVALID_JSON`, summary strip counts correct, Edit opens editor | pass |
| Theme | Toggle applies without reload; persists across reload via `localStorage`; Ctrl+D works | pass |
| Shortcuts | `/` focuses search, `Esc` back/close, `?` help sheet, Ctrl+S save, Ctrl+D theme | pass |
| Mobile (375×667) | No horizontal scroll in gallery or editor after fix; textareas usable | pass |
| Accessibility | axe-core: 0 serious/critical violations in gallery and editor; visible focus outline; `aria-pressed` chips | pass |
| Performance | Initial gallery render ~150 ms with 546 cards; search response ~300 ms (debounced); scroll through full grid responsive | pass |

## UX notes (not fixed, low priority)

- Remaining axe findings in the editor are `moderate` only: the level-one heading is hidden in
  the editor view (top bar is replaced by the editor toolbar), and the warnings row sits outside
  a landmark.
- Gallery renders all 546 cards at once; thumbnails are lazy-loaded so this is fast today, but
  virtualization would help if the catalog grows by another order of magnitude.
- Batch "Export all" triggers one download per item, which browsers may throttle for large
  batches; a zip export could be friendlier.
- `Ctrl+S` in the editor is only bound while the editor is mounted; pressing it in the gallery
  falls through to the browser's save dialog (expected, but worth knowing).

## Reproducing

The test script drives Playwright headless Chromium against a running `meme ui` server,
using `axe-core` (dev-only, not committed) for a11y scans. Run `meme ui --port 37002` and
point the script at it; no repo changes are required for testing.
