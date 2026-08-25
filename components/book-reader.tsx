'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ePub, { type Book as EpubBook, type Rendition } from 'epubjs';
import {
  X, BookOpen, Upload, Highlighter, StickyNote, Copy, Trash2, PanelRightClose,
  PanelRight, Check, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from '@/components/toast';
import { CoverImage } from '@/components/cover-image';
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
  loading: () => <div className="flex-1 grid place-items-center text-slate-400 text-xs"><Loader2 size={18} className="animate-spin" /></div>,
});

interface BookReaderModalProps {
  entry: LibraryEntry;
  onClose: () => void;
}

interface Selection extends PdfSelection {
  cfi?: string;
}

export function BookReaderModal({ entry, onClose }: BookReaderModalProps) {
  const [phase, setPhase] = useState<'loading' | 'upload' | 'uploading' | 'ready'>('loading');
  const [format, setFormat] = useState<'epub' | 'pdf'>('epub');
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [percent, setPercent] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  const epubApiRef = useRef<{ prev(): void; next(): void; jump(cfi: string): void } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reading-time tracking (feeds real sessions on flush) ──────────────
  const activeSecondsRef = useRef(0);        // seconds accumulated since last flush
  const pagesReadRef = useRef(0);            // distinct pages viewed / est. pages turned
  const pdfTouchedPagesRef = useRef<Set<number>>(new Set());
  const epubMaxPageRef = useRef(0);          // furthest estimated page reached in EPUB
  const epubBaselineSetRef = useRef(false);
  const latestLocRef = useRef<{ cfi?: string; percent?: number; page?: number }>({});
  const completedRef = useRef(false);
  const finishedToastShownRef = useRef(false);
  const flushingRef = useRef(false);

  const pageCount = entry.book?.pageCount || 0;

  const flushSession = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;

    const minutes = activeSecondsRef.current / 60;
    const pagesRead = pagesReadRef.current;
    activeSecondsRef.current = 0;
    pagesReadRef.current = 0;
    pdfTouchedPagesRef.current = new Set();

    const payload = {
      minutes,
      pagesRead,
      ...latestLocRef.current,
      completed: completedRef.current,
    };

    try {
      const res = await flushReaderSessionAction(entry.id, payload);
      if (res.success && res.isFinished && !finishedToastShownRef.current) {
        finishedToastShownRef.current = true;
        toast('🎉 You finished this book — logged to your history!', 'success');
      }
    } catch {
      // best-effort; progress saves still happen independently
    } finally {
      flushingRef.current = false;
    }
  }, [entry.id]);

  // Active-time ticker: counts only while the tab is visible
  useEffect(() => {
    if (phase !== 'ready') return;
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        activeSecondsRef.current += 1;
        if (activeSecondsRef.current >= 300) flushSession(); // checkpoint every ~5 min
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, flushSession]);

  // Flush when the tab/app goes to background or closes
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushSession(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (activeSecondsRef.current >= 30 || pagesReadRef.current > 0 || completedRef.current) {
        void flushSession();
      }
    };
  }, [flushSession]);

  const handleClose = useCallback(() => {
    flushSession();
    onClose();
  }, [flushSession, onClose]);

  const handleNumPages = useCallback((n: number) => {
    setNumPages(n);
    if (page >= n) completedRef.current = true;
  }, [page]);

  const loadAll = useCallback(async () => {
    setPhase('loading');
    const meta = await getReaderDataAction(entry.id);
    if (!meta.success) {
      toast(meta.error || 'Could not load reader', 'error');
      return;
    }
    if (!meta.hasFile) {
      setPhase('upload');
      return;
    }
    setFormat(meta.format!);
    setAnnotations((meta.annotations as ReaderAnnotation[]) ?? []);
    if (meta.progress?.page) setPage(meta.progress.page);

    const res = await fetch(`/api/reader/${entry.id}`);
    if (!res.ok) {
      toast('Could not download the book file', 'error');
      return;
    }
    setFileData(await res.arrayBuffer());
    setPhase('ready');
  }, [entry.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

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
        // First relocation = resume position; baseline so we don't count old progress
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

  // ── Annotation actions ────────────────────────────────────────────────
  const saveHighlight = async () => {
    if (!selection) return;
    const res = await addReaderHighlightAction({
      libraryEntryId: entry.id,
      kind: 'highlight',
      text: selection.text,
      cfi: selection.cfi,
      page: selection.page,
      rects: selection.rects,
    });
    if (!res.success) { toast(res.error || 'Could not save highlight', 'error'); return; }
    setAnnotations(prev => [...prev.filter(a => a.id !== res.id), {
      id: res.id!, kind: 'highlight', text: selection.text,
      cfi: selection.cfi, page: selection.page, rects: selection.rects,
    }]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast('Highlight saved', 'success');
  };

  const saveNote = async () => {
    if (!selection || !noteDraft.trim()) return;
    const res = await addReaderHighlightAction({
      libraryEntryId: entry.id,
      kind: 'note',
      text: selection.text.slice(0, 500),
      note: noteDraft.trim(),
      cfi: selection.cfi,
      page: selection.page,
      rects: selection.rects,
    });
    if (!res.success) { toast(res.error || 'Could not save note', 'error'); return; }
    setAnnotations(prev => [...prev.filter(a => a.id !== res.id!), {
      id: res.id!, kind: 'note', text: selection.text.slice(0, 500),
      note: noteDraft.trim(), cfi: selection.cfi, page: selection.page, rects: selection.rects,
    }]);
    setNoteDraft('');
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast('Note saved', 'success');
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

  // ── Keyboard navigation ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (format === 'pdf' && numPages > 0) {
        if (e.key === 'ArrowRight' && page < numPages) handlePdfPage(page + 1);
        if (e.key === 'ArrowLeft' && page > 1) handlePdfPage(page - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, format, page, numPages, handlePdfPage]);

  // ── Upload view ───────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    setPhase('uploading');
    const fd = new FormData();
    fd.append('file', file);
    const res = await uploadReaderFileAction(entry.id, fd);
    if (!res.success) {
      toast(res.error || 'Upload failed', 'error');
      setPhase('upload');
      return;
    }
    toast(`${file.name} uploaded`, 'success');
    await loadAll();
  };

  const progressLabel =
    format === 'pdf'
      ? `Page ${page}${numPages ? ` of ${numPages}` : ''}`
      : percent !== null
        ? `${percent}%`
        : '';

  return (
    <div className="fixed inset-0 z-[90] bg-[#101112] flex flex-col" role="dialog" aria-label="Book reader">
      {/* Toolbar */}
      <header className="shrink-0 h-14 flex items-center gap-3 px-3 sm:px-5 border-b border-white/10 bg-[#141618]">
        <button className="icon-button" onClick={handleClose} aria-label="Close reader">
          <X size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-white truncate leading-tight">{entry.book?.title}</h2>
          <p className="text-[11px] text-slate-400 truncate">{entry.book?.author}</p>
        </div>

        {phase === 'ready' && (
          <>
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              {saveState === 'saving' && <><Loader2 size={11} className="animate-spin" /> Saving…</>}
              {saveState === 'saved' && <><Check size={12} className="text-emerald-400" /> Saved</>}
              {progressLabel && <span className="text-slate-300">{progressLabel}</span>}
            </span>
            {format === 'epub' && (
              <div className="flex items-center gap-1">
                <button className="icon-button" onClick={() => epubApiRef.current?.prev()} aria-label="Previous page"><ChevronLeft size={17} /></button>
                <button className="icon-button" onClick={() => epubApiRef.current?.next()} aria-label="Next page"><ChevronRight size={17} /></button>
              </div>
            )}
            <button className="icon-button" onClick={() => setSidebarOpen(s => !s)} aria-label="Toggle highlights panel">
              {sidebarOpen ? <PanelRightClose size={17} /> : <PanelRight size={17} />}
            </button>
          </>
        )}
      </header>

      {/* Body */}
      <div className="relative flex-1 min-h-0">
        {phase === 'loading' && (
          <div className="h-full grid place-items-center text-slate-400 text-sm gap-2">
            <Loader2 size={22} className="animate-spin" /> Opening book…
          </div>
        )}

        {phase === 'upload' && <UploadView onUpload={handleUpload} />}

        {phase === 'uploading' && (
          <div className="h-full grid place-items-center text-slate-400 text-sm gap-2">
            <Loader2 size={22} className="animate-spin" /> Uploading…
          </div>
        )}

        {phase === 'ready' && fileData && format === 'epub' && (
          <EpubPane
            data={fileData}
            initialCfi={undefined}
            annotations={annotations}
            registerApi={api => { epubApiRef.current = api; }}
            onRelocated={handleRelocated}
            onSelection={sel => setSelection(sel)}
          />
        )}

        {phase === 'ready' && fileData && format === 'pdf' && (
          <div className="absolute inset-0">
            <PdfPane
              data={fileData}
              page={page}
              onPageChange={handlePdfPage}
              onNumPages={handleNumPages}
              annotations={annotations}
              onSelection={sel => setSelection(sel)}
            />
          </div>
        )}

        {/* Selection action bar */}
        {phase === 'ready' && selection && !noteDraft && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1b1d1f] border border-white/15 rounded-xl shadow-2xl px-2 py-1.5 z-20">
            <span className="text-[11px] text-slate-300 max-w-40 sm:max-w-64 truncate px-2">&ldquo;{selection.text}&rdquo;</span>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
              onClick={saveHighlight}
            >
              <Highlighter size={13} /> Highlight
            </button>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
              onClick={() => setNoteDraft(' ')}
            >
              <StickyNote size={13} /> Note
            </button>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-white/10"
              onClick={() => { navigator.clipboard.writeText(selection.text); toast('Copied', 'info'); }}
            >
              <Copy size={13} />
            </button>
            <button className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-white/10" onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Note draft */}
        {phase === 'ready' && selection && noteDraft !== '' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#1b1d1f] border border-white/15 rounded-xl shadow-2xl p-3 space-y-2 z-20">
            <p className="text-[11px] text-slate-400 truncate">&ldquo;{selection.text}&rdquo;</p>
            <textarea
              autoFocus
              rows={2}
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

      {/* Sidebar: highlights & notes */}
      {sidebarOpen && phase === 'ready' && (
        <aside className="fixed right-0 top-14 bottom-0 w-80 max-w-[85vw] bg-[#17191b] border-l border-white/10 flex flex-col z-30">
          <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Highlights & Notes</h3>
            <span className="text-[10px] text-slate-500 font-mono">{annotations.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {annotations.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">Select any text in the book to create your first highlight.</p>
            )}
            {[...annotations].reverse().map(a => (
              <div key={a.id} className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 space-y-1.5">
                <button
                  className="w-full text-left"
                  onClick={() => {
                    if (a.cfi) epubApiRef.current?.jump(a.cfi);
                    else if (a.page) handlePdfPage(a.page);
                  }}
                >
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
                        if (input && input.trim()) attachNoteToExisting(a, input.trim());
                      }}
                    >
                      <StickyNote size={10} /> Add note
                    </button>
                  ) : <span />}
                  <button
                    className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                    onClick={() => removeAnnotation(a)}
                    aria-label="Delete annotation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Upload view
// ──────────────────────────────────────────────────────────────────────────

function UploadView({ onUpload }: { onUpload: (f: File) => void; uploading?: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const start = () => { if (file) onUpload(file); };

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
        }}
      >
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
            <input
              type="file"
              accept=".epub,.pdf,application/pdf,application/epub+zip"
              className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </label>
          <button className="primary" onClick={start} disabled={!file}>
            <BookOpen size={14} /> Start Reading
          </button>
        </div>
        <p className="text-[10px] text-slate-600">or drag & drop anywhere in this box</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// EPUB pane (epub.js)
// ──────────────────────────────────────────────────────────────────────────

interface EpubPaneProps {
  data: ArrayBuffer;
  annotations: ReaderAnnotation[];
  initialCfi?: string;
  registerApi: (api: { prev(): void; next(): void; jump(cfi: string): void } | null) => void;
  onRelocated: (cfi: string, percent: number | null) => void;
  onSelection: (sel: Selection | null) => void;
}

const HIGHLIGHT_STYLE = {
  fill: 'rgba(245, 158, 11, 0.32)',
  'mix-blend-mode': 'multiply',
};

function EpubPane({ data, annotations, registerApi, onRelocated, onSelection }: EpubPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const restoredRef = useRef(new Set<string>());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;
    const container = containerRef.current;
    if (!container) return;

    const book = ePub(data as any);
    bookRef.current = book;

    const rendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
    });
    renditionRef.current = rendition;

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
          if (text) onSelection({ text, cfi: cfiRange, page: undefined, rects: [] });
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
          jump: (cfi: string) => { rendition.display(cfi).catch(() => {}); },
        });
        // Generate real percentages in the background
        book.ready
          .then(() => book.locations.generate(1600))
          .then(() => {
            if (destroyed) return;
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

  // Restore existing highlights once the book is displayed
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !ready) return;
    for (const a of annotations) {
      if (a.cfi && !restoredRef.current.has(a.id)) {
        restoredRef.current.add(a.id);
        try {
          rendition.annotations.add('highlight', a.cfi, {}, () => {}, undefined, HIGHLIGHT_STYLE as any);
        } catch {}
      }
    }
  }, [annotations, ready]);

  return (
    <div className="h-full w-full p-2 sm:p-4">
      <div
        ref={containerRef}
        className="h-full w-full mx-auto max-w-3xl rounded-lg overflow-hidden bg-white shadow-2xl [&_iframe]:bg-white"
        onMouseUp={() => {
          // epub.js emits its own `selected`; nothing extra needed here
        }}
      />
    </div>
  );
}
