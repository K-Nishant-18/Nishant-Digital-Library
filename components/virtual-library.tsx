'use client';

import { useState } from 'react';
import {
  Grid2X2, List, LayoutGrid, Filter, Search, Plus, Star, Heart, Bookmark,
  Sparkles, CheckCircle2, SlidersHorizontal, BookOpen, Layers, Sliders, Edit3, Upload
} from 'lucide-react';
import { CoverImage } from '@/components/cover-image';
import { CsvImportModal } from '@/components/csv-import-modal';
import type { Book, Shelf, LibraryEntry } from '@/lib/types';

interface VirtualLibraryProps {
  onSelectBook: (book: Book) => void;
  onAddBook: () => void;
  onEditBook?: (entry: LibraryEntry) => void;
  onOpenReader?: (entry: LibraryEntry) => void;
  onAutoTag?: () => void;
  initialStatus?: string;
  books?: Book[];
  entries?: LibraryEntry[];
  shelves?: Shelf[];
}

export function VirtualLibraryView({
  onSelectBook,
  onAddBook,
  onEditBook,
  onOpenReader,
  onAutoTag,
  initialStatus = 'all',
  books = [],
  entries = [],
  shelves = [],
}: VirtualLibraryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'shelf' | 'list'>('grid');
  const [selectedShelf, setSelectedShelf] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const currentShelf = shelves.find(s => s.id === selectedShelf) || shelves[0];

  const filteredBooks = books.filter(book => {
    const matchesSearch = `${book.title} ${book.author} ${(book.genres || []).join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase());

    // Check shelf match
    const inShelf = !currentShelf || currentShelf.isDefault || (currentShelf.bookIds || []).includes(book.id);

    // Check status match
    const entry = entries.find(e => e.bookId === book.id || e.id === book.id);
    const matchesStatus = selectedStatus === 'all' || (entry && entry.status === selectedStatus);

    return matchesSearch && inShelf && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Personal Collection</div>
          <h1 className="text-2xl font-bold text-white">Virtual Library</h1>
          <p className="text-sm text-slate-400">Your digital bookshelf with customizable collections and reading views.</p>
        </div>

<div className="flex items-center gap-2">
          <button
            className="outline-button flex items-center gap-2 px-4 py-2 rounded-lg"
            onClick={() => setImportOpen(true)}
            title="Import your Goodreads or StoryGraph library"
          >
            <Upload size={15} /> Import CSV
          </button>
          {onAutoTag && (
            <button
              className="outline-button flex items-center gap-2 px-4 py-2 rounded-lg"
              onClick={onAutoTag}
              title="AI Auto-tag books with genres and mood"
            >
              <Sparkles size={15} /> Auto-tag
            </button>
          )}
          <button className="primary flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow" onClick={onAddBook}>
            <Plus size={16} /> Add a Book
          </button>
        </div>
      </div>

      {importOpen && <CsvImportModal onClose={() => setImportOpen(false)} />}

      {/* Shelves Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
        {shelves.map(shelf => (
          <button
            key={shelf.id}
            onClick={() => setSelectedShelf(shelf.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-all ${selectedShelf === shelf.id
                ? 'bg-amber-500 text-black font-semibold shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
          >
            <span>{shelf.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedShelf === shelf.id ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
              }`}>
              {shelf.isDefault ? books.length : (shelf.bookIds || []).length}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar: Search, Filters, View Switches */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-white/5 shadow-sm">
<div className="relative w-full sm:w-72">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
  <input
    type="text"
    placeholder="Filter title, author, genre..."
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
  />
</div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-white/10 text-xs text-slate-300 rounded-lg px-3 py-1.5 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="reading">Currently Reading</option>
            <option value="read">Finished Books</option>
            <option value="tbr">TBR Queue</option>
          </select>

          {/* View Toggles */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-white/10 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid2X2 size={16} />
            </button>
            <button
              onClick={() => setViewMode('shelf')}
              className={`p-1.5 rounded ${viewMode === 'shelf' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
              title="Virtual Bookshelf View"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredBooks.length === 0 ? (
            <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 panel text-center py-12 space-y-3 rounded-xl">
              <BookOpen size={32} className="mx-auto text-slate-600" />
              <h3 className="text-white font-semibold">No books found</h3>
              <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            filteredBooks.map(book => {
              const entry = entries.find(e => e.bookId === book.id || e.id === book.id);
              return (
                <article
                  key={book.id}
                  className="book-card group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => onSelectBook(book)}
                >
                  <div className="relative overflow-hidden rounded-lg bg-slate-800 aspect-[2/3] shadow-md group-hover:shadow-amber-500/20 transition-shadow">
                    <CoverImage
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLElement).style.background = book.coverColor || '#334155'; }}
                    />
                    {entry?.status === 'reading' && (
                      <span className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        {entry.progressPercent}%
                      </span>
                    )}
                    {onOpenReader && entry && (
                      <button
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur hover:bg-amber-500 hover:text-black text-white text-[11px] font-bold transition-all opacity-0 group-hover:opacity-100 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReader(entry);
                        }}
                        title={entry.hasReaderFile ? 'Open in reader' : 'Upload EPUB/PDF to read here'}
                      >
                        <BookOpen size={12} /> {entry.hasReaderFile ? 'Read' : 'Read / Upload'}
                      </button>
                    )}
                    {onEditBook && entry && (
                      <button
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-amber-500 hover:text-black text-slate-200 transition-all opacity-0 group-hover:opacity-100 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBook(entry);
                        }}
                        title="Edit Book Details"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">{book.title}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{book.author}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1.5">
                      <span className="capitalize">{book.format}</span>
                      <span>{book.pageCount} pgs</span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Shelf / Spine View (Simulated Physical Wooden Shelf Look) */}
      {viewMode === 'shelf' && (
        <section className="space-y-8 py-4">
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-white/10 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Layers size={18} /> {currentShelf?.name || 'All Books'} Shelf
              </h2>
              <span className="text-xs text-slate-400">{filteredBooks.length} titles on display</span>
            </div>

            {/* Simulated Shelf Rack */}
            <div className="bg-gradient-to-b from-slate-950 to-slate-900 p-6 rounded-xl border border-white/5 relative min-h-[220px] flex items-end gap-3 overflow-x-auto">
              {filteredBooks.map(book => (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="group cursor-pointer shrink-0 transition-transform hover:-translate-y-4 duration-200 relative"
                  style={{ width: '48px', height: `${Math.min(220, Math.max(160, (book.pageCount || 300) / 2))}px` }}
                >
                  {/* Vertical Spine */}
                  <div
                    className="w-full h-full rounded-sm shadow-xl flex flex-col justify-between p-2 border-l border-t border-white/20 relative overflow-hidden"
                    style={{ backgroundColor: book.coverColor || '#475569' }}
                  >
                    <div className="text-[9px] font-bold text-white/90 uppercase tracking-tighter truncate writing-mode-vertical rotate-180 text-center mx-auto">
                      {book.title}
                    </div>
                    <div className="text-[8px] font-mono text-white/70 text-center">
                      {book.publishedYear || 2026}
                    </div>
                  </div>
                </div>
              ))}

              {/* Wooden Shelf Baseline */}
              <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-900/80 via-amber-700/80 to-amber-900/80 rounded-b-xl border-t border-amber-500/40" />
            </div>
          </div>
        </section>
      )}

      {/* Table / List View */}
      {viewMode === 'list' && (
        <section className="panel space-y-2">
          <div className="grid grid-cols-12 text-xs font-semibold text-slate-400 pb-2 border-b border-white/10 px-3">
            <span className="col-span-5">Title & Author</span>
            <span className="col-span-2">Format</span>
            <span className="col-span-2">Pages</span>
            <span className="col-span-3 text-right">Genres</span>
          </div>

          {filteredBooks.map(book => (
            <div
              key={book.id}
              onClick={() => onSelectBook(book)}
              className="grid grid-cols-12 items-center text-xs p-3 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors border-b border-white/5"
            >
              <div className="col-span-5 flex items-center gap-3">
                    <CoverImage src={book.coverUrl} alt={book.title} width={32} height={44} className="w-8 h-11 object-cover rounded shadow bg-slate-800" />
                <div>
                  <h4 className="font-semibold text-white group-hover:text-amber-400">{book.title}</h4>
                  <p className="text-slate-400 text-[11px]">{book.author}</p>
                </div>
              </div>
              <span className="col-span-2 capitalize text-slate-300 font-mono">{book.format}</span>
              <span className="col-span-2 text-slate-300 font-mono">{book.pageCount} pgs</span>
              <div className="col-span-3 text-right flex flex-wrap gap-1 justify-end">
                {(book.genres || []).slice(0, 2).map(g => (
                  <span key={g} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}