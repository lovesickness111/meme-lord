import { useState } from 'preact/hooks';
import { api, ApiError, type MemeSpec, type RenderResult } from './api';

interface BatchItem {
  name: string;
  spec?: MemeSpec;
  result?: RenderResult;
  error?: string;
}

export function Batch({ onEdit }: { onEdit: (spec: MemeSpec) => void }) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [over, setOver] = useState(false);

  const addFiles = async (files: FileList | File[]) => {
    const next: BatchItem[] = [];
    for (const file of Array.from(files)) {
      const item: BatchItem = { name: file.name };
      try {
        item.spec = JSON.parse(await file.text()) as MemeSpec;
      } catch {
        item.error = 'INVALID_JSON';
      }
      next.push(item);
    }
    setItems((prev) => [...prev, ...next]);
    for (const item of next) {
      if (!item.spec) continue;
      try {
        const result = await api.render({ ...item.spec, output: { ...item.spec.output } });
        setItems((prev) => prev.map((p) => (p === item ? { ...p, result } : p)));
        item.result = result;
      } catch (e) {
        const msg = e instanceof ApiError ? e.code : e instanceof Error ? e.message : String(e);
        setItems((prev) => prev.map((p) => (p === item ? { ...p, error: msg } : p)));
        item.error = msg;
      }
    }
  };

  const exportAll = () => {
    for (const item of items) {
      if (!item.result) continue;
      const a = document.createElement('a');
      a.href = `data:image/${item.result.format};base64,${item.result.base64}`;
      a.download = item.name.replace(/\.json$/, `.${item.result.format}`);
      a.click();
    }
  };

  const rendered = items.filter((i) => i.result).length;
  const warned = items.filter((i) => i.result && i.result.warnings.length > 0).length;
  const failed = items.filter((i) => i.error).length;

  return (
    <main id="main">
      <div
        class={`dropzone ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer?.files.length) void addFiles(e.dataTransfer.files);
        }}
      >
        <div class="anton" style={{ fontSize: '22px', color: 'var(--foreground)' }}>
          DROP SPEC FILES
        </div>
        <div>Drop MemeSpec .json files here, or</div>
        <label class="btn">
          Choose files
          <input
            type="file"
            accept=".json,application/json"
            multiple
            style={{ display: 'none' }}
            onInput={(e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files?.length) void addFiles(files);
            }}
          />
        </label>
      </div>
      {items.length > 0 && (
        <>
          <div class="summary-strip" role="status">
            <span>{rendered} rendered</span>
            <span style={{ color: 'var(--warning)' }}>{warned} with warnings</span>
            <span style={{ color: 'var(--destructive)' }}>{failed} failed</span>
            <span class="spacer" />
            <button class="btn btn-primary" onClick={exportAll} disabled={rendered === 0}>
              Export all
            </button>
          </div>
          <div class="card-grid">
            {items.map((item, i) => (
              <div key={i} class="tcard" style={{ cursor: 'default' }}>
                <span class="thumb">
                  {item.result ? (
                    <img
                      src={`data:image/${item.result.format};base64,${item.result.base64}`}
                      alt={item.name}
                    />
                  ) : item.error ? (
                    <span class="chip chip-error">{item.error}</span>
                  ) : (
                    <span class="skeleton thumb-skeleton" role="status" aria-label="Rendering" />
                  )}
                </span>
                <span class="meta">
                  <span class="name">{item.name}</span>
                  {item.result && item.result.warnings.length > 0 && (
                    <span class="chip chip-warning">⚠ {item.result.warnings.length}</span>
                  )}
                </span>
                {item.spec && (
                  <div class="hcard-actions">
                    <button class="btn" onClick={() => onEdit(item.spec!)}>
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
