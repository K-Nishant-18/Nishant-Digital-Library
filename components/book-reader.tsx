'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ePub, { type Book as EpubBook, type Rendition } from 'epubjs';
import {
  X, BookOpen, Upload, Highlighter, StickyNote, Copy, Trash2, Check, Loader2,
  ChevronLeft, ChevronRight, AArrowDown, List, PenLine, Sun,
  AlignLeft, AlignCenter, AlignJustify, Type, Palette, RotateCcw, Minus, Plus,
} from 'lucide-react';
import { toast } from '@/components/toast';
import {
  getReaderDataAction,
  uploadReaderFileAction,
  saveReaderProgressAction,
  flushReaderSessionAction,
  addReaderHighlightAction,
  updateReaderHighlightAction,
  deleteReaderHighlightAction,
} from '@/lib/actions';
import type { LibraryEntry, ReaderAnnotation } from '@/lib/types';
import type { PdfSelection } from '@/components/pdf-pane';

const PdfPane = dynamic(() => import('@/components/pdf-pane').then(m => m.PdfPane), {
  ssr: false,
  loading: () => <ReaderSpinner label="Loading PDF…" />,
});

// ──────────────────────────────────────────────────────────────────────────
// Reader preferences (Kindle-style)
// ──────────────────────────────────────────────────────────────────────────

type ThemeName = 'light' | 'sepia' | 'gray' | 'dark' | 'black';

interface ReaderPrefs {
  theme: ThemeName;
  fontScale: number;          // 0.85 – 1.8
  fontFamily: 'serif' | 'sans';
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  margin: 'narrow' | 'default' | 'wide';
  brightness: number;         // 0.55 – 1
}

const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'dark',
  fontScale: 1,
  fontFamily: 'serif',
  lineSpacing: 'normal',
  margin: 'default',
  brightness: 1,
};

const PREFS_KEY = 'reader-prefs-v1';

function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

const THEME_DEFS: Record<ThemeName, { label: string; bg: string; fg: string; swatch: string }> = {
  light: { label: 'White', bg: '#ffffff', fg: '#16181a', swatch: '#ffffff' },
  sepia: { label: 'Sepia', bg: '#f6efe2', fg: '#4a3f31', swatch: '#f6efe2' },
  gray:  { label: 'Gray',  bg: '#d6d6d6', fg: '#22262a', swatch: '#d6d6d6' },
  dark:  { label: 'Dark',  bg: '#1c1c1c', fg: '#d8d4cc', swatch: '#1c1c1c' },
  black: { label: 'Black', bg: '#000000', fg: '#b8b5ae', swatch: '#000000' },
};

const FONT_STACKS = {
  serif: 'Georgia, Cambria, "Times New Roman", serif',
  sans: '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, sans-serif',
};

const LINE_HEIGHTS = { compact: '1.35', normal: '1.6', relaxed: '1.95' } as const;

