import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  api,
  ApiError,
  type MeasureResult,
  type MemeSpec,
  type RenderResult,
  type TextBox,
} from './api';

interface EditorProps {
  spec: MemeSpec;
  onBack: () => void;
  onToast: (msg: string) => void;
  dark: boolean;
  onToggleTheme: () => void;
}

interface RenderError {
  code: string;
  message: string;
}

function specTitle(spec: MemeSpec): string {
  const b = spec.base;
  if (b.kind === 'template') return String(b.id);
  if (b.kind === 'canvas') return `canvas ${String(b.width)}×${String(b.height)}`;
  if (b.kind === 'layout') return `layout ${(b.grid as [number, number]).join('×')}`;
  return b.kind;
}

function warningLabel(w: {
  code: string;
  box?: number;
  fittedSize?: number;
  minimum?: number;
  lines?: number;
  maximum?: number;
  coverage?: number;
  codepoints?: string[];
}): string {
  switch (w.code) {
    case 'TEXT_OVERFLOW':
      return `⚠ Overflow in box ${String(w.box)} — fitted ${String(w.fittedSize)}px`;
    case 'TEXT_TOO_SMALL':
      return `⚠ Text in box ${String(w.box)} is ${String(w.fittedSize)}px — minimum ${String(w.minimum)}px`;
    case 'TEXT_TOO_MANY_LINES':
      return `⚠ Box ${String(w.box)} uses ${String(w.lines)} lines — maximum ${String(w.maximum)}`;
    case 'TEXT_TOO_DENSE':
      return `⚠ Box ${String(w.box)} is ${String(Math.round((w.coverage ?? 0) * 100))}% full — maximum ${String(Math.round((w.maximum ?? 0) * 100))}%`;
    case 'UNSUPPORTED_GLYPHS':
      return `⚠ Unsupported glyphs in box ${String(w.box)}: ${(w.codepoints ?? []).join(' ')}`;
    case 'EMPTY_TEXT':
      return `⚠ Box ${String(w.box)} is empty`;
    default:
      return `⚠ ${w.code}`;
  }
}

