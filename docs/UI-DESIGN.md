# meme-maker — UI/UX Design Spec

**Status:** Design / research phase. No production code in this document is implemented.
**Author:** UI/UX design-research sub-agent.
**Inputs:** [`DESIGN-v2.md`](./DESIGN-v2.md) (§4 web UI, §5 Synara integration), [`ROADMAP.md`](./ROADMAP.md)
(M3/M4), and a code read of `kartikkabadi/synara` (`apps/web`, `apps/desktop`, `packages/shared`).
**Static mockups:** [`ui-design/prototype/`](./ui-design/prototype/) illustrates the key screens
(self-contained HTML/CSS, no build step).

This spec covers the `meme ui` web app served by the future `src/http.ts` adapter, plus the
host-integration (Synara) story. It intentionally does **not** specify implementation of
`src/http.ts`, the `meme ui` CLI command, or package scripts — see DESIGN-v2 §4 for those.

---

## 1. Design system

### 1.1 Principles

1. **MemeSpec is the document.** Every screen is a view over a `MemeSpec`; the UI never owns
   state the spec cannot express. "Copy spec" is a first-class affordance everywhere.
2. **Preview = truth.** All previews come from the same `renderMeme(spec)` engine over
   `/api/render` / `/api/measure` — the UI never re-implements layout.
3. **Guest in someone else's house.** The UI must look native inside Synara (or any host)
   via theme pass-through, and look great standalone with its own brand.
4. **Fast, small, boring tech.** Static-servable SPA, CSS custom properties for theming,
   system fonts for UI chrome, no CSS framework required.

### 1.2 Color tokens

All colors are CSS custom properties on `:root` (light) and `.dark` (dark), mirroring
Synara's Tailwind-v4 `@theme inline { --color-x: var(--x) }` pattern so a host can override
any token. Names use the same semantic vocabulary as Synara (`--background`, `--foreground`,
`--card`, `--muted`, `--accent`, `--border`, `--ring`, `--destructive`, `--warning`).

**Dark (default for standalone):**

| Token | Value | Use |
|---|---|---|
| `--background` | `#0d0e11` | app shell |
| `--card` | `#16181d` | panels, cards, inspector |
| `--elevated` | `#1e2128` | popovers, hovered cards, inputs |
| `--foreground` | `#e8eaed` | primary text (13.9:1 on background) |
| `--muted-foreground` | `#9aa0a6` | secondary text (7.0:1) |
| `--border` | `#2a2e37` | hairlines, card edges |
| `--accent` | `#ffd23f` ("meme yellow") | primary actions, focus, selection |
| `--accent-foreground` | `#161616` | text on accent (12.6:1) |
| `--destructive` | `#e5484d` | destructive actions, hard errors |
| `--warning` | `#f5a623` | overflow/degraded-render chips |
| `--success` | `#46a758` | saved/rendered confirmations |

**Light:**

| Token | Value |
|---|---|
| `--background` | `#faf9f7` |
| `--card` | `#ffffff` |
| `--elevated` | `#f1efeb` |
| `--foreground` | `#1b1d22` |
| `--muted-foreground` | `#5f646c` |
| `--border` | `#e3e0da` |
| `--accent` | `#f5c518` (darkened yellow so accent-on-paper keeps contrast) |
| `--accent-foreground` | `#161616` |
| `--destructive` / `--warning` / `--success` | `#ce2c31` / `#ad5700` / `#297c3b` |

Rules:

- All text ≥ AA (4.5:1); large display text ≥ 3:1. The yellow accent is **never** used as
  text color on light surfaces — only as fill behind `--accent-foreground` ink.
- Never color-only signaling: warning chips = icon + text; slot states = dash pattern +
  label, not hue alone.
- The checkered transparency board under previews uses `--border` at 40% alpha squares so it
  reads in both themes.

### 1.3 Typography

| Role | Face | Sizes |
|---|---|---|
| UI chrome | `Inter, system-ui, sans-serif` (system stack; no webfont download for chrome) | 13px base, 12px meta, 15px section titles, 20px page titles |
| Brand / empty states | **Anton** (already bundled as the render display font) | brand mark; empty-state shouts ("NO MEMES YET / MAKE ONE") |
| Code / spec JSON | `ui-monospace, SFMono-Regular, Menlo, monospace` | 12px |