const MARGIN_CLASSES = {
  narrow: 'px-2 sm:px-4',
  default: 'px-4 sm:px-10',
  wide: 'px-6 sm:px-24',
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Small shared UI
// ──────────────────────────────────────────────────────────────────────────

function ReaderSpinner({ label }: { label: string }) {
  return (
    <div className="h-full grid place-items-center gap-3 text-slate-400">
      <Loader2 size={22} className="animate-spin" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

interface TocItem { label: string; href: string; depth: number }

// ──────────────────────────────────────────────────────────────────────────
// Main modal
// ──────────────────────────────────────────────────────────────────────────

interface BookReaderModalProps {
  entry: LibraryEntry;
  onClose: () => void;
}

interface Selection extends PdfSelection {
  cfi?: string;
}

export function BookReaderModal({ entry, onClose }: BookReaderModalProps) {
  const [phase, setPhase] = useState<'loading' | 'upload' | 'ready'>('loading');
  const [format, setFormat] = useState<'epub' | 'pdf'>('epub');
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [panel, setPanel] = useState<'none' | 'settings' | 'sidebar'>('none');
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'notes'>('notes');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [percent, setPercent] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);

  const epubApiRef = useRef<{
    prev(): void; next(): void; jump(target: string): void;
    seekPercent(pct: number): void; locationsReady(): boolean;
  } | null>(null);
  const pdfApiRef = useRef<{ zoomIn(): void; zoomOut(): void } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationsReadyRef = useRef(false);

  const pageCount = entry.book?.pageCount || 0;

  // Load persisted prefs
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  // ── Reading-time tracking (feeds real sessions on flush) ──────────────
  const activeSecondsRef = useRef(0);
  const pagesReadRef = useRef(0);
  const pdfTouchedPagesRef = useRef<Set<number>>(new Set());
  const epubMaxPageRef = useRef(0);
  const epubBaselineSetRef = useRef(false);
  const latestLocRef = useRef<{ cfi?: string; percent?: number; page?: number }>({});
  const completedRef = useRef(false);
  const finishedToastShownRef = useRef(false);
  const flushingRef = useRef(false);

  const flushSession = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    const minutes = activeSecondsRef.current / 60;
    const pagesRead = pagesReadRef.current;
    activeSecondsRef.current = 0;
    pagesReadRef.current = 0;
    pdfTouchedPagesRef.current = new Set();
    try {
      const res = await flushReaderSessionAction(entry.id, {
        minutes, pagesRead, ...latestLocRef.current, completed: completedRef.current,
      });
      if (res.success && res.isFinished && !finishedToastShownRef.current) {
        finishedToastShownRef.current = true;
        toast('🎉 You finished this book — logged to your history!', 'success');
      }
    } catch {} finally { flushingRef.current = false; }
  }, [entry.id]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        activeSecondsRef.current += 1;
        if (activeSecondsRef.current >= 300) flushSession();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, flushSession]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushSession(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (activeSecondsRef.current >= 30 || pagesReadRef.current > 0 || completedRef.current) void flushSession();
    };
  }, [flushSession]);

  const handleClose = useCallback(() => { flushSession(); onClose(); }, [flushSession, onClose]);

  const debouncedSave = useCallback((data: { cfi?: string; percent?: number; page?: number }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      await saveReaderProgressAction(entry.id, data);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    }, 800);
  }, [entry.id]);

  const handleRelocated = useCallback((cfi: string, pct: number | null) => {
    if (pct !== null) setPercent(Math.round(pct));
    latestLocRef.current = { cfi, ...(pct !== null ? { percent: Math.round(pct * 100) / 100 } : {}) };
    if (pct !== null && pageCount > 0) {
      const estPage = Math.ceil((pct / 100) * pageCount);
      if (!epubBaselineSetRef.current) {
        epubBaselineSetRef.current = true;
        epubMaxPageRef.current = estPage;
      } else if (estPage > epubMaxPageRef.current) {
        pagesReadRef.current += estPage - epubMaxPageRef.current;
        epubMaxPageRef.current = estPage;
      }
    }
    if (pct !== null && pct >= 99.5 && pageCount > 0) completedRef.current = true;
    debouncedSave({ cfi, ...(pct !== null ? { percent: pct } : {}) });
  }, [debouncedSave, pageCount]);

  const handlePdfPage = useCallback((p: number) => {
    setPage(p);
    latestLocRef.current.page = p;
    pdfTouchedPagesRef.current.add(p);
    pagesReadRef.current = Math.max(pagesReadRef.current, pdfTouchedPagesRef.current.size);
    if (numPages > 0 && p >= numPages) completedRef.current = true;
    debouncedSave({ page: p });
  }, [debouncedSave, numPages]);

  const handleNumPages = useCallback((n: number) => {
    setNumPages(n);
    if (page >= n) completedRef.current = true;
  }, [page]);

  // ── Annotations ───────────────────────────────────────────────────────
  const saveHighlight = async () => {
    if (!selection) return;
    const res = await addReaderHighlightAction({
      libraryEntryId: entry.id, kind: 'highlight', text: selection.text,
      cfi: selection.cfi, page: selection.page, rects: selection.rects,
    });
    if (!res.success) { toast(res.error || 'Could not save highlight', 'error'); return; }
    setAnnotations(prev => [...prev.filter(a => a.id !== res.id), {
      id: res.id!, kind: 'highlight', text: selection.text,
      cfi: selection.cfi, page: selection.page, rects: selection.rects,
    }]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast('Highlight saved — added to your Journal', 'success');
  };

  const saveNote = async () => {
    if (!selection || !noteDraft.trim()) return;
    const res = await addReaderHighlightAction({
      libraryEntryId: entry.id, kind: 'note', text: selection.text.slice(0, 500),
      note: noteDraft.trim(), cfi: selection.cfi, page: selection.page, rects: selection.rects,
    });
    if (!res.success) { toast(res.error || 'Could not save note', 'error'); return; }
    setAnnotations(prev => [...prev.filter(a => a.id !== res.id!), {
      id: res.id!, kind: 'note', text: selection.text.slice(0, 500),
      note: noteDraft.trim(), cfi: selection.cfi, page: selection.page, rects: selection.rects,
    }]);
    setNoteDraft('');
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast('Note saved — added to your Journal', 'success');
  };

  const removeAnnotation = async (a: ReaderAnnotation) => {
    const res = await deleteReaderHighlightAction(a.id);
    if (!res.success) return;
    setAnnotations(prev => prev.filter(x => x.id !== a.id));
    toast('Removed', 'info');
  };

  const attachNoteToExisting = async (a: ReaderAnnotation, text: string) => {
    const res = await updateReaderHighlightAction(a.id, text);
    if (!res.success) return;
    setAnnotations(prev => prev.map(x => (x.id === a.id ? { ...x, note: text, kind: 'note' } : x)));
  };

  const jumpToAnnotation = (a: ReaderAnnotation) => {
    if (a.cfi) epubApiRef.current?.jump(a.cfi);
    else if (a.page) handlePdfPage(a.page);
  };

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (format === 'pdf' && numPages > 0) {
        if (e.key === 'ArrowRight' && page < numPages) handlePdfPage(page + 1);
        if (e.key === 'ArrowLeft' && page > 1) handlePdfPage(page - 1);
      }
      if (e.key === 'Escape') {
        if (selection) { setSelection(null); setNoteDraft(''); }
        else if (panel !== 'none') setPanel('none');
        else handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, format, page, numPages, handlePdfPage, selection, panel, handleClose]);

  // ── Data loading ──────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setPhase('loading');
    const meta = await getReaderDataAction(entry.id);
    if (!meta.success) { toast(meta.error || 'Could not load reader', 'error'); return; }
    if (!meta.hasFile) { setPhase('upload'); return; }
    setFormat(meta.format!);
    setAnnotations((meta.annotations as ReaderAnnotation[]) ?? []);
    if (meta.progress?.page) setPage(meta.progress.page);
    const res = await fetch(`/api/reader/${entry.id}`);
    if (!res.ok) { toast('Could not download the book file', 'error'); return; }
    setFileData(await res.arrayBuffer());
    setPhase('ready');
  }, [entry.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleUpload = async (file: File) => {
    setPhase('loading');
    const fd = new FormData();
    fd.append('file', file);
    const res = await uploadReaderFileAction(entry.id, fd);
    if (!res.success) { toast(res.error || 'Upload failed', 'error'); setPhase('upload'); return; }
    toast(`${file.name} uploaded`, 'success');
    await loadAll();
  };

  // ── Derived chrome values ─────────────────────────────────────────────
  const themeDef = THEME_DEFS[prefs.theme];
  const progressLabel =
    format === 'pdf'
      ? `Page ${page}${numPages ? ` of ${numPages}` : ''}`
      : percent !== null ? `${Math.round(percent)}%` : '';

  const sliderValue = format === 'pdf' ? (numPages ? (page / numPages) * 100 : 0) : (percent ?? 0);

  const onSliderChange = (v: number) => {
    if (format === 'pdf' && numPages > 0) {
      handlePdfPage(Math.min(numPages, Math.max(1, Math.round((v / 100) * numPages))));
    } else {
      setPercent(v);
      epubApiRef.current?.seekPercent(v);
    }
  };

  const openPanel = (p: 'settings' | 'sidebar') => {
    setPanel(prev => (prev === p ? 'none' : p));
    setChromeVisible(true);
  };

  const chromeHidden = !chromeVisible && panel === 'none' && !selection;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" role="dialog" aria-label="Book reader"
         style={{ backgroundColor: prefs.theme === 'light' || prefs.theme === 'sepia' || prefs.theme === 'gray' ? themeDef.bg : '#101112' }}>

      {/* ── Top bar ── */}
      <header
        className={`absolute top-0 inset-x-0 z-40 h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 border-b shadow-sm transition-transform duration-200 ${
          chromeHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ backgroundColor: 'rgba(16,17,18,0.92)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <button className="icon-button" onClick={handleClose} aria-label="Close reader"><X size={18} /></button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="text-sm font-bold text-white truncate leading-tight">{entry.book?.title}</h2>
          <p className="text-[11px] text-slate-400 truncate">{entry.book?.author}</p>
        </div>
        {phase === 'ready' && (
          <>
            <span className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mr-1">
              {saveState === 'saving' && <><Loader2 size={11} className="animate-spin" /> Saving…</>}
              {saveState === 'saved' && <><Check size={12} className="text-emerald-400" /> Saved</>}
            </span>
            <button className={`icon-button ${panel === 'settings' ? '!text-amber-400' : ''}`} onClick={() => openPanel('settings')} aria-label="Reading settings" title="Display settings (Aa)">
              <AArrowDown size={19} />
            </button>
            <button className={`icon-button ${panel === 'sidebar' ? '!text-amber-400' : ''}`} onClick={() => openPanel('sidebar')} aria-label="Contents and highlights" title="Contents & highlights">
              {panel === 'sidebar' ? <PenLine size={17} /> : <List size={18} />}
            </button>
          </>
        )}
      </header>

      {/* ── Body ── */}
      <div className={`relative flex-1 min-h-0 transition-all duration-200 ${chromeHidden ? '' : 'pt-14 pb-14'}`}>
        {phase === 'loading' && <ReaderSpinner label="Opening book…" />}
        {phase === 'upload' && <UploadView onUpload={handleUpload} />}

        {phase === 'ready' && fileData && format === 'epub' && (
          <EpubPane
            data={fileData}
            annotations={annotations}
            prefs={prefs}
            chromeHidden={chromeHidden}
            registerApi={api => { epubApiRef.current = api; }}
            onRelocated={handleRelocated}
            onSelection={sel => setSelection(sel)}
            onLocationsReady={() => { locationsReadyRef.current = true; }}
            onToc={setToc}
            onTapCenter={() => setChromeVisible(v => !v)}
          />
        )}

        {phase === 'ready' && fileData && format === 'pdf' && (
          <div className="absolute inset-0" style={{
            filter: `brightness(${prefs.brightness}) ${
              prefs.theme === 'dark' || prefs.theme === 'black'
                ? 'invert(0.92) hue-rotate(180deg)'
                : prefs.theme === 'sepia' ? 'sepia(0.32)' : ''
            }`,
          }}>
            <PdfPane
              data={fileData}
              page={page}
              onPageChange={handlePdfPage}
              onNumPages={handleNumPages}
              annotations={annotations}
              onSelection={sel => setSelection(sel)}
              onTap={zone => {
                if (zone === 'center') setChromeVisible(v => !v);
                else if (zone === 'prev' && page > 1) handlePdfPage(page - 1);
                else if (zone === 'next' && page < numPages) handlePdfPage(page + 1);
              }}
              registerApi={api => { pdfApiRef.current = api; }}
            />
          </div>
        )}

        {/* Selection action bar */}
        {phase === 'ready' && selection && !noteDraft && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1b1d1f] border border-white/15 rounded-full shadow-2xl pl-3 pr-1.5 py-1.5 z-50">
            <span className="text-[11px] text-slate-300 max-w-32 sm:max-w-56 truncate">&ldquo;{selection.text}&rdquo;</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors" onClick={saveHighlight}>
              <Highlighter size={13} /> Highlight
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors" onClick={() => setNoteDraft(' ')}>
              <StickyNote size={13} /> Note
            </button>
            <button className="w-8 h-8 grid place-items-center rounded-full text-slate-300 hover:bg-white/10" onClick={() => { navigator.clipboard.writeText(selection.text); toast('Copied', 'info'); }} title="Copy">
              <Copy size={13} />
            </button>
            <button className="w-8 h-8 grid place-items-center rounded-full text-slate-500 hover:bg-white/10" onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Note draft */}
        {phase === 'ready' && selection && noteDraft !== '' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#1b1d1f] border border-white/15 rounded-xl shadow-2xl p-3 space-y-2 z-50">
            <p className="text-[11px] text-slate-400 truncate">&ldquo;{selection.text}&rdquo;</p>
            <textarea
              autoFocus rows={2}
              value={noteDraft.trimStart()}
              onChange={e => setNoteDraft(e.target.value === '' ? '' : e.target.value)}
              placeholder="Write your thought about this passage…"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button className="outline-button !py-1.5 text-xs" onClick={() => setNoteDraft('')}>Cancel</button>
              <button className="primary !py-1.5 text-xs" onClick={saveNote}><StickyNote size={13} /> Save Note</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar: location slider ── */}
      {phase === 'ready' && (
        <footer
          className={`absolute bottom-0 inset-x-0 z-40 h-14 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 border-t transition-transform duration-200 ${
            chromeHidden ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{ backgroundColor: 'rgba(16,17,18,0.92)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {format === 'epub' && (
            <button className="icon-button shrink-0" onClick={() => epubApiRef.current?.prev()} aria-label="Previous page"><ChevronLeft size={18} /></button>
          )}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <input
              type="range" min={0} max={100} step={0.5} value={sliderValue}
              onChange={e => onSliderChange(Number(e.target.value))}
              className="reader-slider flex-1"
              aria-label="Book position"
              disabled={format === 'epub' && !locationsReadyRef.current}
            />
            <span className="text-[11px] text-slate-400 font-mono shrink-0 w-20 text-right">
              {format === 'pdf' ? progressLabel : percent !== null ? `${Math.round(percent)}%` : '…'}
            </span>
          </div>
          {format === 'epub' && (
            <button className="icon-button shrink-0" onClick={() => epubApiRef.current?.next()} aria-label="Next page"><ChevronRight size={18} /></button>
          )}
        </footer>
      )}

      {/* ── Settings panel (Aa) ── */}
      {panel === 'settings' && (
        <SettingsPanel prefs={prefs} onChange={setPrefs} onClose={() => setPanel('none')}
          onZoom={(dir) => dir === 'in' ? pdfApiRef.current?.zoomIn() : pdfApiRef.current?.zoomOut()}
          isPdf={format === 'pdf'}
        />
      )}

      {/* ── Sidebar: contents + highlights ── */}
      {panel === 'sidebar' && phase === 'ready' && (
        <Sidebar
          tab={sidebarTab} setTab={setSidebarTab} toc={toc} isEpub={format === 'epub'}
          annotations={annotations}
          onClose={() => setPanel('none')}
          onJumpToc={(href) => { epubApiRef.current?.jump(href); }}
          onJumpAnnotation={jumpToAnnotation}
          onRemoveAnnotation={removeAnnotation}
          onAttachNote={attachNoteToExisting}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Settings panel
// ──────────────────────────────────────────────────────────────────────────

function SettingsPanel({
  prefs, onChange, onClose, onZoom, isPdf,
}: {
  prefs: ReaderPrefs;
  onChange: (p: ReaderPrefs) => void;
  onClose: () => void;
  onZoom: (dir: 'in' | 'out') => void;
  isPdf: boolean;
}) {
  const set = (patch: Partial<ReaderPrefs>) => onChange({ ...prefs, ...patch });

  return (
    <aside className="absolute top-16 right-3 sm:right-5 z-50 w-72 max-w-[88vw] rounded-2xl border border-white/12 shadow-2xl overflow-hidden"
           style={{ backgroundColor: '#17191b' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Display Settings</span>
        <button className="icon-button !p-1.5" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Theme */}
        <section className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Palette size={11} /> Theme</label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(THEME_DEFS) as ThemeName[]).map(name => (
              <button key={name} onClick={() => set({ theme: name })}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border transition-colors ${
                  prefs.theme === name ? 'border-amber-500' : 'border-white/10 hover:border-white/25'
                }`}
                title={THEME_DEFS[name].label}>
                <span className="w-7 h-7 rounded-md border border-black/20" style={{ backgroundColor: THEME_DEFS[name].swatch }} />
                <span className="text-[8px] text-slate-400">{THEME_DEFS[name].label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Text size */}
        <section className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Type size={11} /> Text Size</label>
          {isPdf ? (
            <div className="flex items-center justify-between bg-black/25 rounded-lg p-1">
              <button className="flex-1 py-1.5 rounded-md text-xs text-slate-300 hover:bg-white/10 flex items-center justify-center gap-1" onClick={() => onZoom('out')}><Minus size={12} /> Smaller</button>
              <button className="flex-1 py-1.5 rounded-md text-xs text-slate-300 hover:bg-white/10 flex items-center justify-center gap-1" onClick={() => onZoom('in')}><Plus size={12} /> Larger</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 justify-between bg-black/25 rounded-lg px-2 py-1">
                <span className="text-xs text-slate-500">A</span>
                <input type="range" min={85} max={180} step={5} value={Math.round(prefs.fontScale * 100)}
                  onChange={e => set({ fontScale: Number(e.target.value) / 100 })} className="reader-slider flex-1" />
                <span className="text-base text-white">A</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['serif', 'sans'] as const).map(f => (
                  <button key={f} onClick={() => set({ fontFamily: f })}
                    className={`py-1.5 rounded-lg border text-sm capitalize transition-colors ${
                      prefs.fontFamily === f ? 'border-amber-500 text-amber-400' : 'border-white/10 text-slate-400 hover:border-white/25'
                    }`}
                    style={{ fontFamily: FONT_STACKS[f] }}>
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Line spacing (EPUB only) */}
        {!isPdf && (
          <section className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><AlignLeft size={11} /> Line Spacing</label>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'normal', 'relaxed'] as const).map(ls => (
                <button key={ls} onClick={() => set({ lineSpacing: ls })}
                  className={`py-1.5 rounded-lg border text-[11px] capitalize transition-colors ${
                    prefs.lineSpacing === ls ? 'border-amber-500 text-amber-400' : 'border-white/10 text-slate-400 hover:border-white/25'
                  }`}>
                  {ls}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Margins */}
        <section className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Margins</label>
          <div className="grid grid-cols-3 gap-2">
            {(['narrow', 'default', 'wide'] as const).map(m => (
              <button key={m} onClick={() => set({ margin: m })}
                className={`py-1.5 rounded-lg border text-[11px] capitalize transition-colors ${
                  prefs.margin === m ? 'border-amber-500 text-amber-400' : 'border-white/10 text-slate-400 hover:border-white/25'
                }`}>
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* Brightness */}
        <section className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Sun size={11} /> Brightness</label>
          <div className="flex items-center gap-3 bg-black/25 rounded-lg px-3 py-2">
            <span className="text-[10px] text-slate-500">◐</span>
            <input type="range" min={55} max={100} value={Math.round(prefs.brightness * 100)}
              onChange={e => set({ brightness: Number(e.target.value) / 100 })} className="reader-slider flex-1" />
            <Sun size={12} className="text-amber-300" />
          </div>
        </section>

        <button
          className="w-full py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-400 hover:border-white/25 hover:text-slate-200 flex items-center justify-center gap-1.5"
          onClick={() => onChange({ ...DEFAULT_PREFS, theme: prefs.theme })}>
          <RotateCcw size={11} /> Reset to defaults
        </button>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sidebar (Contents + Highlights)
// ──────────────────────────────────────────────────────────────────────────

function Sidebar({
  tab, setTab, toc, isEpub, annotations,
  onClose, onJumpToc, onJumpAnnotation, onRemoveAnnotation, onAttachNote,
}: {
  tab: 'toc' | 'notes';
  setTab: (t: 'toc' | 'notes') => void;
  toc: TocItem[];
  isEpub: boolean;
  annotations: ReaderAnnotation[];
  onClose: () => void;
  onJumpToc: (href: string) => void;
  onJumpAnnotation: (a: ReaderAnnotation) => void;
  onRemoveAnnotation: (a: ReaderAnnotation) => void;
  onAttachNote: (a: ReaderAnnotation, text: string) => void;
}) {
  return (
    <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#17191b] border-l border-white/10 flex flex-col z-50 shadow-2xl">
      <div className="shrink-0 flex items-center border-b border-white/10">
        <button
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'toc' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setTab('toc')}>
          Contents
        </button>
        <button
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'notes' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setTab('notes')}>
          Highlights ({annotations.length})
        </button>
        <button className="icon-button mr-1" onClick={onClose}><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {tab === 'toc' && (
          !isEpub ? (
            <p className="text-xs text-slate-500 text-center py-8">Table of contents is available for EPUB books.</p>
          ) : toc.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No table of contents found.</p>
          ) : (
            toc.map((item, i) => (
              <button key={i}
                className="w-full text-left text-xs text-slate-300 hover:bg-white/5 hover:text-amber-400 rounded-lg px-2.5 py-2 transition-colors block truncate"
                style={{ paddingLeft: `${8 + item.depth * 12}px` }}
                onClick={() => onJumpToc(item.href)}
                title={item.label}>
                {item.label}
              </button>
            ))
          )
        )}

        {tab === 'notes' && (
          annotations.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Select any text in the book to create your first highlight.</p>
          ) : (
            [...annotations].reverse().map(a => (
              <div key={a.id} className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 space-y-1.5">
                <button className="w-full text-left" onClick={() => onJumpAnnotation(a)}>
                  <span className={`block text-[9px] font-bold uppercase tracking-wider ${a.kind === 'note' ? 'text-blue-400' : 'text-amber-400'}`}>
                    {a.kind}{a.page ? ` · page ${a.page}` : ''}
                  </span>
                  <span className="block text-xs text-slate-200 line-clamp-3 italic">&ldquo;{a.text}&rdquo;</span>
                </button>
                {a.note && <p className="text-[11px] text-blue-300 bg-blue-500/10 rounded p-1.5">{a.note}</p>}
                <div className="flex items-center justify-between">
                  {!a.note && a.kind === 'highlight' ? (
                    <button
                      className="text-[10px] text-slate-500 hover:text-blue-400 flex items-center gap-1"
                      onClick={() => {
                        const input = prompt('Add a note to this highlight:');
                        if (input && input.trim()) onAttachNote(a, input.trim());
                      }}>
                      <StickyNote size={10} /> Add note
                    </button>
                  ) : <span />}
                  <button className="text-slate-600 hover:text-red-400 transition-colors p-0.5" onClick={() => onRemoveAnnotation(a)} aria-label="Delete annotation">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Upload view
// ──────────────────────────────────────────────────────────────────────────

function UploadView({ onUpload }: { onUpload: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="h-full grid place-items-center p-6">
      <div
        className={`w-full max-w-md rounded-2xl border-2 border-dashed p-8 text-center space-y-4 transition-colors ${
          dragOver ? 'border-amber-500/60 bg-amber-500/5' : 'border-white/15'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}>
        <BookOpen size={32} className="mx-auto text-amber-500" />
        <div>
          <h3 className="text-base font-bold text-white">Read this book in-app</h3>
          <p className="text-xs text-slate-400 mt-1">
            Upload an EPUB or PDF to read it here with saved progress, highlights, and notes.<br />
            Max 30MB.
          </p>
        </div>
        {file && (
          <p className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2 inline-block">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <label className="outline-button inline-flex items-center gap-2 cursor-pointer">
            <Upload size={14} /> Choose file
            <input type="file" accept=".epub,.pdf,application/pdf,application/epub+zip" className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>
          <button className="primary" onClick={() => file && onUpload(file)} disabled={!file}>
            <BookOpen size={14} /> Start Reading
          </button>
        </div>
        <p className="text-[10px] text-slate-600">or drag & drop anywhere in this box</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// EPUB pane (epub.js) with Kindle-style behavior
// ──────────────────────────────────────────────────────────────────────────

interface EpubPaneProps {
  data: ArrayBuffer;
  annotations: ReaderAnnotation[];
  prefs: ReaderPrefs;
  chromeHidden: boolean;
  registerApi: (api: {
    prev(): void; next(): void; jump(target: string): void;
    seekPercent(pct: number): void; locationsReady(): boolean;
  } | null) => void;
  onRelocated: (cfi: string, percent: number | null) => void;
  onSelection: (sel: Selection | null) => void;
  onLocationsReady: () => void;
  onToc: (items: TocItem[]) => void;
  onTapCenter: () => void;
}

function EpubPane({
  data, annotations, prefs, chromeHidden, registerApi, onRelocated, onSelection, onLocationsReady, onToc, onTapCenter,
}: EpubPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const restoredRef = useRef(new Set<string>());
  const [ready, setReady] = useState(false);

  // Create book + rendition once
  useEffect(() => {
    let destroyed = false;
    const container = containerRef.current;
    if (!container) return;

    const book = ePub(data as any);
    bookRef.current = book;

    const rendition = book.renderTo(container, {
      width: '100%', height: '100%', flow: 'paginated', spread: 'none',
    });
    renditionRef.current = rendition;

    // Kindle-style tap zones: left third = back, right third = forward, center = toggle chrome
    rendition.hooks.content.register((contents: any) => {
      const doc: Document = contents.document;
      const handler = (ev: MouseEvent) => {
        const sel = doc.getSelection?.();
        if (sel && !sel.isCollapsed) return;
        const rect = container.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        if (x < rect.width * 0.3) rendition.prev();
        else if (x > rect.width * 0.7) rendition.next();
        else onTapCenter();
      };
      doc.addEventListener('click', handler);
    });

    const emitRelocated = (loc: any) => {
      if (destroyed || !loc?.start) return;
      let pct: number | null = null;
      try {
        const p = book.locations.percentageFromCfi(loc.start.cfi);
        if (typeof p === 'number' && p > 0) pct = Math.round(p * 10000) / 100;
        else {
          const spineCount = ((book.spine as any).items?.length as number) || 1;
          pct = Math.min(99, Math.round(((loc.start.index ?? 0) / spineCount) * 100));
        }
      } catch {}
      onRelocated(loc.start.cfi, pct);
    };

    rendition.on('relocated', emitRelocated);
    rendition.on('selected', (cfiRange: string) => {
      if (destroyed) return;
      book.getRange(cfiRange)
        .then(range => {
          const text = range?.toString().trim();
          if (text) onSelection({ text, cfi: cfiRange, rects: [] });
        })
        .catch(() => {});
    });

    rendition.display()
      .then(() => {
        if (destroyed) return;
        setReady(true);
        registerApi({
          prev: () => rendition.prev(),
          next: () => rendition.next(),
          jump: (target: string) => { rendition.display(target).catch(() => {}); },
          seekPercent: (pct: number) => {
            try {
              const cfi = book.locations.cfiFromPercentage(pct / 100);
              if (cfi) rendition.display(cfi).catch(() => {});
              else {
                const spineCount = ((book.spine as any).items?.length as number) || 1;
                const idx = Math.max(0, Math.min(spineCount - 1, Math.floor((pct / 100) * spineCount)));
                rendition.display(idx).catch(() => {});
              }
            } catch {}
          },
          locationsReady: () => (book.locations as any).length?.() > 0,
        });

        // TOC
        book.loaded.navigation
          .then((nav: any) => {
            if (destroyed) return;
            const flat: TocItem[] = [];
            const walk = (items: any[], depth: number) => {
              for (const item of items) {
                if (item.label?.trim()) flat.push({ label: item.label.trim(), href: item.href, depth });
                if (item.subitems?.length) walk(item.subitems, depth + 1);
              }
            };
            walk(nav.toc ?? [], 0);
            onToc(flat);
          })
          .catch(() => {});

        // Real percentages in the background
        book.ready
          .then(() => book.locations.generate(1600))
          .then(() => {
            if (destroyed) return;
            onLocationsReady();
            const loc = (rendition as any).currentLocation?.();
            if (loc?.start) rendition.emit('relocated', loc);
          })
          .catch(() => {});
      })
      .catch(err => console.error('[reader] display failed', err));

    return () => {
      destroyed = true;
      registerApi(null);
      try { rendition.destroy(); } catch {}
      try { book.destroy(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Theme application
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !ready) return;
    const def = THEME_DEFS[prefs.theme];
    const name = `theme-${prefs.theme}`;

    rendition.themes.register(name, {
      body: { background: def.bg, color: def.fg },
      p: { color: def.fg },
      a: { color: '#d97706' },
      'h1, h2, h3, h4, h5, h6': { color: def.fg },
      '::selection': { background: 'rgba(245, 158, 11, 0.35)' },
    });
    rendition.themes.select(name);
    rendition.themes.fontSize(`${Math.round(16 * prefs.fontScale)}px`);
    rendition.themes.override('line-height', LINE_HEIGHTS[prefs.lineSpacing]);
    rendition.themes.override('font-family', FONT_STACKS[prefs.fontFamily]);
  }, [prefs.theme, prefs.fontScale, prefs.lineSpacing, prefs.fontFamily, ready]);

  // Restore highlights
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !ready) return;
    for (const a of annotations) {
      if (a.cfi && !restoredRef.current.has(a.id)) {
        restoredRef.current.add(a.id);
        try {
          rendition.annotations.add('highlight', a.cfi, {}, () => {}, undefined, {
            fill: 'rgba(245, 158, 11, 0.32)',
            'mix-blend-mode': 'multiply',
          } as any);
        } catch {}
      }
    }
  }, [annotations, ready]);

  const themeBg = THEME_DEFS[prefs.theme].bg;

  return (
    <div
      ref={containerRef}
      className={`h-full w-full transition-all duration-200 ${MARGIN_CLASSES[prefs.margin]} ${chromeHidden ? 'pt-2 pb-2' : 'pt-3 pb-3'}`}
      style={{ backgroundColor: themeBg }}
    />
  );
}
