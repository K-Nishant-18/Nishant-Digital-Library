'use client';

import { useState } from 'react';
import {
  BookOpen, LayoutDashboard, Grid2X2, Bookmark, CalendarDays, Flame, Tags,
  TrendingUp, Users, ChevronRight, Plus, Search, Bell, Sun, Moon, ChevronDown,
  X, Check, Star, Filter, Heart, MessageSquare, User, Settings, Award, LogOut, Download, Sliders, Menu
} from 'lucide-react';
import { CurrentlyReadingView } from '@/components/currently-reading';
import { AnalyticsView } from '@/components/analytics-view';
import { NotesJournalView } from '@/components/notes-journal';
import { VirtualLibraryView } from '@/components/virtual-library';
import { ReadingLogsView } from '@/components/reading-logs';
import { ProfileView } from '@/components/profile-view';
import { BookEditModal } from '@/components/book-edit-modal';
import type { Book, LibraryEntry, ReadingSession, Note, Shelf, ReadingGoal, ReadingStats } from '@/lib/types';
import { searchExternalBooks } from '@/lib/api';
import { addBookToLibraryAction, logReadingSessionAction, addNoteAction } from '@/lib/actions';
import { mockStats, mockBooks } from '@/lib/data';

const nav = [
  ['Dashboard', LayoutDashboard],
  ['Currently Reading', BookOpen],
  ['Virtual Library', Grid2X2],
  ['TBR Queue', Bookmark],
  ['Reading Logs', CalendarDays],
] as const;

const analytics = [
  ['Overview', TrendingUp],
  ['Year in Books', BookOpen],
  ['Genres', Tags],
  ['Pace & Streaks', Flame],
] as const;

const journal = ['Notes & Quotes', 'Reflections', 'Chapter Logs'];

interface LibraryDashboardProps {
  data?: {
    success: boolean;
    userProfile?: any;
    goal?: ReadingGoal;
    shelves?: Shelf[];
    entries?: LibraryEntry[];
    books?: Book[];
    sessions?: ReadingSession[];
    notes?: Note[];
    stats?: ReadingStats;
  };
}