export function Editor({ spec: initial, onBack, onToast, dark, onToggleTheme }: EditorProps) {
  const [spec, setSpec] = useState<MemeSpec>(initial);
  const [render, setRender] = useState<RenderResult | null>(null);
  const [measure, setMeasure] = useState<MeasureResult | null>(null);
  const [error, setError] = useState<RenderError | null>(null);
  const [stale, setStale] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [activeBox, setActiveBox] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastRendered = useRef('');
  const renderSpec = useMemo(
    () => ({ ...spec, output: { ...spec.output, format: spec.output.format } }),
    [spec],
  );

  const doRender = (s: MemeSpec) => {
    const key = JSON.stringify(s);
    if (key === lastRendered.current) return;
    lastRendered.current = key;
    setStale(true);
    api.render(s).then(
      (r) => {
        setRender(r);
        setError(null);
        setStale(false);
      },
      (e: unknown) => {
        setError({
          code: e instanceof ApiError ? e.code : 'ERROR',
          message: e instanceof Error ? e.message : String(e),
        });
        setStale(false);
      },
    );
    api.measure(s).then(setMeasure, () => setMeasure(null));
  };

  useEffect(() => {
    const t = setTimeout(() => doRender(renderSpec), 300);
    return () => clearTimeout(t);
  }, [renderSpec]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        lastRendered.current = '';
        doRender(renderSpec);
      } else if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        void save();
      } else if (e.key === 's' && !inField) {
        setOverlay((o) => !o);
      } else if (e.key === 'a' && !inField) {
        setAdvanced((a) => !a);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [renderSpec, render]);

  const updateText = (i: number, patch: Partial<TextBox>) => {
    setSpec((s) => ({
      ...s,
      texts: s.texts.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    }));
  };

  const updateStyle = (i: number, patch: Record<string, unknown>) => {
    setSpec((s) => ({
      ...s,
      texts: s.texts.map((t, j) => {
        if (j !== i) return t;
        const style = { ...(t.style ?? {}), ...patch };
        for (const k of Object.keys(style)) if (style[k] === undefined) delete style[k];
        return { ...t, style: Object.keys(style).length ? style : undefined };
      }),
    }));
  };

  const copySpec = () => {
    void navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    onToast('Spec copied to clipboard');
  };

  const save = async () => {
    if (!render) return;
    try {
      await api.saveHistory(spec, render.base64);
      onToast('Saved to My Memes');
    } catch (e) {
      onToast(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const download = () => {
    if (!render) return;
    const a = document.createElement('a');
    a.href = `data:image/${render.format};base64,${render.base64}`;
    a.download = `meme-${specTitle(spec).replace(/\W+/g, '-')}.${render.format === 'jpeg' ? 'jpg' : render.format}`;
    a.click();
  };

  const copyManifestSnippet = () => {
    if (!measure) return;
    const slots = measure.boxes.map((b, i) => ({
      name: spec.texts[i]?.slot ?? `slot${String(i + 1)}`,
      rect: [b.rect.x, b.rect.y, b.rect.width, b.rect.height],
      hint: '',
    }));
    void navigator.clipboard.writeText(JSON.stringify({ slots }, null, 2));
    onToast('Manifest slot snippet copied');
  };

  // Advanced mode: drag / resize slot rects on the preview.
  const dragState = useRef<{
    box: number;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const imgSrc = render ? `data:image/${render.format};base64,${render.base64}` : null;

  const [imgScale, setImgScale] = useState(1);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !measure) return;
    const update = () => {
      if (img.clientWidth > 0) setImgScale(img.clientWidth / measure.width);
    };
    update();
    img.addEventListener('load', update);
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => {
      img.removeEventListener('load', update);
      ro.disconnect();
    };
  }, [measure, imgSrc]);

  const onPointerDown = (e: PointerEvent, box: number, mode: 'move' | 'resize') => {
    if (!advanced || !measure) return;
    const m = measure.boxes[box];
    if (!m) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { box, mode, startX: e.clientX, startY: e.clientY, rect: { ...m.rect } };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = dragState.current;
    if (!d || !measure) return;
    const k = imgScale;
    const dx = (e.clientX - d.startX) / k;
    const dy = (e.clientY - d.startY) / k;
    const r =
      d.mode === 'move'
        ? { ...d.rect, x: Math.round(d.rect.x + dx), y: Math.round(d.rect.y + dy) }
        : {
            ...d.rect,
            width: Math.max(20, Math.round(d.rect.width + dx)),
            height: Math.max(20, Math.round(d.rect.height + dy)),
          };
    updateText(d.box, { slot: undefined, x: r.x, y: r.y, width: r.width, height: r.height });
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  return (
    <div class="app">
      <div class="editor-topbar">
        <button class="btn" onClick={onBack} aria-label="Back to gallery (Esc)">
          ← Back
        </button>
        <span class="title">{specTitle(spec)}</span>
        <button
          class="btn"
          aria-pressed={overlay}
          onClick={() => setOverlay((o) => !o)}
          title="Toggle slot overlay (s)"
        >
          Slots
        </button>
        <button
          class="btn"
          aria-pressed={advanced}
          onClick={() => setAdvanced((a) => !a)}
          title="Advanced slot tuner (a)"
        >
          Tune
        </button>
        <button class="btn" onClick={copySpec} title="Copy spec JSON">
          Copy spec
        </button>
        <button
          class="btn"
          onClick={() => void save()}
          disabled={!render}
          title="Save to My Memes (Ctrl+S)"
        >
          Save
        </button>
        <button class="btn btn-primary" onClick={download} disabled={!render}>
          Download
        </button>
        <button class="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {dark ? '☀' : '☾'}
        </button>
      </div>
      <main id="main" class="editor">
        <div class="preview-pane checker" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          {error ? (
            <div class="error-panel" role="alert">
              <div class="code">{error.code}</div>
              <p>{error.message}</p>
              <button
                class="btn"
                onClick={() => void navigator.clipboard.writeText(JSON.stringify(error, null, 2))}
              >
                Copy details
              </button>
            </div>
          ) : imgSrc ? (
            <div class={`preview-wrap ${stale ? 'preview-stale' : ''}`}>
              <img ref={imgRef} src={imgSrc} alt="Meme preview" />
              {overlay &&
                measure &&
                measure.boxes.map((b, i) => {
                  const k = imgScale;
                  return (
                    <button
                      key={i}
                      class={`slot-box ${activeBox === i ? 'active' : ''}`}
                      style={{
                        left: `${String(b.rect.x * k)}px`,
                        top: `${String(b.rect.y * k)}px`,
                        width: `${String(b.rect.width * k)}px`,
                        height: `${String(b.rect.height * k)}px`,
                        cursor: advanced ? 'move' : 'pointer',
                      }}
                      aria-label={`Text slot: ${b.slot ?? `box ${String(i + 1)}`}`}
                      onClick={() => {
                        setActiveBox(i);
                        document.getElementById(`caption-${String(i)}`)?.focus();
                      }}
                      onPointerDown={(e) => onPointerDown(e, i, 'move')}
                    >
                      <span class="slot-label">
                        {b.slot ?? `box ${String(i + 1)}`}
                        {b.overflow ? ' ⚠' : ''}
                      </span>
                      {advanced && (
                        <span
                          class="handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            onPointerDown(e, i, 'resize');
                          }}
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          ) : (
            <div class="empty" role="status">
              <span class="skeleton preview-skeleton" />
              <div class="anton shout">RENDERING…</div>
            </div>
          )}
        </div>
        <aside class="inspector" aria-label="Inspector">
          {render && render.warnings.length > 0 && (
            <div class="warnings-row" role="status">
              {render.warnings.map((w, i) => (
                <span key={i} class="chip chip-warning">
                  {warningLabel(w)}
                </span>
              ))}
            </div>
          )}
          {spec.base.kind === 'layout' && (
            <details class="section" open>
              <summary>Layout cells</summary>
              {((spec.base.cells as { image: string }[] | undefined) ?? []).map((c, i) => (
                <div class="field" key={i}>
                  <label>cell {i + 1} image path</label>
                  <input
                    type="text"
                    value={c.image}
                    onInput={(e) => {
                      const cells = [...((spec.base.cells as { image: string }[]) ?? [])];
                      cells[i] = { image: (e.target as HTMLInputElement).value };
                      setSpec((s) => ({ ...s, base: { ...s.base, cells } }));
                    }}
                  />
                </div>
              ))}
              <button
                class="btn"
                onClick={() =>
                  setSpec((s) => ({
                    ...s,
                    base: {
                      ...s.base,
                      cells: [...((s.base.cells as { image: string }[]) ?? []), { image: '' }],
                    },
                  }))
                }
              >
                + Add cell
              </button>
            </details>
          )}
          <details class="section" open>
            <summary>Captions</summary>
            {spec.texts.map((t, i) => {
              const m = measure?.boxes[i];
              return (
                <div class="field" key={i}>
                  <label>
                    <span>{t.slot ?? `box ${i + 1}`}</span>
                    {m && (
                      <span
                        class={`fit ${
                          m.overflow ||
                          (measure?.warnings.some(
                            (w) => w.box === i && w.code.startsWith('TEXT_'),
                          ) ??
                            false)
                            ? 'overflow'
                            : ''
                        }`}
                      >
                        {m.overflow
                          ? `overflows — fitted ${m.fittedSize}px`
                          : `fits at ${m.fittedSize}px · ${m.lineCount} line${m.lineCount === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </label>
                  <textarea
                    id={`caption-${i}`}
                    rows={2}
                    value={t.text}
                    placeholder={t.slot ? `Text for ${t.slot}…` : 'Text…'}
                    onFocus={() => setActiveBox(i)}
                    onInput={(e) =>
                      updateText(i, { text: (e.target as HTMLTextAreaElement).value })
                    }
                  />
                </div>
              );
            })}
            <button
              class="btn"
              onClick={() =>
                setSpec((s) => ({ ...s, texts: [...s.texts, { slot: 'middle', text: '' }] }))
              }
            >
              + Add text box
            </button>
          </details>
          <details class="section">
            <summary>Style (box {activeBox + 1})</summary>
            <div class="row">
              <div class="field">
                <label>fill</label>
                <input
                  type="color"
                  value={(spec.texts[activeBox]?.style?.color as string | undefined) ?? '#ffffff'}
                  onInput={(e) =>
                    updateStyle(activeBox, { color: (e.target as HTMLInputElement).value })
                  }
                />
              </div>
              <div class="field">
                <label>stroke</label>
                <input
                  type="color"
                  value={(spec.texts[activeBox]?.style?.stroke as string | undefined) ?? '#000000'}
                  onInput={(e) =>
                    updateStyle(activeBox, { stroke: (e.target as HTMLInputElement).value })
                  }
                />
              </div>
              <div class="field">
                <label>size</label>
                <input
                  type="number"
                  min={8}
                  placeholder="auto"
                  value={(spec.texts[activeBox]?.style?.size as number | undefined) ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateStyle(activeBox, { size: v ? parseInt(v, 10) : undefined });
                  }}
                />
              </div>
            </div>
            <div class="row">
              <label class="row" style={{ gap: '6px' }}>
                <input
                  type="checkbox"
                  style={{ flex: '0 0 auto' }}
                  checked={(spec.texts[activeBox]?.style?.caps as boolean | undefined) ?? true}
                  onInput={(e) =>
                    updateStyle(activeBox, { caps: (e.target as HTMLInputElement).checked })
                  }
                />
                ALL CAPS
              </label>
              <div class="field">
                <label>align</label>
                <select
                  value={spec.texts[activeBox]?.align ?? 'center'}
                  onInput={(e) =>
                    updateText(activeBox, {
                      align: (e.target as HTMLSelectElement).value as TextBox['align'],
                    })
                  }
                >
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              </div>
            </div>
          </details>
          <details class="section">
            <summary>Output</summary>
            <div class="row">
              <div class="field">
                <label>format</label>
                <select
                  value={spec.output.format ?? 'png'}
                  onInput={(e) =>
                    setSpec((s) => ({
                      ...s,
                      output: {
                        ...s.output,
                        format: (e.target as HTMLSelectElement)
                          .value as MemeSpec['output']['format'],
                      },
                    }))
                  }
                >
                  <option value="png">png</option>
                  <option value="jpeg">jpeg</option>
                  <option value="webp">webp</option>
                  <option value="gif">gif</option>
                </select>
              </div>
              <div class="field">
                <label>quality</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="90"
                  value={spec.output.quality ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    setSpec((s) => ({
                      ...s,
                      output: { ...s.output, quality: v ? parseInt(v, 10) : undefined },
                    }));
                  }}
                />
              </div>
              <div class="field">
                <label>max width</label>
                <input
                  type="number"
                  min={16}
                  placeholder="none"
                  value={spec.output.maxWidth ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    setSpec((s) => ({
                      ...s,
                      output: { ...s.output, maxWidth: v ? parseInt(v, 10) : undefined },
                    }));
                  }}
                />
              </div>
            </div>
            {render && (
              <div style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                {render.width}×{render.height} {render.format} · {(render.bytes / 1024).toFixed(1)}{' '}
                KB
              </div>
            )}
          </details>
          <details class="section">
            <summary>Spec</summary>
            <pre class="spec-json">{JSON.stringify(spec, null, 2)}</pre>
            <div class="row">
              <button class="btn" onClick={copySpec}>
                Copy spec
              </button>
              {advanced && (
                <button class="btn" onClick={copyManifestSnippet}>
                  Copy manifest snippet
                </button>
              )}
            </div>
          </details>
        </aside>
      </main>
    </div>
  );
}
