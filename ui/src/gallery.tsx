import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { api, type MemeSpec, type TemplateCard } from './api';

type Tab = 'image' | 'gif' | 'canvas' | 'layout';

const CANVAS_PRESETS: [number, number, string][] = [
  [800, 800, 'Square'],
  [1080, 1080, 'Instagram'],
  [1200, 675, 'Twitter / OG'],
];

const LAYOUT_PRESETS: [number, number, string][] = [
  [2, 1, 'Side by side'],
  [2, 2, 'Four panel'],
  [3, 3, 'Nine panel'],
];

export function Gallery({ onOpen }: { onOpen: (spec: MemeSpec) => void }) {
  const [templates, setTemplates] = useState<TemplateCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('image');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setError(null);
    api.templates().then(setTemplates, (e: Error) => setError(e.message));
  };
  useEffect(load, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if (e.key === '/' && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates ?? [])
      for (const g of t.tags) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([g]) => g);
  }, [templates]);

  const visible = useMemo(() => {
    if (tab === 'canvas' || tab === 'layout') return [];
    let list = (templates ?? []).filter((t) => t.type === tab);
    if (tag) list = list.filter((t) => t.tags.includes(tag));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.tags.some((g) => g.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [templates, tab, tag, search]);

  const openTemplate = (t: TemplateCard) =>
    onOpen({
      base: { kind: 'template', id: t.id },
      texts: t.slots.map((s) => ({ slot: s.name, text: '' })),
      output: {},
    });

  if (error) {
    return (
      <main id="main" class="empty">
        <div class="anton shout">SOMETHING BROKE</div>
        <div>{error}</div>
        <button class="btn btn-primary" onClick={load}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <main id="main">
      <div class="filters">
        {(
          [
            ['image', 'Image'],
            ['gif', 'GIF'],
            ['canvas', 'Blank Canvas'],
            ['layout', 'Layouts'],
          ] as const
        ).map(([v, label]) => (
          <button key={v} class="chip" aria-pressed={tab === v} onClick={() => setTab(v)}>
            {label}
          </button>
        ))}
        <span class="spacer" />
        <input
          ref={searchRef}
          class="search"
          type="text"
          placeholder="Search templates…  /"
          aria-label="Search templates"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>
      {(tab === 'image' || tab === 'gif') && (
        <>
          <div class="filters">
            {tags.map((g) => (
              <button
                key={g}
                class="chip"
                aria-pressed={tag === g}
                onClick={() => setTag(tag === g ? null : g)}
              >
                {g}
              </button>
            ))}
          </div>
          {!templates ? (
            <div class="card-grid" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} class="tcard skeleton-card">
                  <span class="thumb skeleton" />
                  <span class="meta">
                    <span class="skeleton skeleton-line" />
                  </span>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div class="empty" role="status">
              <div class="anton shout">NOTHING FOUND</div>
              <div>
                {search.trim()
                  ? `No templates match "${search.trim()}"${tag ? ` in #${tag}` : ''}.`
                  : tag
                    ? `No ${tab} templates tagged #${tag}.`
                    : `No ${tab} templates available.`}
              </div>
              <button
                class="btn"
                onClick={() => {
                  setSearch('');
                  setTag(null);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div class="card-grid">
              {visible.map((t) => (
                <button key={t.id} class="tcard" onClick={() => openTemplate(t)}>
                  <span class="thumb">
                    <img src={`/thumbs/${t.id}`} alt={t.name} loading="lazy" />
                    {t.type === 'gif' && <span class="badge badge-gif">GIF</span>}
                  </span>
                  <span class="meta">
                    <span class="name">{t.name}</span>
                    <span class="badge">{t.slots.length} slots</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'canvas' && (
        <div class="canvas-presets">
          {CANVAS_PRESETS.map(([w, h, label]) => (
            <button
              key={label}
              class="preset"
              onClick={() =>
                onOpen({
                  base: { kind: 'canvas', width: w, height: h, color: '#ffffff' },
                  texts: [
                    { slot: 'top', text: '' },
                    { slot: 'bottom', text: '' },
                  ],
                  output: {},
                })
              }
            >
              <div class="dim">
                {w}×{h}
              </div>
              <div class="label">{label}</div>
            </button>
          ))}
        </div>
      )}
      {tab === 'layout' && (
        <div class="canvas-presets">
          {LAYOUT_PRESETS.map(([c, r, label]) => (
            <button
              key={label}
              class="preset"
              onClick={() =>
                onOpen({
                  base: { kind: 'layout', grid: [c, r], cells: [] },
                  texts: [{ slot: 'top', text: '' }],
                  output: {},
                })
              }
            >
              <div class="dim">
                {c}×{r}
              </div>
              <div class="label">{label} — add image paths in the editor</div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
