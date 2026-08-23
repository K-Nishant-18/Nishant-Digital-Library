'use client';

import { useState } from 'react';
import {
  BookOpen, LayoutDashboard, Grid2X2, Bookmark, CalendarDays, Flame, Tags,
  TrendingUp, Users, ChevronRight, Plus, Search, Bell, Sun, Moon, ChevronDown,
  X, Check, Star, Filter, Heart, MessageSquare, User, Settings, Award, LogOut, Download, Sliders
} from 'lucide-react';
import { CurrentlyReadingView } from '@/components/currently-reading';
import { AnalyticsView } from '@/components/analytics-view';
import { NotesJournalView } from '@/components/notes-journal';
import { VirtualLibraryView } from '@/components/virtual-library';
import { ReadingLogsView } from '@/components/reading-logs';
import { ProfileView } from '@/components/profile-view';
import { mockBooks, mockLibraryEntries, mockStats } from '@/lib/data';
import type { Book } from '@/lib/types';
import { searchExternalBooks } from '@/lib/api';

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
const manage = ['Collections', 'Authors', 'Import / Export'];

export default function LibraryDashboard() {
  const [active, setActive] = useState('Dashboard');
  const [dark, setDark] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  // Modals state
  const [modal, setModal] = useState<'add' | 'session' | 'note' | null>(null);

  // Add book modal state
  const [apiSearch, setApiSearch] = useState('');
  const [apiResults, setApiResults] = useState<Book[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);

  // Quick Session modal state
  const [sessionPages, setSessionPages] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('30');

  // Add note modal state
  const [noteText, setNoteText] = useState('');
  const [notePage, setNotePage] = useState('');
  const [noteType, setNoteType] = useState('quote');

  const handleApiSearch = async () => {
    if (!apiSearch.trim()) return;
    setLoadingApi(true);
    const results = await searchExternalBooks(apiSearch);
    setApiResults(results);
    setLoadingApi(false);
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
              {name === 'TBR Queue' && <span className="nav-count">12</span>}
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
          <strong>{mockStats.currentStreak} day streak</strong>
          <div className="week">
            <i /><i /><i /><i /><i /><i className="off" /><i className="off" />
          </div>
          <button onClick={() => setActive('Pace & Streaks')}>
            View streaks <ChevronRight size={13} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Topbar */}
        <header className="topbar">
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
                <div className="avatar">R</div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">Kumar Nishant</span>
                  <span className="text-[10px] text-amber-400 font-medium">Level 15 Master Reader</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Detail Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 space-y-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="avatar w-11 h-11 text-base">R</div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Kumar Nishant</h3>
                      <p className="text-xs text-slate-400">kumar.nishant@devreader.com</p>
                      <span className="inline-block mt-1 text-[10px] bg-amber-500/20 text-amber-400 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                        🏆 Level 15 Master Reader
                      </span>
                    </div>
                  </div>

                  {/* Reading Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Books</span>
                      <strong className="text-sm text-white font-mono">{mockStats.booksThisYear}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Streak</span>
                      <strong className="text-sm text-amber-400 font-mono">{mockStats.currentStreak}d 🔥</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Goal</span>
                      <strong className="text-sm text-white font-mono">72%</strong>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => { setActive('Overview'); setProfileOpen(false); }}
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
                    <button
                      onClick={() => { alert('Exporting library backup data...'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Download size={15} className="text-amber-500" />
                      <span>Export Library Backup (JSON/CSV)</span>
                    </button>
                    <button
                      onClick={() => { alert('Settings window opening...'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <Settings size={15} className="text-amber-500" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  {/* Footer / Sign Out */}
                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => { alert('Signed out of My Library.'); setProfileOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                    >
                      <LogOut size={14} /> Sign Out
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
            />
          )}

          {active === 'Currently Reading' && (
            <CurrentlyReadingView
              onLogSession={() => setModal('session')}
              onAddNote={() => setModal('note')}
            />
          )}

          {active === 'Virtual Library' && (
            <VirtualLibraryView
              initialStatus="all"
              onSelectBook={(book) => setActive('Currently Reading')}
              onAddBook={() => setModal('add')}
            />
          )}

          {active === 'TBR Queue' && (
            <VirtualLibraryView
              initialStatus="tbr"
              onSelectBook={(book) => setActive('Currently Reading')}
              onAddBook={() => setModal('add')}
            />
          )}

          {active === 'Reading Logs' && (
            <ReadingLogsView onLogSession={() => setModal('session')} />
          )}

          {analytics.some(([name]) => name === active) && (
            <AnalyticsView
              activeTab={active}
              onTabChange={(tab) => setActive(tab)}
            />
          )}

          {journal.includes(active) && (
            <NotesJournalView
              activeTab={active}
              onAddNote={() => setModal('note')}
            />
          )}

          {active === 'Reader Profile' && (
            <ProfileView />
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
              placeholder="Search books, authors, notes, genres..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
            />

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {mockBooks
                .filter(b => `${b.title} ${b.author}`.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(book => (
                  <button
                    key={book.id}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-left transition-colors"
                    onClick={() => { setSearchOpen(false); setActive('Currently Reading'); }}
                  >
                    <img src={book.coverUrl} alt={book.title} className="w-8 h-11 object-cover rounded" />
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
          <div className="search-modal space-y-4 max-w-xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white">Add a Book to Library</h2>
              <button className="close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="flex gap-2">
              <input
                value={apiSearch}
                onChange={e => setApiSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApiSearch()}
                placeholder="Search Open Library by title, ISBN, or author..."
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
              <button className="primary text-xs" onClick={handleApiSearch} disabled={loadingApi}>
                {loadingApi ? 'Searching...' : 'Search Online'}
              </button>
            </div>

            {/* Results list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pt-2">
              {apiResults.length > 0 ? (
                apiResults.map(book => (
                  <div key={book.id} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-white/5 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={book.coverUrl} alt={book.title} className="w-9 h-12 object-cover rounded" />
                      <div>
                        <h4 className="font-semibold text-white">{book.title}</h4>
                        <p className="text-slate-400">{book.author} ({book.publishedYear})</p>
                      </div>
                    </div>
                    <button
                      className="primary text-xs !py-1 !px-2.5"
                      onClick={() => { alert(`Added "${book.title}" to your library!`); setModal(null); }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Search millions of books online or enter title manually below.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Reading Session Modal */}
      {modal === 'session' && (
        <div className="search-overlay" role="dialog">
          <div className="search-modal space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white">Log Reading Session</h2>
              <button className="close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Book</label>
                <div className="font-semibold text-white bg-slate-950 p-2.5 rounded-lg border border-white/10">
                  Atomic Habits by James Clear
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">New Current Page</label>
                  <input
                    type="number"
                    value={sessionPages}
                    onChange={e => setSessionPages(e.target.value)}
                    placeholder="e.g. 235"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Time Spent (Minutes)</label>
                  <input
                    type="number"
                    value={sessionMinutes}
                    onChange={e => setSessionMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <button
                className="primary full pt-2"
                onClick={() => { alert('Session logged successfully!'); setModal(null); }}
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {modal === 'note' && (
        <div className="search-overlay" role="dialog">
          <div className="search-modal space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white">Add Note / Quote</h2>
              <button className="close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                {['quote', 'reflection', 'note'].map(type => (
                  <button
                    key={type}
                    className={`flex-1 py-1.5 rounded-lg capitalize text-xs font-semibold ${noteType === type ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-400'
                      }`}
                    onClick={() => setNoteType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Content / Line</label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Enter the quote or thought..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Page Number (Optional)</label>
                <input
                  type="number"
                  value={notePage}
                  onChange={e => setNotePage(e.target.value)}
                  placeholder="e.g. 142"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                />
              </div>

              <button
                className="primary full pt-2"
                onClick={() => { alert('Note saved!'); setModal(null); }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

{/* Dashboard Sub-Component */ }
function DashboardView({
  setActive,
  onAddBook,
  onLogSession
}: {
  setActive: (val: string) => void;
  onAddBook: () => void;
  onLogSession: () => void;
}) {
  const activeBook = mockBooks[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Sunday, August 23, 2026</p>
          <h1 className="text-2xl font-bold text-white">Good evening, Reader.</h1>
          <p className="text-sm text-slate-400">Here is your reading journey at a glance.</p>
        </div>

        <button className="primary" onClick={onAddBook}>
          <Plus size={16} /> Add a book
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="panel space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-semibold text-slate-400 uppercase">Reading Streak</span>
            <Flame size={18} />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{mockStats.currentStreak} days</div>
          <p className="text-xs text-amber-400">Longest: {mockStats.longestStreak} days</p>
          <div className="progress"><span style={{ width: '100%' }} /></div>
        </article>

        <article className="panel space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-semibold text-slate-400 uppercase">Books This Year</span>
            <BookOpen size={18} />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{mockStats.booksThisYear}</div>
          <p className="text-xs text-amber-400">↑ 24% vs last year</p>
          <div className="progress"><span style={{ width: '72%' }} /></div>
        </article>

        <article className="panel space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-semibold text-slate-400 uppercase">Pages Read</span>
            <Bookmark size={18} />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{mockStats.pagesThisYear.toLocaleString()}</div>
          <p className="text-xs text-amber-400">Goal: 10,000 pages</p>
          <div className="progress"><span style={{ width: '68%' }} /></div>
        </article>

        <article className="panel space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-semibold text-slate-400 uppercase">Average Rating</span>
            <Star size={18} />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{mockStats.averageRating}</div>
          <p className="text-xs text-amber-400">★★★★★ from {mockStats.booksThisYear} books</p>
          <div className="progress"><span style={{ width: '90%' }} /></div>
        </article>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Currently Reading Nightstand */}
          <section className="panel space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="eyebrow">On your nightstand</span>
                <h2 className="text-lg font-bold text-white">Currently Reading</h2>
              </div>
              <button className="text-button text-xs" onClick={() => setActive('Currently Reading')}>
                View detail <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <img src={activeBook.coverUrl} alt={activeBook.title} className="w-24 h-36 object-cover rounded-lg shadow-md shrink-0" />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h3 className="text-base font-bold text-white">{activeBook.title}</h3>
                <p className="text-xs text-slate-400">{activeBook.author}</p>
                <div className="progress pt-2">
                  <span style={{ width: '68%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Page 218 of {activeBook.pageCount}</span>
                  <span>68% Complete</span>
                </div>
              </div>
            </div>
          </section>

          {/* TBR Showcase */}
          <section className="panel space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="eyebrow">Waiting patiently</span>
                <h2 className="text-lg font-bold text-white">Up Next in Your TBR</h2>
              </div>
              <button className="text-button text-xs" onClick={() => setActive('TBR Queue')}>
                View full TBR <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {mockBooks.slice(1, 5).map(book => (
                <div
                  key={book.id}
                  className="book-card cursor-pointer group"
                  onClick={() => setActive('Currently Reading')}
                >
                  <img src={book.coverUrl} alt={book.title} className="cover group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-semibold text-white line-clamp-1 mt-2">{book.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{book.author}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Actions Sidebar */}
        <aside className="space-y-6">
          <section className="panel space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h2>
            <div className="space-y-2">
              <button className="utility-row w-full text-left" onClick={onAddBook}>
                <Plus size={16} className="text-amber-500" />
                <span className="flex-1 text-xs text-slate-200">Add a New Book</span>
                <ChevronRight size={14} className="text-slate-500" />
              </button>

              <button className="utility-row w-full text-left" onClick={onLogSession}>
                <CalendarDays size={16} className="text-amber-500" />
                <span className="flex-1 text-xs text-slate-200">Log Reading Session</span>
                <ChevronRight size={14} className="text-slate-500" />
              </button>

              <button className="utility-row w-full text-left" onClick={() => setActive('Overview')}>
                <TrendingUp size={16} className="text-amber-500" />
                <span className="flex-1 text-xs text-slate-200">View Reading Analytics</span>
                <ChevronRight size={14} className="text-slate-500" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}