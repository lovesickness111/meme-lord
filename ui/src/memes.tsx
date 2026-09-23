import { useEffect, useState } from 'preact/hooks';
import { api, type HistoryEntry, type MemeSpec } from './api';

function relTime(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function MyMemes({
  onEdit,
  onToast,
}: {
  onEdit: (spec: MemeSpec) => void;
  onToast: (msg: string) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  const load = () => {
    api.history().then(setEntries, () => setEntries([]));
  };
  useEffect(load, []);

  const reEdit = async (id: string) => {
    try {
      onEdit(await api.historySpec(id));
    } catch (e) {
      onToast(`Cannot load spec: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const copySpec = async (id: string) => {
    const spec = await api.historySpec(id);
    await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    onToast('Spec copied to clipboard');
  };

  const remove = async (id: string) => {
    await api.deleteHistory(id);
    onToast('Deleted');
    load();
  };

  if (!entries) {
    return (
      <main id="main">
        <div class="card-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} class="tcard skeleton-card">
              <span class="thumb skeleton" />
              <span class="meta">
                <span class="skeleton skeleton-line" />
              </span>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (entries.length === 0) {
    return (
      <main id="main" class="empty">
        <div class="anton shout">NO MEMES YET</div>
        <div>Renders you save land here, as re-editable spec + image pairs.</div>
      </main>
    );
  }

  return (
    <main id="main">
      <div class="card-grid">
        {entries.map((e) => (
          <div key={e.id} class="tcard" style={{ cursor: 'default' }}>
            <span class="thumb">
              <img
                src={`/api/history/${e.id}.png`}
                alt={e.template ?? 'saved meme'}
                loading="lazy"
              />
            </span>
            <span class="meta">
              <span class="name">{e.template ?? 'meme'}</span>
              <span class="badge">{relTime(e.savedAt)}</span>
            </span>
            <div class="hcard-actions">
              <button class="btn" onClick={() => void reEdit(e.id)}>
                Re-edit
              </button>
              <button class="btn" onClick={() => void copySpec(e.id)}>
                Copy spec
              </button>
              <a class="btn" href={`/api/history/${e.id}.png`} download={`${e.id}.png`}>
                Download
              </a>
              <button
                class="btn btn-danger"
                aria-label={`Delete ${e.template ?? 'meme'}`}
                onClick={() => void remove(e.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