Line-height 1.45 for body, 1.1 for Anton display. Anton is used *sparingly* — it is the
meme voice, not the UI voice.

### 1.4 Spacing, radius, elevation

- 4px base unit; component paddings from the scale `4 / 8 / 12 / 16 / 24 / 32`.
- Radius scale mirrors Synara's multiplier system: `--radius: 10px`;
  sm = 6px (chips/inputs), md = 8px (buttons), lg = 10px (cards), xl = 14px (panels/dialogs).
- Elevation: borders first, shadows second. Cards get `1px solid var(--border)`; only
  popovers/dialogs get a soft shadow (`0 8px 24px rgb(0 0 0 / .35)` dark, `.12` light).
- Preview canvas sits on the checkered board with a subtle drop shadow to read as "the
  artifact", distinct from chrome.

### 1.5 Iconography & brand mark

- Icons: [Lucide](https://lucide.dev) outline set, 16px in chrome / 20px in empty states,
  1.5px stroke, `currentColor`. (Synara's ecosystem uses the same family; keeps the embed
  visually coherent.)
- **Brand mark:** white Anton "M" with a 6% black stroke on a `#ffd23f` rounded tile
  (radius = 22% of tile). Works at 16px (favicon), 24px (header), 512px (README/social).
  Monochrome variant (ink "M" on transparent) for host-embedded headers where the yellow
  tile would clash with a host accent.
- Warning chip icon: `triangle-alert`; degraded-glyph chip: `type` with a slash overlay.

### 1.6 Motion

- Durations: 150ms (hover/press), 220ms (disclosure, panel slide, preview crossfade) —
  matching Synara's single-source disclosure motion (220ms `ease-out`).
- Easing: `cubic-bezier(0.215, 0.61, 0.355, 1)` (ease-out-cubic) for entrances;
  `ease-in` 120ms for exits.
- Preview swap: old render stays until the new one arrives, then 150ms crossfade — never a
  blank flash between debounced renders.
- GIF cards animate **on hover/focus only**, never autoplay.
- `@media (prefers-reduced-motion: reduce)`: all transitions → `none`, GIF hover-play
  becomes click-to-play, crossfade becomes instant swap.

### 1.7 Accessibility baseline

- Full keyboard operability (map in §3); visible focus ring `2px solid var(--accent)` with
  `2px` offset on every interactive element; `:focus-visible` only.
- Slot regions are real `<button>`s with `aria-label="Text slot: <name> — <hint>"`.
- Live preview updates announce via a polite `aria-live` region ("Rendered, 1 warning:
  text overflow in slot top").
- Warning/error chips: icon + text, `role="status"`.
- Alt-text field per meme (`output.alt`, DESIGN-v2 N5) surfaced prominently in the Output
  section — the editor nudges (not blocks) when empty on save.
- Color contrast per §1.2; hit targets ≥ 32×32px; all imagery in chrome has alt text.
- The shortcuts sheet (`?`) is a dialog with focus trap and `Esc` close.

---

## 2. Screens

The app is a 4-view SPA plus one editor mode. Top bar: brand mark, view tabs
(Gallery / My Memes / Batch), search (in Gallery), theme toggle, `?` shortcuts. In
**embedded mode** (§5) the top bar collapses to a slim toolbar without brand/tabs.

### 2.1 Gallery (home)

Purpose: pick a starting point in <10s. (Mockup: `prototype/gallery.html`.)

- **Layout:** responsive card grid — 2 cols @≤640px → 3 @768 → 4 @1024 → 5 @1280 → 6 @≥1440;
  16px gutters. Card = thumbnail (from `/thumbs/:id`, ~320px webp), name, slot-count badge,
  `GIF` corner badge for animated templates.
- **Tabs:** `[Image] [GIF] [Blank Canvas] [Layouts]`. Blank Canvas opens the editor with a
  `canvas` base (size presets 800², 1080², 1200×675); Layouts opens a cell-count picker
  (2×1, 2×2, 3×3, custom) then the editor with a `layout` base.
- **Search:** `/` focuses; substring match over id/name/tags (same semantics as the
  catalog's linear scan); tag chips under the search bar filter-by-tag (choice, reaction,
  four-panel, …). Empty result → Anton empty state "NOTHING FOUND" + "clear filters".
- **Card interactions:** hover raises card to `--elevated` + 150ms scale(1.02) (skipped
  under reduced motion); GIF thumbs play on hover/focus; click/`Enter` → Editor; `1–9`
  quick-selects the nth visible card.
- **Load state:** skeleton cards (pulse only when motion allowed). Errors from
  `/api/templates` show a retry panel, never a blank page.

### 2.2 Editor

Purpose: caption a template, see the truth, hand off the spec. (Mockup:
`prototype/editor.html`.)

**Layout:** two panes — preview left (~65%), inspector right (~35%, min 320px). Below
900px the inspector becomes a bottom sheet (collapsed to a caption-fields bar, drag/`Tab`
to expand). Top bar gains: back (`Esc`), template name, Copy spec, Save (`Ctrl+S`),
Download.

**Preview pane:**

- Checkered board, rendered image centered with drop shadow, zoom fit/100% toggle.
- **Slot overlay** (toggleable, `s`): each text slot renders as a dashed 1.5px
  `--accent`-tinted region with a small name label. Focusable buttons; focusing a slot
  focuses its text field and vice-versa (region border becomes solid).
- Overlay + geometry come from `/api/measure` (boxes + fitted sizes, no raster) so overlay
  feedback is instant; raster preview via `/api/render` debounced 250ms, spec-hash cached.
- **Warning chips render on the affected box** (e.g. "Overflow — fitted 22px" anchored to
  the slot), not hidden in a list; also mirrored in the inspector's warnings row. Chips use
  `--warning`; `--strict`-mode failures use `--destructive`.
- GIF previews: scrubber with frame index + play/pause; text-box `frames:[a,b]` ranges
  shade the scrubber region.

**Inspector (disclosure sections, 220ms ease-out):**

1. **Captions** — one field per slot (auto-grown textarea), with per-slot font-size
   readout ("fits at 36px") from `/api/measure`, and per-slot overflow/glyph warnings.
2. **Style** — font, fill/stroke colors (validated color inputs; swatch + hex field),
   stroke width incl. `auto`, alignment, casing toggle.
3. **Output** — format (png/jpeg/webp/gif), quality, maxWidth, **alt text** (`output.alt`),
   filename.
4. **Spec** — live JSON (read-only, syntax-lit), **Copy spec** button = the agent-handoff
   affordance; "Open as file" writes the `{json}` beside history.

**Advanced mode** (toggle in Style, `a`): free drag/resize of slot boxes on the preview,
serialized to `x/y/width/height`; "snap to %" toggle keeps rects resolution-independent.
This mode doubles as the maintainer **Slot Tuner** (§2.5).

**Save model:** `Ctrl+S` writes a `{json, png}` pair into history (§2.3) and toasts
"Saved to My Memes". Download exports the raster only. There is no dirty-state modal —
the spec is always serializable, leaving just discards the in-memory draft.

### 2.3 My Memes / History

Purpose: everything I've rendered, re-editable forever. (Mockup: `prototype/history.html`.)

- Backed by the filesystem: `~/.meme-maker/history/<ts>-<hash>.{json,png}` — no DB. The
  UI lists via an HTTP endpoint that reads the directory; newest first.
- Grid of result cards (image, template name, relative time). Hover/focus actions:
  **Re-edit** (loads the `.json` into the Editor), **Duplicate**, **Copy spec**,
  **Reveal file** (desktop hosts), **Delete** (confirm, `--destructive`).
- Agent-rendered memes appear here too (same history dir written by CLI/MCP renders when
  history is enabled) — this is the human's audit trail of what the agent made.
- Empty state: Anton "NO MEMES YET" / "MAKE ONE" button → Gallery.

### 2.4 Batch / Contact sheet (P2)

Purpose: review N specs at once (agent batch output, template QC). (Mockup:
`prototype/batch.html`.)

- Drop zone accepts N `.json` spec files (or a `.jsonl`); renders a contact-sheet grid.
- Each cell: render, filename, per-item warning chips; failed items show the typed error
  code in-cell (never abort the whole sheet).
- `j/k` moves selection, `Enter` opens that item in the Editor, `e` / "Export all" writes
  all rasters to a chosen directory.
- A summary strip pins to the top: "24 rendered · 3 warnings · 1 error", clicking a count
  filters the grid.

### 2.5 Advanced Slot Tuner (maintainer mode)

Purpose: kill `rect:[x,y,w,h]` guessing when adding templates (DESIGN-v2 §6.2).

- Entry: Editor → Advanced mode → "Tune slots", or `meme ui --tune <image>` deep link
  (`/tune?src=…`).
- Left: image with draggable/resizable slot rects (create with click-drag; arrow keys nudge
  1px, `Shift+arrows` 8px). Right: slot list (name, hints, rect values live-updating) and a
  **manifest snippet panel** — the exact `manifest.json` / `<id>.meta.json` entry, with a
  Copy button.
- Test-caption field per slot renders real text through `/api/measure` so the maintainer
  sees fitted sizes while tuning.
- Guides: rule-of-thirds overlay toggle, snap-to-% default on, rect values shown in both px
  and %.

---

## 3. Interaction flows & keyboard shortcuts

### 3.1 Golden-path flows

**F1 — First meme in <60s (human, standalone):** Gallery → `/` "drake" → `Enter` →
type two captions (live preview updates, fitted sizes shown) → `Ctrl+S` → toast → Download.
No dialogs, no config.

**F2 — Agent→human handoff (Synara):** agent renders via MCP → inline image + "Open in
Meme Editor" chip in the transcript → chip opens `/edit#<base64-spec>` → human tweaks the
caption, sees the overflow chip, shortens text → `Ctrl+S` → re-attaches from My Memes.
Zero model round-trips (DESIGN-v2 Scenario 5).

**F3 — Human→agent handoff:** human composes in the Editor → **Copy spec** → pastes the
JSON into any agent chat ("make 5 variants of this") → agent re-renders via
`render_meme(spec)`. The spec is the shared language in both directions.

**F4 — Maintainer adds a template:** drop image into Slot Tuner → drag slot boxes →
type test captions → copy manifest snippet → sidecar file → PR.

### 3.2 Keyboard map

Global: `?` shortcuts sheet · `Ctrl+D` theme toggle · `Esc` back/close ·
`g` then `g/m/b` go to Gallery/My Memes/Batch.

| Context | Key | Action |
|---|---|---|
| Gallery | `/` | focus search |
| Gallery | `1–9` | select nth visible card |
| Gallery | arrows / `Enter` | move / open |
| Editor | `Tab` / `Shift+Tab` | cycle slots (fields ↔ regions stay in sync) |
| Editor | `Ctrl+Enter` | force re-render now |
| Editor | `Ctrl+S` | save to history |
| Editor | `Ctrl+Shift+C` | copy spec JSON |
| Editor | `s` | toggle slot overlay |
| Editor | `a` | toggle advanced (drag) mode |
| Editor (GIF) | `Space` / `←→` | play-pause / step frames |
| Tuner | arrows / `Shift+arrows` | nudge rect 1px / 8px |
| Batch | `j/k` / `Enter` / `e` | navigate / edit item / export all |

Shortcuts avoid host collisions: no `Ctrl+K`, `Ctrl+P`, `Ctrl+T`, no bare letters that type
into fields (single-letter shortcuts are suppressed while an input has focus). In embedded
mode, `Esc` first returns focus to the host if the editor is at its root view.

### 3.3 Error & degraded states

- Warnings (overflow, unsupported glyphs, frames-out-of-range) are **chips at the point of
  damage** + an inspector summary row; renders still complete (non-strict).
- Typed errors (`RESOURCE_LIMIT`, `PATH_DENIED`, `INVALID_SPEC`) render an inline panel in
  the preview pane with the code, message, and a "copy details" button — never a toast-only
  failure, never a blank canvas.
- Server unreachable: full-pane reconnect state with retry backoff indicator (the HTTP
  server is local; the common cause is the process exiting).

---

## 4. Responsive & reduced motion

Breakpoints (content-driven, matching the grid in §2.1):

| Range | Layout |
|---|---|
| ≤640px | 2-col gallery; editor stacks vertically, inspector = bottom sheet; top bar collapses tabs into a menu |
| 641–900px | 3-col gallery; editor still stacked/bottom-sheet |
| 901–1279px | 4-col gallery; editor side-by-side 60/40 |
| ≥1280px | 5–6-col gallery; editor 65/35, spec panel can pin open |

- The editor is usable at 360px wide (phone on the same LAN): preview full-width, caption
  fields directly below, everything else behind disclosures.
- Touch: slot regions get 44px min hit areas; advanced drag mode uses handles sized 24px.
- Reduced motion: per §1.6 — no transitions, no autoplaying/hover-playing GIFs
  (click-to-play with a play glyph), no skeleton pulse (static placeholder), instant
  preview swap.

---

## 5. Synara integration

Grounded in the synara code read (`apps/web`, `apps/desktop`, `packages/shared`):

- Synara themes are **token-based** (`ChromeTheme { accent, ink, surface, contrast }` per
  light/dark variant in `apps/web/src/theme/theme.logic.ts`, seeds in
  `theme.seed.generated.ts`) and compiled to CSS custom properties (`--accent`,
  `--background`, `--border`, semantic `--color-*` aliases via Tailwind v4 `@theme inline`).
- Synara transcripts already render inline images (`LocalImagePreview.tsx`,
  `GeneratedMarkdownImage.tsx`, `ChatMarkdown`) and inline URL chips
  (`InlineLinkChip.tsx` — favicon icon + shortened label + accent styling).
- Motion single-source: 220ms ease-out disclosure (`lib/disclosureMotion.ts`) — our §1.6
  values match, so an embedded editor's toggles feel native.
- Right-dock/`BrowserPanel.tsx` exists for hosting web views inside Synara.

### 5.1 "Open in Meme Editor" chip

- The MCP `render_meme` result includes (alongside the inline image) a plain URL:
  `http://localhost:<port>/edit#<base64url(MemeSpec)>`. Synara's existing link-chip pipeline
  renders it as an `InlineLinkChip` automatically — **zero Synara changes** for v1.
- Chip label: URLs like `/edit#…` are long/opaque; recommend the MCP text block phrase it
  as a markdown link `[Open in Meme Editor](http://…)` so hosts that render markdown show a
  human label, and hosts that chip-ify raw URLs still work.
- The spec travels in the **fragment** (`#`), not the query — it never hits server logs and
  survives static serving. Size guard: specs >8KB base64url fall back to
  `/edit?draft=<history-id>` referencing a written draft file.

### 5.2 Theme pass-through

- The editor accepts `?theme=dark|light&accent=<hsl>` (and optional `&surface=<hsl>`,
  `&ink=<hsl>`) on any route. `accent` maps to `--accent` (with auto-derived
  `--accent-foreground` by contrast check), `surface`/`ink` re-seed the §1.2 scales the way
  Synara derives its token ramps from `ChromeTheme`.
- Values are HSL triples (`accent=42 100% 62%`), URL-encoded; invalid values are ignored
  (fall back to brand defaults) — never break render for a bad theme param.
- In embedded mode (`?embed=1`): hide brand/tabs, slim toolbar, `Esc`-to-host behavior
  (§3.2), and no theme toggle (the host owns theme).
- Synara-side (later, optional): when generalizing `mcpInjection.ts` into a registered-tools
  table, Synara can append its live theme to the editor URL when opening in
  `BrowserPanel`/right-dock; until then the chip opens a browser tab with brand defaults.

### 5.3 Port discovery

- `meme ui` prints a machine-readable first line `{"url":"http://localhost:PORT"}` (Synara
  AGENTS.md port hygiene) and supports `--port` with auto-pick on conflict.
- Additionally write `~/.meme-maker/ui.json` → `{ url, port, pid, startedAt }` on bind and
  remove on clean exit; the MCP server reads it to mint `/edit#…` links (and can offer an
  `open_in_editor(spec)` tool that starts the UI on demand if absent, ROADMAP M4).
- Links must always target `localhost` (server binds localhost only).

### 5.4 Filesystem history as the integration seam

- History (`~/.meme-maker/history/`) is shared across CLI, MCP, and UI renders: whatever
  the agent renders shows in **My Memes**; whatever the human saves is a file an agent can
  read back. No sockets, no sync protocol.
- Worktree hygiene (DESIGN-v2 D25): rendered *outputs* default under
  `SYNARA_ARTIFACTS_DIR` → `./.memes/` → OS temp; *history* stays in the home dir so it
  never dirties `git status` in worktree-backed threads.

### 5.5 Inline image rendering in transcripts

- Confirmed: Synara renders MCP inline `image` content blocks in transcripts today.
  meme-maker keeps the ≤1MB inline block with a default `maxWidth` so the flagship
  templates fit (DESIGN-v2 D1); the transcript shows the meme immediately, the chip is the
  edit affordance beneath it.
- GIFs: inline animated GIF blocks should be verified in Synara's `LocalImagePreview` path
  during M4 (Phase-2 note in DESIGN-v2 §5); until verified, the MCP GIF result should lead
  with the first-frame PNG inline + a file path.

### 5.6 On `/loop` / command-palette long-running flows

Searched `kartikkabadi/synara` for `/loop`: **not present**. Synara's composer slash
commands are `/clear`, `/review`, `/fork`, `/automation`, … (`packages/shared/src/
composerSlashCommands.ts`); its long-running surfaces are Studio and Automations. `/loop`
lives in `chatgpt-yolo` (`command-runtime.js`), a different host.

Design consequence (matching DESIGN-v2 §5): meme-maker ships a **standalone,
host-embeddable UX** and does not build against any host's palette/loop runtime:

- Everything a palette/loop flow would need is already a URL or a spec: open editor
  (`/edit#<spec>`), open gallery (`/`), batch review (`/batch`), tune slots (`/tune`).
  Any host command surface can bind these with zero meme-maker changes.
- Batch/contact-sheet (§2.4) is the reviewing surface for loop-generated output: a loop
  that emits N specs points the human at `/batch` (specs via drop or a `?dir=` param under
  the confined root).
- If a host later exposes a palette API (Synara slash command, chatgpt-yolo `/loop` step),
  the adapter is a ~10-line "open this URL" command on the host side.

---

## 6. Open questions for the user

1. **Brand name & accent.** Is "meme yellow `#ffd23f`" + the Anton-"M" tile the brand, or
   is there a preferred name/wordmark (the npm name is `agent-meme-maker` — does the UI say
   "Meme Maker"?) and accent color?
2. **Primary user for v1 UI.** Review surface for agent-made memes (recommended, shapes
   F2 as the golden path), standalone human editor, or maintainer slot-tuner first? This
   orders §2's build sequence.
3. **Host integration priority.** Is Synara chip + theme pass-through (§5.1–5.2) required
   for the first UI release, or does standalone ship first and embed follow? (Affects
   whether `?embed=1`/theme params land in the initial `meme ui` PR.)
4. **History location & retention.** Is `~/.meme-maker/history/` acceptable (vs. XDG data
   dir), and should the UI offer retention controls (max items / clear all), or is
   unbounded-until-user-deletes fine for v1?
5. **Editor scope for v1.** Are Batch (§2.4) and Slot Tuner (§2.5) acceptable as P2
   follow-ups, with v1 = Gallery + Editor + My Memes only?
6. **Mobile/LAN access.** Should the localhost server optionally bind LAN (`--host`) for
   phone-based caption editing, or is that out of scope for the security posture (server is
   currently localhost-only by design)?
7. **Theme param shape.** Is `?theme=dark|light&accent=<hsl>` sufficient for Synara, or
   should we accept a full Synara `ThemeSharePayload` (its native share-string format) for
   perfect fidelity when embedded?

---

## 7. Out of scope (per DESIGN-v2 §11)

No database, no accounts, no cloud, no SSE, no config files, no in-Synara build of the
editor, no video. The UI is a thin, theme-able `MemeSpec` editor over the existing engine.
