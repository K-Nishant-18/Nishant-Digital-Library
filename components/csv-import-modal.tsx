'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, X } from 'lucide-react';
import { toast } from '@/components/toast';
import { searchExternalBooks, getCoverColor } from '@/lib/api';
import { addBookToLibraryAction } from '@/lib/actions';
import type { Book } from '@/lib/types';

interface CsvImportModalProps {
  onClose: () => void;
}

const MAX_ROWS = 200;
const LOOKUP_DELAY_MS = 300;

type EntryStatus = 'tbr' | 'reading' | 'read';

interface ParsedRow {
  title: string;
  author: string;
  isbn?: string;
  pages?: number;
  publisher?: string;
  year?: number;
  status: EntryStatus;
}

/** Minimal CSV parser supporting quoted fields, escaped quotes, and CRLF */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // skip
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_]+/g, ' ').trim();

function pickColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function mapStatus(shelfValue: string): EntryStatus {
  const v = shelfValue.toLowerCase();
  if (v.includes('currently')) return 'reading';
  if (v.includes('to-read') || v.includes('want to read') || v.includes('to read')) return 'tbr';
  if (v.includes('read') || v.includes('finished')) return 'read';
  return 'tbr';
}

function parseRows(text: string): ParsedRow[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const headers = table[0].map(normalizeHeader);

  const iTitle = pickColumn(headers, ['title']);
  const iAuthor = pickColumn(headers, ['author', 'authors', 'author l-f', 'additional authors']);
  const iIsbn13 = pickColumn(headers, ['isbn13', 'isbn', 'isbn/uid']);
  const iIsbn = pickColumn(headers, ['isbn', 'isbn/uid']);
  const iPages = pickColumn(headers, ['number of pages', 'pages']);
  const iPublisher = pickColumn(headers, ['publisher']);
  const iYear = pickColumn(headers, ['year published', 'original publication year', 'publication year']);
  const iShelves = pickColumn(headers, ['bookshelves', 'exclusive shelf', 'read statuses', 'read status', 'shelves']);

  const cleanIsbn = (v: string) => {
    const m = v.match(/(\d{9}[\dxX]|\d{10,13})/);
    return m ? m[1] : undefined;
  };

  const out: ParsedRow[] = [];
  for (const cells of table.slice(1)) {
    const title = (iTitle >= 0 ? cells[iTitle] : '').trim();
    if (!title) continue;
    if (/^=\s*"/.test(title)) continue; // formula artifacts

    const shelfVal = `${iShelves >= 0 ? cells[iShelves] : ''}`;
    out.push({
      title,
      author: (iAuthor >= 0 ? cells[iAuthor] : '').trim() || 'Unknown Author',
      isbn: cleanIsbn(iIsbn13 >= 0 ? cells[iIsbn13] : '') || cleanIsbn(iIsbn >= 0 ? cells[iIsbn] : ''),
      pages: iPages >= 0 ? parseInt(cells[iPages]) || undefined : undefined,
      publisher: iPublisher >= 0 ? cells[iPublisher]?.trim() || undefined : undefined,
      year: iYear >= 0 ? parseInt(cells[iYear]) || undefined : undefined,
      status: mapStatus(shelfVal),
    });
    if (out.length >= MAX_ROWS) break;
  }
  return out;
}

export function CsvImportModal({ onClose }: CsvImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, ok: 0, failed: 0 });

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseRows(text);
    setFileName(file.name);
    setRows(parsed);
    if (parsed.length === 0) toast('No book rows found in that CSV', 'error');
  };

  const startImport = async () => {
    if (!rows || rows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, ok: 0, failed: 0 });

    let ok = 0;
    let failed = 0;
    let done = 0;

    for (const row of rows) {
      try {
        // Backfill metadata (cover, page count, genres…) from Google Books / Open Library
        const query = row.isbn ? `isbn:${row.isbn}` : `${row.title} ${row.author}`;
        const results = await searchExternalBooks(query);
        const match = results[0];

        const book: Partial<Book> = match
          ? {
              ...match,
              title: row.title,
              author: row.author,
              pageCount: row.pages ?? match.pageCount,
              publisher: row.publisher ?? match.publisher,
              publishedYear: row.year ?? match.publishedYear,
              isbn13: row.isbn?.length === 13 ? row.isbn : match.isbn13,
              isbn: row.isbn?.length === 10 ? row.isbn : match.isbn,
            }
          : {
              id: `csv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              title: row.title,
              author: row.author,
              coverColor: getCoverColor(),
              coverUrl: '',
              genres: [],
              format: 'paperback',
              pageCount: row.pages ?? 300,
              publishedYear: row.year,
              publisher: row.publisher,
            };

        const res = await addBookToLibraryAction(book, row.status);
        if (res.success) ok++; else failed++;
      } catch {
        failed++;
      }
      done++;
      setProgress({ done, ok, failed });
      await new Promise(r => setTimeout(r, LOOKUP_DELAY_MS));
    }

    setImporting(false);
    toast(`Imported ${ok} of ${done} books${failed > 0 ? ` (${failed} failed)` : ''}`, failed > 0 && ok === 0 ? 'error' : 'success');
    if (failed < done) setTimeout(onClose, 1200);
  };

  return (
    <div className="search-overlay" role="dialog" aria-label="Import CSV">
      <div className="search-modal max-w-xl space-y-4">
        <button className="close" onClick={onClose} disabled={importing}><X size={18} /></button>

        <h2 className="text-lg font-bold text-white flex items-center gap-2 pr-8">
          <Upload size={20} className="text-amber-500" /> Import from Goodreads / StoryGraph
        </h2>
        <p className="text-xs text-slate-400">
          Export your library as CSV from Goodreads (<span className="font-mono">My Books → Import/Export</span>) or StoryGraph,
          then drop it here. Covers and metadata are auto-filled from Google Books. Up to {MAX_ROWS} books per import.
        </p>

        {!rows && (
          <label className="block border border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500/50 transition-colors">
            <Upload size={28} className="mx-auto text-slate-500 mb-2" />
            <span className="text-sm text-slate-300 font-medium">Choose a CSV file</span>
            <p className="text-[11px] text-slate-500 mt-1">goodreads_library_export.csv</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}

        {rows && (
          <>
            <div className="flex items-center justify-between text-xs bg-slate-900/60 rounded-lg border border-white/5 p-3">
              <span className="flex items-center gap-2 text-slate-300">
                <FileText size={14} className="text-amber-500" /> {fileName}
              </span>
              <span className="font-mono text-slate-400">{rows.length} books found</span>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {rows.slice(0, 25).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-900/40 rounded-lg px-3 py-1.5 border border-white/5">
                  <span className="truncate min-w-0">
                    <b className="text-white">{r.title}</b>{' '}
                    <span className="text-slate-400 truncate">— {r.author}</span>
                  </span>
                  <span className={`shrink-0 ml-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    r.status === 'reading' ? 'bg-blue-500/20 text-blue-400'
                      : r.status === 'read' ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
              {rows.length > 25 && (
                <p className="text-[11px] text-slate-500 text-center pt-1">…and {rows.length - 25} more</p>
              )}
            </div>

            {importing && (
              <div className="space-y-1.5">
                <div className="progress !mt-0"><span style={{ width: `${(progress.done / Math.max(rows.length, 1)) * 100}%` }} /></div>
                <p className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Importing… {progress.done}/{rows.length}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> {progress.ok}</span>
                    {progress.failed > 0 && (
                      <span className="text-red-400 flex items-center gap-1"><XCircle size={12} /> {progress.failed}</span>
                    )}
                  </span>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {!importing && (
                <button className="outline-button flex-1 flex items-center justify-center" onClick={() => setRows(null)} disabled={importing}>
                  Choose different file
                </button>
              )}
              <button className="primary flex-1 justify-center" onClick={startImport} disabled={importing || rows.length === 0}>
                <Upload size={15} /> {importing ? 'Importing…' : `Import ${rows.length} books`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
