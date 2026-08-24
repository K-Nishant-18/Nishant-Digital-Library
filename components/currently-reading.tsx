'use client';

import { useState } from 'react';
import { 
  BookOpen, Calendar, Clock, Bookmark, Plus, Star, Heart, Edit3, 
  ChevronRight, Tag, CheckCircle2, MessageSquareQuote, FileText, Sliders
} from 'lucide-react';
import type { LibraryEntry, ReadingSession, Note, Chapter } from '@/lib/types';
import { mockLibraryEntries, mockReadingSessions, mockChapters, mockNotes, mockAuthors } from '@/lib/data';
import { format } from 'date-fns';

interface CurrentlyReadingProps {
  onLogSession: () => void;
  onAddNote: () => void;
  onEditBook?: (entry: LibraryEntry) => void;
  entry?: LibraryEntry;
  sessions?: ReadingSession[];
  notes?: Note[];
  chapters?: Chapter[];
}

export function CurrentlyReadingView({ 
  onLogSession, 
  onAddNote,
  onEditBook,
  entry,
  sessions: dbSessions,
  notes: dbNotes,
  chapters: dbChapters,
}: CurrentlyReadingProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'notes' | 'chapters'>('overview');
  
  const activeEntry: LibraryEntry = entry || mockLibraryEntries[0];
  const book = activeEntry.book || mockLibraryEntries[0].book!;
  
  const sessions = dbSessions || mockReadingSessions.filter(s => s.libraryEntryId === activeEntry.id);
  const chapters = dbChapters || mockChapters.filter(c => c.bookId === book.id);
  const notes = dbNotes || mockNotes.filter(n => n.libraryEntryId === activeEntry.id);
  const author = mockAuthors.find(a => a.name === book.author) || mockAuthors[0];

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const avgPages = sessions.length ? Math.round(activeEntry.currentPage / sessions.length) : 20;

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="panel detail-panel !p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <img 
            src={book.coverUrl} 
            alt={book.title} 
            className="w-36 h-52 object-cover rounded-lg shadow-xl border border-white/10 shrink-0 bg-slate-800" 
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
            
            <h1 className="text-2xl md:text-3xl font-bold text-white">{book.title}</h1>
            {book.subtitle && <p className="text-sm text-slate-400">{book.subtitle}</p>}
            
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <span className="font-semibold text-white">{book.author}</span>
              <div className="flex items-center gap-1 text-amber-400">
                ★ <span className="text-xs text-slate-400 font-mono">{activeEntry.rating || 4.5} reader rating</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Page {activeEntry.currentPage} of {book.pageCount}</span>
                <span>{activeEntry.progressPercent}% complete</span>
              </div>
              <div className="progress">
                <span style={{ width: `${activeEntry.progressPercent}%` }} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button className="primary" onClick={onLogSession}>
                <Plus size={16} /> Log Pages Read
              </button>
              <button className="outline-button" onClick={onAddNote}>
                <Edit3 size={16} /> Add Note / Quote
              </button>
              {onEditBook && activeEntry && (
                <button className="outline-button" onClick={() => onEditBook(activeEntry)}>
                  <Sliders size={16} /> Edit Book
                </button>
              )}
            </div>
          </div>

          {/* Quick stats box */}
          <div className="w-full md:w-56 bg-slate-900/60 rounded-xl p-4 border border-white/5 space-y-3 shrink-0">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Book Snapshot</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Started</span>
                <span className="font-medium text-slate-200">{activeEntry.dateStarted ? format(new Date(activeEntry.dateStarted), 'MMM d') : 'Recently'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Time Spent</span>
                <span className="font-medium text-amber-400 font-mono">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sessions</span>
                <span className="font-medium text-slate-200">{sessions.length} sessions</span>
              </div>
              <div>
                <span className="text-slate-500 block">Avg Pace</span>
                <span className="font-medium text-slate-200">{avgPages} pgs/sess</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {(['overview', 'progress', 'notes', 'chapters'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${
              activeTab === tab 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
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
              <h2 className="text-lg font-bold text-white">About the Book</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{book.description || 'No description available for this book yet.'}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {book.genres.map(genre => (
                  <span key={genre} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/5">
                    {genre}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Recent Reading Sessions</h2>
                <button className="text-button text-xs" onClick={onLogSession}>Log session <ChevronRight size={14} /></button>
              </div>
              <div className="space-y-2">
                {sessions.length > 0 ? (
                  sessions.slice(0, 4).map(session => (
                    <div key={session.id} className="utility-row">
                      <Calendar size={16} className="text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-200">Pages {session.pageStart} – {session.pageEnd || session.pageStart}</div>
                        <div className="text-xs text-slate-400">{session.notes || 'Logged reading time'}</div>
                      </div>
                      <span className="text-xs font-mono text-amber-400">{session.minutes || 0} min</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2">No reading sessions logged for this book yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <section className="panel space-y-4">
              <h2 className="text-lg font-bold text-white">Author Profile</h2>
              <div className="flex items-center gap-3">
                <img src={author.avatarUrl} alt={author.name} className="w-12 h-12 rounded-full object-cover border border-amber-500/30" />
                <div>
                  <h3 className="font-semibold text-white">{book.author}</h3>
                  <p className="text-xs text-slate-400">Author</p>
                </div>
              </div>
              <p className="text-xs text-slate-300">{author.bio}</p>
            </section>

            <section className="panel space-y-3">
              <h2 className="text-lg font-bold text-white">Metadata</h2>
              <div className="text-xs space-y-2 text-slate-300 font-mono">
                {book.isbn13 && <div className="flex justify-between"><span className="text-slate-500">ISBN-13</span><span>{book.isbn13}</span></div>}
                {book.publisher && <div className="flex justify-between"><span className="text-slate-500">Publisher</span><span>{book.publisher}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Format</span><span className="capitalize">{book.format}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Language</span><span className="uppercase">{book.language || 'en'}</span></div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <section className="panel space-y-4">
          <h2 className="text-lg font-bold text-white">Reading Progress Log</h2>
          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map(s => (
                <div key={s.id} className="p-4 bg-slate-900/40 rounded-lg border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-amber-500">{format(new Date(s.startedAt), 'MMM d, yyyy')}</span>
                    <span className="text-slate-400">{s.minutes || 0} minutes logged</span>
                  </div>
                  <div className="text-sm text-slate-200">Read pages {s.pageStart} to {s.pageEnd || s.pageStart} ({(s.pageEnd || s.pageStart) - s.pageStart} pages)</div>
                  {s.notes && <p className="text-xs text-slate-400 italic">“{s.notes}”</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4">No sessions logged yet.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Notes & Highlights</h2>
            <button className="primary" onClick={onAddNote}><Plus size={16} /> Add Note</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.length > 0 ? (
              notes.map(note => (
                <div key={note.id} className="p-4 bg-slate-900/40 rounded-lg border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-500">
                    <span className="capitalize font-semibold">{note.type}</span>
                    {note.page && <span>Page {note.page}</span>}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">“{note.text}”</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {note.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">#{tag}</span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 col-span-2 py-4">No notes or quotes added for this book yet.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'chapters' && (
        <section className="panel space-y-4">
          <h2 className="text-lg font-bold text-white">Chapter Breakdown</h2>
          <div className="space-y-2">
            {chapters.length > 0 ? (
              chapters.map(ch => (
                <div key={ch.id} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-white/5 text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className={ch.completed ? 'text-amber-500' : 'text-slate-600'} />
                    <div>
                      <span className="font-semibold text-white">Chapter {ch.number}: {ch.title}</span>
                      <span className="text-xs text-slate-400 block">Pages {ch.pageStart} – {ch.pageEnd}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{ch.completed ? '100%' : `${ch.percentComplete}%`}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4">Chapter breakdown not generated yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}