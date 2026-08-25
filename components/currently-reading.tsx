'use client';

import { useState } from 'react';
import { CoverImage } from '@/components/cover-image';
import {
  BookOpen, Calendar, Clock, Bookmark, Plus, Star, Heart, Edit3,
  ChevronRight, Tag, CheckCircle2, MessageSquareQuote, FileText, Sliders
} from 'lucide-react';
import type { LibraryEntry, ReadingSession, Note, Chapter } from '@/lib/types';
import { format } from 'date-fns';

interface CurrentlyReadingProps {
  onLogSession: () => void;
  onAddNote: (entryId?: string) => void;
  onAddBook?: () => void;
  onEditBook?: (entry: LibraryEntry) => void;
  onFinishBook?: () => void;
  onOpenReader?: () => void;
  entry?: LibraryEntry;
  sessions?: ReadingSession[];
  notes?: Note[];
  chapters?: Chapter[];
}

export function CurrentlyReadingView({
  onLogSession,
  onAddNote,
  onAddBook,
  onEditBook,
  onFinishBook,
  onOpenReader,
  entry,
  sessions: dbSessions,
  notes: dbNotes,
  chapters: dbChapters,
}: CurrentlyReadingProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'notes' | 'chapters'>('overview');

  if (!entry || !entry.book) {
    return (
      <div className="panel text-center py-16 space-y-4">
        <BookOpen size={36} className="mx-auto text-slate-600" />
        <div>
          <h2 className="text-lg font-bold text-white">Nothing in progress</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Pick a book from your library or add a new one to start reading.</p>
        </div>
        {onAddBook && (
          <button className="primary mx-auto" onClick={onAddBook}>
            <Plus size={16} /> Add a Book
          </button>
        )}
      </div>
    );
  }

  const activeEntry = entry;
  const book = entry.book;

  const sessions = (dbSessions ?? []).filter(s => s.libraryEntryId === activeEntry.id);
  const chapters = dbChapters ?? [];
  const notes = (dbNotes ?? []).filter(n => n.libraryEntryId === activeEntry.id);

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const avgPages = sessions.length ? Math.round(activeEntry.currentPage / sessions.length) : 20;

  // Projection: pace from logged sessions (pages/day across distinct reading days)
  const loggedPages = sessions.reduce((acc, s) => acc + Math.max(0, (s.pageEnd ?? s.pageStart) - s.pageStart), 0);
  const distinctDays = new Set(sessions.map(s => new Date(s.startedAt).toDateString())).size;
  const pagesPerDay = distinctDays > 0 ? loggedPages / distinctDays : 0;
  const remainingPages = Math.max(0, (book?.pageCount || activeEntry.currentPage) - activeEntry.currentPage);
  const daysToFinish = pagesPerDay > 0 ? Math.ceil(remainingPages / pagesPerDay) : null;
  const projectedFinish = daysToFinish !== null ? new Date(Date.now() + daysToFinish * 86_400_000) : null;

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="panel detail-panel !p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <CoverImage
            src={book.coverUrl}
            alt={book.title}
            width={144}
            height={208}
            className="w-36 h-52 object-cover rounded-lg shadow-xl border border-[var(--border)] shrink-0"
            onError={e => { (e.target as HTMLElement).style.background = book.coverColor || '#b7791f'; }}
          />

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider">
              <span>{book.format}</span>
              {book.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span>{book.genres.slice(0, 2).join(', ')}</span>
                </>
              )}
              {book.publishedYear && (
                <>
                  <span>•</span>
                  <span>{book.publishedYear}</span>
                </>
              )}
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold">{book.title}</h1>
            {book.subtitle && <p className="text-sm text-[var(--muted)]">{book.subtitle}</p>}
            
            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
              <span className="font-semibold">{book.author}</span>
              {activeEntry.rating && (
                <div className="flex items-center gap-1 text-amber-400">
                  ★ <span className="text-xs text-[var(--muted)] font-mono">{activeEntry.rating} your rating</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-[var(--muted)] font-mono">
                <span>Page {activeEntry.currentPage} of {book.pageCount}</span>
                <span>{activeEntry.progressPercent}% complete</span>
              </div>
              <div className="progress">
                <span style={{ width: `${activeEntry.progressPercent}%` }} />
              </div>
              {activeEntry.status === 'reading' && remainingPages > 0 && (
                <p className="text-[11px] text-amber-500 font-medium pt-0.5">
                  {projectedFinish ? (
                    <>On track to finish by <span className="font-bold">{format(projectedFinish, 'MMM d')}</span></>
                  ) : (
                    <>{remainingPages} pages left</>
                  )}
                  {pagesPerDay > 0 && (
                    <span className="text-[var(--muted)]"> · ~{Math.round(pagesPerDay)} pages/day</span>
                  )}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {onOpenReader && (
                <button
                  className={activeEntry.hasReaderFile ? 'primary' : 'outline-button'}
                  onClick={onOpenReader}
                  title={activeEntry.hasReaderFile ? 'Open this book in the reader' : 'Upload an EPUB/PDF to read here'}
                >
                  <BookOpen size={16} /> {activeEntry.hasReaderFile ? 'Read Now' : 'Read (upload file)'}
                </button>
              )}
              <button className="outline-button" onClick={onLogSession}>
                <Plus size={16} /> Log Pages Read
              </button>
              <button className="outline-button" onClick={() => onAddNote(activeEntry.id)}>
                <Edit3 size={16} /> Add Note / Quote
              </button>
              {activeEntry.status === 'reading' && onFinishBook && (
                <button className="outline-button !border-emerald-500/40 !text-emerald-400 hover:!border-emerald-400" onClick={onFinishBook}>
                  <CheckCircle2 size={16} /> Mark as Finished
                </button>
              )}
              {onEditBook && activeEntry && (
                <button className="outline-button" onClick={() => onEditBook(activeEntry)}>
                  <Sliders size={16} /> Edit Book
                </button>
              )}
            </div>
          </div>

          {/* Quick stats box */}
          <div className="w-full md:w-56 panel rounded-xl p-4 space-y-3 shrink-0">
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Book Snapshot</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[var(--muted)] block">Started</span>
                <span className="font-medium">{activeEntry.dateStarted ? format(new Date(activeEntry.dateStarted), 'MMM d') : 'Recently'}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Time Spent</span>
                <span className="font-medium text-amber-500 font-mono">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Sessions</span>
                <span className="font-medium">{sessions.length} sessions</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Avg Pace</span>
                <span className="font-medium">{avgPages} pgs/sess</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-px">
        {(['overview', 'progress', 'notes', 'chapters'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${
              activeTab === tab 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'notes' ? `Notes & Quotes (${notes.length})` : tab === 'chapters' ? `Chapters (${chapters.length})` : tab}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="panel space-y-3">
              <h2 className="text-lg font-bold">About the Book</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{book.description || 'No description available for this book yet.'}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {book.genres.map(genre => (
                  <span key={genre} className="genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Recent Reading Sessions</h2>
                <button className="text-button text-xs" onClick={onLogSession}>Log session <ChevronRight size={14} /></button>
              </div>
              <div className="space-y-2">
                {sessions.length > 0 ? (
                  sessions.slice(0, 4).map(session => (
                    <div key={session.id} className="utility-row">
                      <Calendar size={16} className="text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">Pages {session.pageStart} – {session.pageEnd || session.pageStart}</div>
                        <div className="text-xs text-[var(--muted)]">{session.notes || 'Logged reading time'}</div>
                      </div>
                      <span className="text-xs font-mono text-amber-400">{session.minutes || 0} min</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--muted)] py-2">No reading sessions logged for this book yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <section className="panel space-y-4">
              <h2 className="text-lg font-bold">Author Profile</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full object-cover border border-amber-500/30 bg-slate-800 flex items-center justify-center text-lg font-bold text-amber-400">
                  {book.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{book.author}</h3>
                  <p className="text-xs text-[var(--muted)]">Author</p>
                </div>
              </div>
            </section>

            <section className="panel space-y-3">
              <h2 className="text-lg font-bold">Metadata</h2>
              <div className="text-xs space-y-2 text-[var(--muted)] font-mono">
                {book.isbn13 && <div className="flex justify-between"><span>ISBN-13</span><span className="text-[var(--foreground)]">{book.isbn13}</span></div>}
                {book.publisher && <div className="flex justify-between"><span>Publisher</span><span className="text-[var(--foreground)]">{book.publisher}</span></div>}
                <div className="flex justify-between"><span>Format</span><span className="capitalize text-[var(--foreground)]">{book.format}</span></div>
                <div className="flex justify-between"><span>Language</span><span className="uppercase text-[var(--foreground)]">{book.language || 'en'}</span></div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <section className="panel space-y-4">
          <h2 className="text-lg font-bold">Reading Progress Log</h2>
          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map(s => (
                <div key={s.id} className="p-4 rounded-lg border border-[var(--border)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-amber-500">{format(new Date(s.startedAt), 'MMM d, yyyy')}</span>
                    <span className="text-[var(--muted)]">{s.minutes || 0} minutes logged</span>
                  </div>
                  <div className="text-sm">Read pages {s.pageStart} to {s.pageEnd || s.pageStart} ({(s.pageEnd || s.pageStart) - s.pageStart} pages)</div>
                  {s.notes && <p className="text-xs text-[var(--muted)] italic">"{s.notes}"</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--muted)] py-4">No sessions logged yet.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Notes & Highlights</h2>
            <button className="primary" onClick={() => onAddNote(activeEntry.id)}><Plus size={16} /> Add Note</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.length > 0 ? (
              notes.map(note => (
                <div key={note.id} className="p-4 rounded-lg border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-500">
                    <span className="capitalize font-semibold">{note.type}</span>
                    {note.page && <span>Page {note.page}</span>}
                  </div>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">"{note.text}"</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {note.tags.map(tag => (
                      <span key={tag} className="genre-tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--muted)] col-span-2 py-4">No notes or quotes added for this book yet.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'chapters' && (
        <section className="panel space-y-4">
          <h2 className="text-lg font-bold">Chapter Breakdown</h2>
          <div className="space-y-2">
            {chapters.length > 0 ? (
              chapters.map(ch => (
                <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className={ch.completed ? 'text-amber-500' : 'text-[var(--muted)]'} />
                    <div>
                      <span className="font-semibold">Chapter {ch.number}: {ch.title}</span>
                      <span className="text-xs text-[var(--muted)] block">Pages {ch.pageStart} – {ch.pageEnd}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[var(--muted)]">{ch.completed ? '100%' : `${ch.percentComplete}%`}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--muted)] py-4">Chapter breakdown not generated yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}