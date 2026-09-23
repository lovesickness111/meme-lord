# HTTP/API stress-test report

Stress test of the local HTTP server (`meme ui`) on `main` at 609 templates.
Roughly 3,000 requests were issued across every endpoint, including malformed,
hostile, and concurrent traffic. The server never crashed, leaked a file
outside its roots, or returned a malformed body.

## What was tested

| Area | Coverage | Result |
| --- | --- | --- |
| `GET /api/templates` | full list (609), `type`/`search`/`tag` filters, invalid/empty/oversized/`%00` filter values | pass |
| `GET /api/templates/:id` | all 609 ids, unknown ids, traversal (`../`, `%2e%2e`, `%00`), empty id | pass |
| `GET /thumbs/:id` | pack sample, webp signature + content-type, unknown/traversal ids | pass |
| `GET /api/preview/:id` | all 609 ids concurrently, PNG/GIF signatures, unknown/traversal ids | pass |
| `POST /api/measure` | template/canvas bases, missing base, unknown template/slot | pass |
| `POST /api/render` | template/canvas bases, GIF templates, webp/jpeg outputs, empty/long/unicode/emoji text, styles; rejects: negative/huge canvas, `/etc/passwd` + traversal image paths, absolute/traversal output paths, 100k text, bad formats/colors, extra keys | pass |
| `/api/history` | save/list/fetch/delete round-trip, traversal names (403), missing ids (404), invalid payloads, >37 MB payload (400) | pass |
| Malformed payloads | non-JSON body, empty body, >1 MB JSON, missing content-type | pass |
| SPA | `/`, client routes, static assets, unknown POST/PUT (404 JSON) | pass |
| Load | waves of 640 mixed requests from 80 threads (~500 req/s), 609 parallel previews | pass, no failures |

## Issues found (fixed in this branch)

1. **Unbounded preview cache memory growth.** `previewCache` kept every
   rendered preview forever; previewing all 609 templates (63 GIFs) retained
   ~470 MB of buffers (RSS 347 MB → 891 MB). Now byte-capped at 64 MB with
   oldest-first eviction; the same workload holds RSS at ~325 MB.
2. **Unknown `/api/*` GET routes returned the SPA.** A typo'd endpoint such as
   `GET /api/nonexistent` returned `index.html` with 200 instead of an error,
   which is misleading for API clients. Now returns a typed 404 JSON error.
3. **Static-root check used a raw prefix match.** `file.startsWith(resolve(uiDir))`
   would also accept a sibling directory like `dist/ui-extra`. Now requires a
   path-separator boundary. Not exploitable in practice (no such sibling
   ships), fixed as hardening.

## Minor observations (not fixed)

- `POST /api/history` does not verify the `png` payload is actually a PNG;
  `Buffer.from(str, 'base64')` silently ignores invalid characters. Worst case
  is a broken image in the user's own history directory.
- Concurrent first requests for the same preview id render it more than once
  (cache stampede). Harmless duplicate work, bounded by the render semaphore.

## Non-issues verified

- No output file is ever written outside `MEME_OUTPUT_ROOT`; absolute and
  `..` output paths are rejected with `PATH_DENIED` (403).
- Filesystem image reads (`image`/`layout` bases) are denied on the HTTP
  surface unless `MEME_ALLOW_FS=1`.
- History ids are strictly `[\w-]+`, blocking traversal reads and deletes.
- Body limits: 1 MB for specs, `maxInputBytes × 1.5` for history saves;
  over-limit bodies get a typed 400 and the connection is dropped cleanly.
- Server binds `127.0.0.1` only.
