# Asset size analysis (2026-07)

Measured on `main` at v0.3.0 (609-template catalog).

## npm package

`npm pack --dry-run`: **88.0 MB packed / 91.2 MB unpacked, 1857 files** — almost
entirely `assets/templates` (~89 MB).

Breakdown by format:

| Format | Files | Size |
| --- | --- | --- |
| GIF | 63 | 41.3 MB |
| JPG | 545 | 39.3 MB |
| WebP (thumbs) | 609 | 5.6 MB |
| PNG | 1 | 1.2 MB |
| JSON (manifests) | 618 | 0.9 MB |

By group (see `npm run report:assets` for a live report):

| Group | Size |
| --- | --- |
| packs/animated | 28 MB |
| packs/reactions | 7.4 MB |
| gifs (v1) | 13 MB |
| images (v1) | 7.4 MB |
| thumbs | 6.6 MB |
| other packs (6) | ~27 MB |
| fonts | 2.7 MB |

## JPG compression

Sampled JPGs are already encoded at quality 80–90 at modest dimensions
(typically 500–1200 px wide, avg ~72 KB/file). Re-encoding at q75 or
downscaling below ~800 px would save only a few MB in total and risks visible
artifacts on text-heavy panels. **Not worth recompressing.**

## GIFs

All GIFs are already downscaled to 320 px wide. The distribution is healthy:
median ~500 KB. Outliers (flagged by `report:assets`):

- `gifs/deal-with-it.gif` — 3.6 MB, 47 frames. Could drop to ~24 frames /
  lower fps for ~50% savings, but frame drops are visible on this template.
- `gifs/mind-blown.gif` (1.3 MB), `gifs/confused-monkey.gif` (1.2 MB) — similar
  trade-off.
- `packs/reactions/images/chess-doge.png` (1.2 MB) — could be JPG (~150 KB) at
  the cost of alpha; left as-is pending a template-quality pass.

Lossy GIF recompression would change rendered golden outputs and risk test
breakage for ~4 MB of savings, so it is deferred.

## Chosen strategy: slim release tarball + runtime fetch

Since per-file recompression yields marginal wins, the effective lever is not
shipping templates in the distributed artifact at all (distribution is via
GitHub Release tarballs / curl installer, not the npm registry):

- `npm run build:slim-tarball` builds a tarball with only `dist` +
  `assets/fonts` (1.7 MB packed / 3.0 MB unpacked instead of 88 MB).
- `meme templates fetch [--dest <dir>] [--ref <ref>]` downloads
  `assets/templates` from GitHub into `~/.cache/meme-maker/templates`, which
  the catalog uses automatically when no bundled templates exist.
- `MEME_TEMPLATES_DIR` / `--templates-dir` still override everything.

Templates remain in git unchanged.
