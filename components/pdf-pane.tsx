'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import type { ReaderAnnotation } from '@/lib/types';
import { bindSwipe, isCoarsePointer } from '@/components/gestures';

// Point pdf.js at the worker copied into /public (must match the bundled pdfjs-dist version)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface PdfSelection {
  text: string;
  page?: number;
  rects: { pctX: number; pctY: number; pctW: number; pctH: number }[];
}

interface PdfPaneProps {
  /** Authenticated API route serving the PDF bytes (pdf.js fetches it itself) */
  url: string;
  page: number;
  onPageChange: (page: number) => void;
  onNumPages: (numPages: number) => void;
  annotations: ReaderAnnotation[];
  onSelection: (selection: PdfSelection | null) => void;
  /** Kindle-style screen-edge taps: 'prev' | 'next' | 'center' */
  onTap?: (zone: 'prev' | 'next' | 'center') => void;
  registerApi?: (api: { zoomIn(): void; zoomOut(): void } | null) => void;
}

// US Letter width in pt; used for initial fit-width calculation
const BASE_PAGE_WIDTH = 612;

export function PdfPane({
  url, page, onPageChange, onNumPages, annotations, onSelection, onTap, registerApi,
}: PdfPaneProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);

  // Stable identity so react-pdf doesn't reload the document on every render.
  // Loading by URL also avoids ArrayBuffer detachment (pdf.js transfers buffers
  // to its worker, which would corrupt any raw bytes we passed in).
  const file = useMemo(() => ({ url }), [url]);

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

  // Expose zoom controls to the settings panel
  useEffect(() => {
    if (!registerApi) return;
    registerApi({
      zoomIn: () => { setAutoFit(false); setScale(s => Math.min(3, +(s + 0.15).toFixed(2))); },
      zoomOut: () => { setAutoFit(false); setScale(s => Math.max(0.4, +(s - 0.15).toFixed(2))); },
    });
    return () => registerApi(null);
  }, [registerApi]);

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

  // Kindle-style edge taps (desktop only; touch uses swipe gestures instead)
  const handleTap = useCallback((e: React.MouseEvent) => {
    if (!onTap || isCoarsePointer()) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input')) return;

    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) onTap('prev');
    else if (x > rect.width * 0.7) onTap('next');
    else onTap('center');
  }, [onTap]);

  // Touch: swipe turns pages, quick tap toggles chrome, long-press selects text
  useEffect(() => {
    if (!onTap || !scrollRef.current) return;
    if (!isCoarsePointer()) return;
    const el = scrollRef.current;
    return bindSwipe(el, {
      onSwipe: dir => onTap(dir),
      onTap: () => onTap('center'),
    }, () => {
      const s = window.getSelection();
      return !s || s.isCollapsed;
    });
  }, [onTap]);

  const pageAnnotations = annotations.filter(a => a.page === page);

  return (
    <div className="h-full min-h-0">
      <div
        ref={scrollRef}
        className="h-full overflow-auto flex justify-center py-4 px-4"
        onMouseUp={captureSelection}
        onClick={handleTap}
      >
        <Document
          file={file}
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
                  }}
                  title={a.note || a.text}
                />
              ))
            )}
          </div>
        </Document>
      </div>
    </div>
  );
}
