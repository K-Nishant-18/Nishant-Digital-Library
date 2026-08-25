'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import type { ReaderAnnotation } from '@/lib/types';

export interface PdfSelection {
  text: string;
  page?: number;
  rects: { pctX: number; pctY: number; pctW: number; pctH: number }[];
}

interface PdfPaneProps {
  data: ArrayBuffer;
  page: number;
  onPageChange: (page: number) => void;
  onNumPages: (numPages: number) => void;
  annotations: ReaderAnnotation[];
  onSelection: (selection: PdfSelection | null) => void;
}

// US Letter width in pt; used for initial fit-width calculation
const BASE_PAGE_WIDTH = 612;

export function PdfPane({ data, page, onPageChange, onNumPages, annotations, onSelection }: PdfPaneProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);

  // Fit width to the available container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoFit) return;
    const apply = () => {
      const w = el.clientWidth - 48;
      if (w > 200) setScale(Math.min(2.5, Math.max(0.4, w / BASE_PAGE_WIDTH)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit]);

  // Clear any pending selection when turning pages
  useEffect(() => {
    onSelection(null);
    window.getSelection()?.removeAllRanges();
    scrollRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const captureSelection = useCallback(() => {
    const wrap = pageWrapRef.current;
    const sel = window.getSelection();
    if (!wrap || !sel || sel.isCollapsed || !wrap.contains(sel.anchorNode)) {
      onSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 2) {
      onSelection(null);
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const rects: PdfSelection['rects'] = [];
    for (let i = 0; i < sel.rangeCount; i++) {
      const range = sel.getRangeAt(i);
      for (let r = 0; r < range.getClientRects().length; r++) {
        const rect = range.getClientRects()[r];
        if (rect.width < 2 || rect.height < 5) continue;
        rects.push({
          pctX: (rect.left - wrapRect.left) / wrapRect.width,
          pctY: (rect.top - wrapRect.top) / wrapRect.height,
          pctW: rect.width / wrapRect.width,
          pctH: rect.height / wrapRect.height,
        });
      }
    }
    if (rects.length > 0) onSelection({ text, page, rects });
  }, [onSelection]);

  const pageAnnotations = annotations.filter(a => a.page === page);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto flex justify-center py-4 px-4"
        onMouseUp={captureSelection}
      >
        <Document
          file={{ data }}
          onLoadSuccess={(doc) => { setNumPages(doc.numPages); onNumPages(doc.numPages); }}
          loading={<div className="text-slate-400 text-xs p-8">Loading PDF…</div>}
          error={<div className="text-red-400 text-xs p-8">Could not open this PDF.</div>}
        >
          <div ref={pageWrapRef} className="relative shadow-2xl">
            <Page
              pageNumber={Math.min(Math.max(page, 1), Math.max(numPages, 1))}
              scale={scale}
              renderAnnotationLayer={false}
              loading={<div className="w-[612px] h-[792px] max-w-full bg-slate-800 animate-pulse rounded" />}
            />
            {/* Restored highlight overlays */}
            {pageAnnotations.map(a =>
              (a.rects ?? []).map((r, i) => (
                <div
                  key={`${a.id}-${i}`}
                  className="absolute rounded-sm pointer-events-none"
                  style={{
                    left: `${r.pctX * 100}%`,
                    top: `${r.pctY * 100}%`,
                    width: `${r.pctW * 100}%`,
                    height: `${r.pctH * 100}%`,
                    backgroundColor: a.kind === 'note' ? 'rgba(59,130,246,0.35)' : 'rgba(245,158,11,0.35)',
                    mixBlendMode: 'multiply',
                  }}
                  title={a.note || a.text}
                />
              ))
            )}
          </div>
        </Document>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-20 right-6 flex items-center gap-1 bg-black/70 backdrop-blur rounded-lg border border-white/10 p-1 z-10">
        <button
          className="w-7 h-7 rounded text-slate-300 hover:bg-white/10 text-sm"
          onClick={() => { setAutoFit(false); setScale(s => Math.max(0.4, +(s - 0.15).toFixed(2))); }}
        >
          −
        </button>
        <span className="text-[10px] text-slate-400 font-mono w-9 text-center">{Math.round(scale * 100)}%</span>
        <button
          className="w-7 h-7 rounded text-slate-300 hover:bg-white/10 text-sm"
          onClick={() => { setAutoFit(false); setScale(s => Math.min(3, +(s + 0.15).toFixed(2))); }}
        >
          +
        </button>
        {!autoFit && (
          <button
            className="px-2 h-7 rounded text-[10px] text-amber-400 hover:bg-white/10"
            onClick={() => setAutoFit(true)}
          >
            Fit
          </button>
        )}
      </div>

      {numPages > 0 && (
        <div className="shrink-0 h-9 flex items-center justify-center gap-3 border-t border-white/10 bg-[#141618] text-xs text-slate-400">
          <button
            className="px-3 py-1 rounded-md hover:bg-white/10 disabled:opacity-30"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Prev
          </button>
          <span className="font-mono">Page {page} / {numPages}</span>
          <button
            className="px-3 py-1 rounded-md hover:bg-white/10 disabled:opacity-30"
            disabled={page >= numPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
