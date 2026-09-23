import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { MemeSpec } from './api';
import { Batch } from './batch';
import { Editor } from './editor';
import { Gallery } from './gallery';
import { MyMemes } from './memes';

export type View = 'gallery' | 'editor' | 'memes' | 'batch';

function initialTheme(): boolean {
  const param = new URLSearchParams(location.search).get('theme');
  if (param === 'light') return false;
  if (param === 'dark') return true;
  const saved = localStorage.getItem('meme-theme');
  if (saved) return saved === 'dark';
  return true;
}

export function App() {
  const [view, setView] = useState<View>('gallery');
  const [dark, setDark] = useState(initialTheme);
  const [draft, setDraft] = useState<MemeSpec | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('meme-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const openEditor = useCallback((spec: MemeSpec) => {
    setDraft(spec);
    setView('editor');
  }, []);

  const viewRef = useRef(view);
  viewRef.current = view;
  const showHelpRef = useRef(showHelp);
  showHelpRef.current = showHelp;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        setDark((d) => !d);
      } else if (e.key === '?' && !inField) {
        setShowHelp((s) => !s);
      } else if (e.key === 'Escape') {
        if (showHelpRef.current) setShowHelp(false);
        else if (viewRef.current === 'editor') setView('gallery');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div class="app">
      <a class="skip-link" href="#main">
        Skip to content
      </a>
      {view !== 'editor' && (
        <header class="topbar">
          <span class="brand" role="heading" aria-level={1}>
            <span class="brand-tile anton">M</span> meme maker
          </span>
          <nav class="tabs" role="tablist">
            {(
              [
                ['gallery', 'Gallery'],
                ['memes', 'My Memes'],
                ['batch', 'Batch'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                class="tab"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </nav>
          <span class="spacer" />
          <button
            class="icon-btn"
            title="Toggle theme (Ctrl+D)"
            aria-label="Toggle theme"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? '☀' : '☾'}
          </button>
          <button
            class="icon-btn"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            onClick={() => setShowHelp(true)}
          >
            ?
          </button>
        </header>
      )}
      {view === 'gallery' && <Gallery onOpen={openEditor} />}
      {view === 'editor' && draft && (
        <Editor
          spec={draft}
          onBack={() => setView('gallery')}
          onToast={setToast}
          dark={dark}
          onToggleTheme={() => setDark((d) => !d)}
        />
      )}
      {view === 'memes' && <MyMemes onEdit={openEditor} onToast={setToast} />}
      {view === 'batch' && <Batch onEdit={openEditor} />}
      {toast && (
        <div class="toast" role="status">
          {toast}
        </div>
      )}
      {showHelp && (
        <div class="dialog-backdrop" onClick={() => setShowHelp(false)}>
          <div
            class="dialog"
            role="dialog"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Keyboard shortcuts</h2>
            <table>
              {(
                [
                  ['/', 'Focus search (Gallery)'],
                  ['Tab', 'Cycle slot fields (Editor)'],
                  ['Ctrl+Enter', 'Render now'],
                  ['Ctrl+S', 'Save to My Memes'],
                  ['Ctrl+D', 'Toggle theme'],
                  ['s', 'Toggle slot overlay'],
                  ['a', 'Toggle advanced slot tuner'],
                  ['Esc', 'Back / close'],
                  ['?', 'This sheet'],
                ] as const
              ).map(([k, desc]) => (
                <tr key={k}>
                  <td>
                    <span class="kbd">{k}</span>
                  </td>
                  <td>{desc}</td>
                </tr>
              ))}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
