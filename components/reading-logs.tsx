'use client';

import { useState } from 'react';
import { CalendarDays, Clock, BookOpen, Plus, Search } from 'lucide-react';
import { mockReadingSessions, mockLibraryEntries, mockBooks } from '@/lib/data';
import type { ReadingSession, LibraryEntry, Book } from '@/lib/types';

interface ReadingLogsProps {
  onLogSession?: () => void;
  sessions?: ReadingSession[];
  entries?: LibraryEntry[];
  books?: Book[];
}

export function ReadingLogsView({ 
  onLogSession,
  sessions: dbSessions,
  entries: dbEntries,
  books: dbBooks,
}: ReadingLogsProps) {
  const sessions = dbSessions || mockReadingSessions;
  const entries = dbEntries || mockLibraryEntries;
  const books = dbBooks || mockBooks;

  const [filter, setFilter] = useState<'all' | 'this-week' | 'this-month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const enrichedSessions = sessions.map(session => {
    const entry = entries.find(e => e.id === session.libraryEntryId);
    const book = entry?.book || books.find(b => b.id === entry?.bookId) || books[0] || { title: 'Book Session', author: 'Unknown', coverUrl: '', pageCount: 300 };
    const pagesRead = (session.pageEnd || session.pageStart) - session.pageStart;
    return {
      ...session,
      book,
      pagesRead: Math.max(pagesRead, 1),
    };
  });

  const filteredSessions = enrichedSessions.filter(session => {
    const matchesSearch =
      (session.book?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.notes && session.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const totalPages = enrichedSessions.reduce((acc, s) => acc + s.pagesRead, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Activity History</span>
          <h1 className="text-2xl font-bold text-white">Reading Logs</h1>
          <p className="text-xs text-slate-400">Detailed record of your reading sessions, pages logged, and time spent.</p>
        </div>

        <button className="primary" onClick={onLogSession}>
          <Plus size={16} /> Log Reading Session
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Sessions</span>
          <div className="text-2xl font-bold text-white font-mono">{sessions.length}</div>
          <p className="text-[11px] text-amber-400">Logged in database</p>
        </div>
        <div className="panel space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Time Spent</span>
          <div className="text-2xl font-bold text-white font-mono">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</div>
          <p className="text-[11px] text-amber-400">Avg {Math.round(totalMinutes / (sessions.length || 1))} min/session</p>
        </div>
        <div className="panel space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">Pages Logged</span>
          <div className="text-2xl font-bold text-white font-mono">{totalPages.toLocaleString()}</div>
          <p className="text-[11px] text-amber-400">Avg {Math.round(totalPages / (sessions.length || 1))} pages/session</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sessions or notes..."
            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'this-week', 'this-month'] as const).map(f => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                filter === f ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-400 border border-white/5'
              }`}
              onClick={() => setFilter(f)}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Timeline List */}
      <div className="space-y-3">
        {filteredSessions.length > 0 ? (
          filteredSessions.map(session => {
            const dateObj = new Date(session.startedAt);
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently';
            return (
              <div key={session.id} className="panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-3">
                  {session.book?.coverUrl ? (
                    <img src={session.book.coverUrl} alt={session.book.title} className="w-10 h-14 object-cover rounded shadow bg-slate-800" />
                  ) : (
                    <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-slate-500">
                      <BookOpen size={16} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">{session.book?.title || 'Reading Session'}</h3>
                    <p className="text-xs text-slate-400">{session.book?.author || 'Unknown Author'}</p>
                    {session.notes && (
                      <p className="text-xs text-amber-200/80 italic mt-1 font-serif">"{session.notes}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-400 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-between">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-amber-500" />
                    <span>{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <BookOpen size={14} className="text-amber-500" />
                    <span className="font-mono text-white font-semibold">+{session.pagesRead} pages</span>
                    <span>(p. {session.pageStart}-{session.pageEnd || session.pageStart})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-500" />
                    <span className="font-mono text-white font-semibold">{session.minutes || 30} mins</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-500 text-center py-8">No reading logs found.</p>
        )}
      </div>
    </div>
  );
}