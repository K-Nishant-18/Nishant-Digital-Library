'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarDays, Clock, BookOpen, Plus, Search } from 'lucide-react';
import type { ReadingSession, LibraryEntry, Book } from '@/lib/types';

interface ReadingLogsProps {
  onLogSession?: () => void;
  sessions?: ReadingSession[];
  entries?: LibraryEntry[];
  books?: Book[];
}

export function ReadingLogsView({
  onLogSession,
  sessions,
  entries,
  books,
}: ReadingLogsProps) {
  const safeSessions = sessions ?? [];
  const safeEntries = entries ?? [];
  const safeBooks = books ?? [];

  const [filter, setFilter] = useState<'all' | 'this-week' | 'this-month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const enrichedSessions = safeSessions.map(session => {
    const entry = safeEntries.find(e => e.id === session.libraryEntryId);
    const book = entry?.book || safeBooks.find(b => b.id === entry?.bookId) || { title: 'Book Session', author: 'Unknown', coverUrl: '', pageCount: 300 };
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

  const totalMinutes = safeSessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const totalPages = enrichedSessions.reduce((acc, s) => acc + s.pagesRead, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Activity History</span>
          <h1 className="text-2xl font-bold">Reading Logs</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Detailed record of your reading sessions, pages logged, and time spent.</p>
        </div>

        <button className="primary" onClick={onLogSession}>
          <Plus size={16} /> Log Reading Session
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="text-xs uppercase font-semibold" style={{ color: 'var(--muted)' }}>Total Sessions</span>
          <div className="text-3xl font-bold font-mono tracking-tight">{safeSessions.length}</div>
          <p className="text-[11px] text-amber-500">Logged in database</p>
        </div>
        <div className="stat-card">
          <span className="text-xs uppercase font-semibold" style={{ color: 'var(--muted)' }}>Total Time Spent</span>
          <div className="text-3xl font-bold font-mono tracking-tight">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</div>
          <p className="text-[11px] text-amber-500">Avg {Math.round(totalMinutes / (safeSessions.length || 1))} min/session</p>
        </div>
        <div className="stat-card">
          <span className="text-xs uppercase font-semibold" style={{ color: 'var(--muted)' }}>Pages Logged</span>
          <div className="text-3xl font-bold font-mono tracking-tight">{totalPages.toLocaleString()}</div>
          <p className="text-[11px] text-amber-500">Avg {Math.round(totalPages / (safeSessions.length || 1))} pages/session</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sessions or notes..."
            className="w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none"
            style={{ background: 'var(--faint)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'this-week', 'this-month'] as const).map(f => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-amber-500 text-black' : ''
              }`}
              style={filter !== f ? { background: 'var(--faint)', color: 'var(--muted)', border: '1px solid var(--border)' } : undefined}
              onClick={() => setFilter(f)}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Timeline List */}
      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map(session => {
            const dateObj = new Date(session.startedAt);
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently';
            return (
              <div key={session.id} className="panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-500/30 transition-colors p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  {session.book?.coverUrl ? (
                    <Image src={session.book.coverUrl} alt={session.book.title} width={40} height={56} className="w-10 h-14 object-cover rounded shadow" style={{ background: 'var(--faint)' }} />
                  ) : (
                    <div className="w-12 h-18 rounded-lg flex items-center justify-center shadow-inner" style={{ background: 'var(--faint)', color: 'var(--muted)' }}>
                      <BookOpen size={16} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold">{session.book?.title || 'Reading Session'}</h3>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{session.book?.author || 'Unknown Author'}</p>
                    {session.notes && (
                      <p className="text-xs italic mt-1.5 font-serif px-2 py-1 rounded" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-between" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-amber-500" />
                    <span>{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-amber-500" />
                    <span className="font-mono font-semibold" style={{ color: 'var(--foreground)' }}>+{session.pagesRead} pages</span>
                    <span>(p. {session.pageStart}-{session.pageEnd || session.pageStart})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span className="font-mono font-semibold" style={{ color: 'var(--foreground)' }}>{session.minutes || 30} mins</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-center py-8" style={{ color: 'var(--muted)' }}>No reading logs found.</p>
        )}
      </div>
    </div>
  );
}