export default function LibraryDashboard({ data }: LibraryDashboardProps) {
  const [active, setActive] = useState('Dashboard');
  const [dark, setDark] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [modal, setModal] = useState<'add' | 'session' | 'note' | 'edit' | null>(null);
  const [editingEntry, setEditingEntry] = useState<LibraryEntry | null>(null);

  // Add book modal state
  const [apiSearch, setApiSearch] = useState('');
  const [apiResults, setApiResults] = useState<Book[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);

  // Quick Session modal state
  const [selectedEntryForSession, setSelectedEntryForSession] = useState<string>('');
  const [sessionPages, setSessionPages] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('30');

  // Add note modal state
  const [selectedEntryForNote, setSelectedEntryForNote] = useState<string>('');
  const [noteText, setNoteText] = useState('');
  const [notePage, setNotePage] = useState('');
  const [noteType, setNoteType] = useState('quote');

  // Selected book for currently reading detailed view
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Real DB Data bindings with fallback
  const userProfile = data?.userProfile || { name: 'Kumar Nishant', currentStreak: 42, level: 15 };
  const stats = data?.stats || mockStats;
  const books = data?.books?.length ? data.books : mockBooks;
  const entries = data?.entries || [];
  const sessions = data?.sessions || [];
  const notes = data?.notes || [];
  const shelves = data?.shelves || [];
  const goal: ReadingGoal = data?.goal || { id: 'goal-default', year: 2026, targetBooks: 60, targetPages: 18000, createdAt: new Date(), updatedAt: new Date() };

  const readingEntries = entries.filter(e => e.status === 'reading');
  const tbrEntries = entries.filter(e => e.status === 'tbr');
  const activeCurrentlyReadingEntry = readingEntries[0] || entries[0];

  const handleApiSearch = async () => {
    if (!apiSearch.trim()) return;
    setLoadingApi(true);
    const results = await searchExternalBooks(apiSearch);
    setApiResults(results);
    setLoadingApi(false);
  };

  const handleAddBookToDb = async (book: Book, status: 'tbr' | 'reading' | 'read' = 'reading') => {
    const res = await addBookToLibraryAction(book, status);
    if (res.success) {
      alert(`✨ "${book.title}" saved to your Neon PostgreSQL Library!`);
      setModal(null);
    } else {
      alert(`Error saving book: ${res.error}`);
    }
  };

  const handleSaveSessionToDb = async () => {
    const entryId = selectedEntryForSession || activeCurrentlyReadingEntry?.id;
    if (!entryId || !sessionPages) {
      alert('Please select a book and enter the new current page number.');
      return;
    }
    const res = await logReadingSessionAction({
      libraryEntryId: entryId,
      currentPage: parseInt(sessionPages),
      minutes: parseInt(sessionMinutes) || 30,
      notes: 'Logged via Command Center',
    });
    if (res.success) {
      alert('🔥 Reading session & streak logged to Neon PostgreSQL Database!');
      setSessionPages('');
      setModal(null);
    } else {
      alert(`Error saving session: ${res.error}`);
    }
  };

  const handleSaveNoteToDb = async () => {
    const entryId = selectedEntryForNote || activeCurrentlyReadingEntry?.id;
    if (!entryId || !noteText.trim()) {
      alert('Please select a book and enter note content.');
      return;
    }
    const res = await addNoteAction({
      libraryEntryId: entryId,
      type: noteType as any,
      text: noteText,
      page: notePage ? parseInt(notePage) : undefined,
    });
    if (res.success) {
      alert('✍️ Note & quote saved to your Neon PostgreSQL Database!');
      setNoteText('');
      setNotePage('');
      setModal(null);
    } else {
      alert(`Error saving note: ${res.error}`);
    }
  };

  return (
    <div className={`app-shell ${dark ? '' : 'light-mode'}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand cursor-pointer" onClick={() => setActive('Dashboard')}>
          <div className="brand-mark">
            <BookOpen size={19} />
          </div>
          <span>My Library</span>
        </div>

        {/* Command Center */}
        <div className="nav-group">
          <div className="nav-label">Command Center</div>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${active === name ? 'active' : ''}`}
              onClick={() => setActive(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {name === 'TBR Queue' && <span className="nav-count">{tbrEntries.length}</span>}
            </button>
          ))}
        </div>

        {/* Analytics */}
        <div className="nav-group">
          <div className="nav-label">Analytics</div>
          {analytics.map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${active === name ? 'active' : ''}`}
              onClick={() => setActive(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Journal */}
        <div className="nav-group">
          <div className="nav-label">Journal</div>
          {journal.map(name => (
            <button
              key={name}
              className={`nav-item ${active === name ? 'active' : ''}`}
              onClick={() => setActive(name)}
            >
              <Bookmark size={17} />
              <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Streak Card Widget */}
        <div className="streak-widget">
          <div className="streak-top">
            <Flame size={19} />
            <span>Keep going, Reader!</span>
          </div>
          <strong>{stats.currentStreak} day streak</strong>
          <button onClick={() => setActive('Pace & Streaks')}>
            View streaks <ChevronRight size={13} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold border border-amber-500/30 transition-all shrink-0 mr-2"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Command Center Menu"
          >
            <Menu size={18} />
          </button>

          <button className="search-trigger" onClick={() => setSearchOpen(true)}>
            <Search size={17} />
            <span>Search your library or Open Library...</span>
            <kbd>⌘ K</kbd>
          </button>

          <div className="top-actions">
            <button
              className="icon-button theme-toggle-btn"
              aria-label="Toggle theme"
              onClick={() => setDark(!dark)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', background: dark ? '#1e2022' : '#e2e8f0', color: dark ? '#fbbf24' : '#0f172a', border: '1px solid var(--border)' }}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              <span style={{ fontSize: '11px', fontWeight: 600 }}>{dark ? 'Light' : 'Dark'}</span>
            </button>

            <button className="icon-button notification" aria-label="Notifications">
              <Bell size={17} />
              <b />
            </button>

            {/* Profile Button with Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors border border-white/5"
              >
                <div className="avatar">{userProfile.name.charAt(0)}</div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">{userProfile.name}</span>
                  <span className="text-[10px] text-amber-400 font-medium">Level {userProfile.level || 15} Reader</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Detail Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 space-y-4 z-50">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="avatar w-11 h-11 text-base">{userProfile.name.charAt(0)}</div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{userProfile.name}</h3>
                      <p className="text-xs text-slate-400">{userProfile.email || 'kumar.nishant@devreader.com'}</p>
                      <span className="inline-block mt-1 text-[10px] bg-amber-500/20 text-amber-400 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                        🏆 Level {userProfile.level || 15} Reader
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Books</span>
                      <strong className="text-sm text-white font-mono">{stats.booksThisYear}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Streak</span>
                      <strong className="text-sm text-amber-400 font-mono">{stats.currentStreak}d 🔥</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Goal</span>
                      <strong className="text-sm text-white font-mono">
                        {Math.round(((stats.booksThisYear || 0) / (goal.targetBooks || 1)) * 100)}%
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => { setActive('Reader Profile'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <User size={15} className="text-amber-500" />
                      <span>Reading Profile & Achievements</span>
                    </button>
                    <button
                      onClick={() => { setActive('Pace & Streaks'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Award size={15} className="text-amber-500" />
                      <span>Reading Goals & Badges</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Views Viewport */}
        <div className="content-wrap">
          {active === 'Dashboard' && (
            <DashboardView
              setActive={setActive}
              onAddBook={() => setModal('add')}
              onLogSession={() => setModal('session')}
              onAddNote={() => setModal('note')}
              onEditBook={(entry) => {
                setEditingEntry(entry);
                setModal('edit');
              }}
              stats={stats}
              books={books}
              entries={entries}
              sessions={sessions}
              notes={notes}
              goal={goal}
              setSelectedBook={setSelectedBook}
            />
          )}

          {active === 'Currently Reading' && (
            <CurrentlyReadingView
              onLogSession={() => setModal('session')}
              onAddNote={() => setModal('note')}
              onEditBook={(entry) => {
                setEditingEntry(entry);
                setModal('edit');
              }}
              entry={selectedBook ? entries.find(e => e.bookId === selectedBook.id) : activeCurrentlyReadingEntry}
              sessions={sessions}
              notes={notes}
              chapters={[]}
            />
          )}

          {active === 'Virtual Library' && (
            <VirtualLibraryView
              initialStatus="all"
              onSelectBook={(book) => {
                const entry = entries.find(e => e.bookId === book.id);
                setSelectedBook(book);
                setActive('Currently Reading');
              }}
              onEditBook={(entry) => {
                setEditingEntry(entry);
                setModal('edit');
              }}
              onAddBook={() => setModal('add')}
              books={books}
              entries={entries}
              shelves={shelves}
            />
          )}

          {active === 'TBR Queue' && (
            <VirtualLibraryView
              initialStatus="tbr"
              onSelectBook={(book) => {
                const entry = entries.find(e => e.bookId === book.id);
                setSelectedBook(book);
                setActive('Currently Reading');
              }}
              onEditBook={(entry) => {
                setEditingEntry(entry);
                setModal('edit');
              }}
              onAddBook={() => setModal('add')}
              books={books}
              entries={entries}
              shelves={shelves}
            />
          )}

          {active === 'Reading Logs' && (
            <ReadingLogsView
              onLogSession={() => setModal('session')}
              sessions={sessions}
              entries={entries}
              books={books}
            />
          )}

          {analytics.some(([name]) => name === active) && (
            <AnalyticsView
              activeTab={active}
              onTabChange={(tab) => setActive(tab)}
              stats={stats}
              goal={goal}
            />
          )}

          {journal.includes(active) && (
            <NotesJournalView
              activeTab={active}
              onAddNote={() => setModal('note')}
              notes={notes}
              books={books}
            />
          )}

          {active === 'Reader Profile' && (
            <ProfileView userProfile={userProfile} stats={stats} />
          )}
        </div>
      </main>

      {/* Global Quick Search Overlay */}
      {searchOpen && (
        <div className="search-overlay" role="dialog">
          <div className="search-modal space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400">
                <Search size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">Quick Search</span>
              </div>
              <button className="close" onClick={() => setSearchOpen(false)}><X size={18} /></button>
            </div>

            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search books, authors, notes..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
            />

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {books
                .filter(b => `${b.title} ${b.author}`.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(book => (
                  <button
                    key={book.id}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-left transition-colors"
                    onClick={() => { setSearchOpen(false); setSelectedBook(book); setActive('Currently Reading'); }}
                  >
                    <img src={book.coverUrl} alt={book.title} className="w-8 h-11 object-cover rounded bg-slate-800" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">{book.title}</h4>
                      <p className="text-[11px] text-slate-400">{book.author}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal with API Lookup */}
      {modal === 'add' && (
        <div className="search-overlay" role="dialog">
          <div className="search-modal space-y-5 max-w-xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={20} className="text-amber-500" /> Add a Book to Library
              </h2>
              <button className="close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={apiSearch}
                  onChange={e => setApiSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApiSearch()}
                  placeholder="Search Google Books by title, author, or ISBN..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <button className="primary text-xs !py-2.5 !px-4 shrink-0" onClick={handleApiSearch} disabled={loadingApi}>
                {loadingApi ? 'Searching...' : 'Search Online'}
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pt-1">
              {apiResults.length > 0 ? (
                apiResults.map(book => (
                  <div key={book.id} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-white/5 text-xs hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={book.coverUrl} alt={book.title} className="w-10 h-14 object-cover rounded shadow bg-slate-800 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white truncate">{book.title}</h4>
                        <p className="text-slate-400 truncate">{book.author} ({book.publishedYear || 'N/A'})</p>
                        <span className="text-[10px] text-amber-500/80 font-mono mt-0.5 block">{book.pageCount} pages</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <button className="outline-button text-xs !py-1.5 !px-2.5" onClick={() => handleAddBookToDb(book, 'tbr')}>
                        TBR Queue
                      </button>
                      <button className="primary text-xs !py-1.5 !px-3" onClick={() => handleAddBookToDb(book, 'reading')}>
                        <Plus size={14} /> Reading
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 space-y-1">
                  <Search size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-medium text-slate-300">Search millions of titles online</p>
                  <p className="text-[11px] text-slate-500">Type a book name, author, or ISBN above to discover and save to your Neon DB library.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Reading Session Modal */}
      {modal === 'session' && (
        <div className="search-overlay" role="dialog">
          <div className="search-modal space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays size={20} className="text-amber-500" /> Log Reading Session
              </h2>
              <button className="close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Select Book</label>
                <select
                  value={selectedEntryForSession || activeCurrentlyReadingEntry?.id}
                  onChange={e => setSelectedEntryForSession(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-amber-500/50"
                >
                  {entries.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.book?.title} ({e.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">New Current Page</label>
                  <input
                    type="number"
                    value={sessionPages}
                    onChange={e => setSessionPages(e.target.value)}
                    placeholder="e.g. 235"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Time Spent (Minutes)</label>
                  <input
                    type="number"
                    value={sessionMinutes}
                    onChange={e => setSessionMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <button className="primary full !py-2.5 text-xs font-bold mt-2" onClick={handleSaveSessionToDb}>
                <Flame size={16} /> Save Progress to Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {modal === 'note' && (
        <div className="search-overlay" role="dialog">
          <div className="search-modal space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bookmark size={20} className="text-amber-500" /> Add Note / Quote
              </h2>
              <button className="close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Select Book</label>
                <select
                  value={selectedEntryForNote || activeCurrentlyReadingEntry?.id}
                  onChange={e => setSelectedEntryForNote(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-amber-500/50"
                >
                  {entries.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.book?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Type</label>
                <div className="flex gap-2">
                  {['quote', 'reflection', 'note'].map(type => (
                    <button
                      key={type}
                      className={`flex-1 py-2 rounded-xl capitalize text-xs font-bold transition-all ${
                        noteType === type ? 'bg-amber-500 text-black shadow-md' : 'bg-slate-900 text-slate-400 border border-white/5'
                      }`}
                      onClick={() => setNoteType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Content / Line</label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Enter memorable quote, insight, or chapter reflection..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Page Number (Optional)</label>
                <input
                  type="number"
                  value={notePage}
                  onChange={e => setNotePage(e.target.value)}
                  placeholder="e.g. 142"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500/50"
                />
              </div>

              <button className="primary full !py-2.5 text-xs font-bold mt-2" onClick={handleSaveNoteToDb}>
                <Check size={16} /> Save Note to Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {modal === 'edit' && editingEntry && (
        <BookEditModal
          entry={editingEntry}
          onClose={() => { setModal(null); setEditingEntry(null); }}
          onSave={() => { setModal(null); setEditingEntry(null); }}
        />
      )}
    </div>
  );
}

{/* Dashboard Sub-Component */}
function DashboardView({
  setActive,
  onAddBook,
  onLogSession,
  onAddNote,
  onEditBook,
  stats,
  books,
  entries,
  sessions,
  notes,
  goal,
  setSelectedBook,
}: {
  setActive: (val: string) => void;
  onAddBook: () => void;
  onLogSession: () => void;
  onAddNote: () => void;
  onEditBook?: (entry: LibraryEntry) => void;
  stats: ReadingStats;
  books: Book[];
  entries: LibraryEntry[];
  sessions: ReadingSession[];
  notes: Note[];
  goal: ReadingGoal;
  setSelectedBook: (book: Book) => void;
}) {
  const currentReadingEntry = entries.find(e => e.status === 'reading') || entries[0];
  const currentReadingBook = currentReadingEntry?.book || books[0];
  const tbrEntries = entries.filter(e => e.status === 'tbr');

  return (
    <div className="space-y-5 text-slate-200 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Good day, Reader.</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Your personal command center synced live to PostgreSQL database.</p>
        </div>
        <div className="text-xs text-amber-400 font-mono font-medium bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          ⚡ Neon DB Connected
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Flame size={14} className="text-amber-500" />
            <span>Reading Streak</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{stats.currentStreak} <span className="text-xs font-normal text-slate-400">days</span></div>
              <p className="text-[11px] text-slate-400 mt-0.5">Longest: {stats.longestStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <BookOpen size={14} className="text-amber-500" />
            <span>Books This Year</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.booksThisYear} <span className="text-xs font-normal text-slate-400">books</span></div>
            <p className="text-[11px] text-slate-400 mt-0.5">Goal: {goal.targetBooks} books</p>
            <div className="h-1 w-full bg-slate-800 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((stats.booksThisYear || 0) / (goal.targetBooks || 1)) * 100))}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Bookmark size={14} className="text-amber-500" />
            <span>Pages This Year</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.pagesThisYear.toLocaleString()} <span className="text-xs font-normal text-slate-400">pages</span></div>
            <p className="text-[11px] text-slate-400 mt-0.5">Avg {stats.averagePagesPerDay} pages / day</p>
          </div>
        </div>

        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Star size={14} className="text-amber-500" />
            <span>Average Rating</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.averageRating || '4.5'}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
              <div className="flex text-amber-500 gap-0.5">
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* UP NEXT IN YOUR TBR */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Up Next in Your TBR Queue</span>
              <button className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium" onClick={() => setActive('TBR Queue')}>
                View all ({tbrEntries.length}) <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
              {(tbrEntries.length > 0 ? tbrEntries : entries).slice(0, 6).map((entry, idx) => {
                const b = entry.book || books[idx] || books[0];
                return (
                  <div key={entry.id || idx} className="group cursor-pointer space-y-1.5" onClick={() => {
                    setSelectedBook(b);
                    setActive('Currently Reading');
                  }}>
                    <div className="aspect-[2/3] rounded overflow-hidden bg-slate-800 shadow-md group-hover:scale-105 transition-transform duration-200">
                      <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white truncate leading-snug">{b.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{b.author}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Reading Activity */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Recent Database Activity Log</span>
              <button className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium" onClick={() => setActive('Reading Logs')}>
                View all logs <ChevronRight size={13} />
              </button>
            </div>

            <div className="space-y-4">
              {sessions.length > 0 ? (
                sessions.slice(0, 3).map(s => {
                  const entry = entries.find(e => e.id === s.libraryEntryId);
                  const b = entry?.book || books[0];
                  return (
                    <div key={s.id} className="flex gap-3 items-start">
                      <div className="w-12 h-16 rounded bg-slate-800 overflow-hidden shrink-0 shadow-md border border-white/5">
                        <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-semibold text-white">{b.title}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(s.startedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Session: {s.minutes || 30} mins (p. {s.pageStart}-{s.pageEnd})</p>
                        {s.notes && (
                          <div className="mt-2 p-2 bg-slate-900/50 rounded border border-white/5 text-xs">
                            <p className="text-slate-300">"{s.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-4">No recent reading sessions logged in database yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Currently Reading Card + Quick Actions */}
        <div className="space-y-4">
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-bold tracking-wider text-slate-400 uppercase">Currently Reading</span>
              <button
                className="text-slate-500 hover:text-amber-400 transition-colors p-1 rounded hover:bg-white/5"
                onClick={() => currentReadingEntry && onEditBook?.(currentReadingEntry)}
                title="Edit Book Details"
              >
                <Sliders size={16} />
              </button>
            </div>

            {currentReadingBook && (
              <div className="flex gap-4 items-start pt-1">
                <div className="w-32 aspect-[2/3] rounded bg-slate-800 overflow-hidden shrink-0 shadow-lg border border-white/5">
                  <img src={currentReadingBook.coverUrl} alt={currentReadingBook.title} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{currentReadingBook.title}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{currentReadingBook.author}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${currentReadingEntry?.progressPercent || 0}%` }} />
                    </div>
                    <div className="text-right text-[12px] text-amber-400 font-semibold">{currentReadingEntry?.progressPercent || 0}%</div>
                  </div>

                  <button
                    className="w-full bg-[#232628] hover:bg-[#2c3033] text-white text-sm font-semibold py-2 rounded transition-colors"
                    onClick={() => setActive('Currently Reading')}
                  >
                    Continue Reading
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Latest Note / Quote</span>
                <button className="text-xs text-amber-500 hover:text-amber-400 font-medium" onClick={onAddNote}>
                  Add note +
                </button>
              </div>

              {notes.length > 0 ? (
                <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5 text-xs">
                  <p className="text-slate-300">"{notes[0].text}"</p>
                  <p className="text-[10px] text-amber-400 mt-2">— Page {notes[0].page || 'N/A'}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No notes written yet.</p>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-3 space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">Quick Actions</span>
            <div className="space-y-0.5 pt-0.5">
              <button className="w-full flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-xs text-slate-300 transition-colors" onClick={onAddBook}>
                <span>Add a New Book</span>
                <Plus size={14} className="text-slate-400" />
              </button>
              <button className="w-full flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-xs text-slate-300 transition-colors" onClick={onLogSession}>
                <span>Log a Reading Session</span>
                <CalendarDays size={14} className="text-slate-400" />
              </button>
              <button className="w-full flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-xs text-slate-300 transition-colors" onClick={onAddNote}>
                <span>Write Note / Quote</span>
                <Bookmark size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
