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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          {/* Mobile Command Center Menu Trigger */}
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
              onAddNote={() => setModal('note')}
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

      {/* Mobile Command Center Off-Canvas Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex animate-in fade-in duration-200" role="dialog">
          <div className="w-72 max-w-[85vw] bg-[#101112] border-r border-[#222527] h-full p-5 flex flex-col gap-6 overflow-y-auto mobile-drawer animate-in slide-in-from-left duration-200 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="brand cursor-pointer" onClick={() => { setActive('Dashboard'); setMobileMenuOpen(false); }}>
                <div className="brand-mark">
                  <BookOpen size={19} />
                </div>
                <span className="font-bold text-white text-lg">My Library</span>
              </div>
              <button
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Command Center */}
            <div className="nav-group">
              <div className="nav-label text-amber-400 font-bold tracking-wider text-[11px] uppercase mb-1">Command Center</div>
              {nav.map(([name, Icon]) => (
                <button
                  key={name}
                  className={`nav-item ${active === name ? 'active' : ''}`}
                  onClick={() => { setActive(name); setMobileMenuOpen(false); }}
                >
                  <Icon size={17} />
                  <span>{name}</span>
                  {name === 'TBR Queue' && <span className="nav-count">12</span>}
                </button>
              ))}
            </div>

            {/* Analytics */}
            <div className="nav-group">
              <div className="nav-label tracking-wider text-[11px] uppercase mb-1">Analytics</div>
              {analytics.map(([name, Icon]) => (
                <button
                  key={name}
                  className={`nav-item ${active === name ? 'active' : ''}`}
                  onClick={() => { setActive(name); setMobileMenuOpen(false); }}
                >
                  <Icon size={17} />
                  <span>{name}</span>
                </button>
              ))}
            </div>

            {/* Journal */}
            <div className="nav-group">
              <div className="nav-label tracking-wider text-[11px] uppercase mb-1">Journal</div>
              {journal.map(name => (
                <button
                  key={name}
                  className={`nav-item ${active === name ? 'active' : ''}`}
                  onClick={() => { setActive(name); setMobileMenuOpen(false); }}
                >
                  <Bookmark size={17} />
                  <span>{name}</span>
                </button>
              ))}
            </div>

            {/* Streak Widget */}
            <div className="streak-widget mt-auto">
              <div className="streak-top">
                <Flame size={19} />
                <span>Keep going, Reader!</span>
              </div>
              <strong>{mockStats.currentStreak} day streak</strong>
              <button onClick={() => { setActive('Pace & Streaks'); setMobileMenuOpen(false); }}>
                View streaks <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 cursor-pointer" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

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
  onLogSession,
  onAddNote
}: {
  setActive: (val: string) => void;
  onAddBook: () => void;
  onLogSession: () => void;
  onAddNote: () => void;
}) {
  const tbrBooks = [
    { title: 'Dune', author: 'Frank Herbert', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80' },
    { title: 'Project Hail Mary', author: 'Andy Weir', cover: 'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?auto=format&fit=crop&w=300&q=80' },
    { title: 'The Way of Kings', author: 'Brandon Sanderson', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80' },
    { title: 'Fourth Wing', author: 'Rebecca Yarros', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80' },
    { title: 'Mistborn', author: 'Brandon Sanderson', cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=300&q=80' },
    { title: 'The Silent Patient', author: 'Alex Michaelides', cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=300&q=80' },
  ];

  const spineBooks = [
    { title: 'DUNE', author: 'FRANK HERBERT', color: '#7a2818', text: '#f3d9a2', height: 165 },
    { title: 'THE WAY OF KINGS', author: 'BRANDON SANDERSON', color: '#1b3c59', text: '#e0c987', height: 180 },
    { title: 'WORDS OF RADIANCE', author: 'BRANDON SANDERSON', color: '#27384c', text: '#cca24e', height: 185 },
    { title: 'OATHBRINGER', author: 'BRANDON SANDERSON', color: '#3b233a', text: '#e5b869', height: 182 },
    { title: 'RHYTHM OF WAR', author: 'BRANDON SANDERSON', color: '#4a1e1e', text: '#d1a757', height: 178 },
    { title: 'MISTBORN', author: 'BRANDON SANDERSON', color: '#2a2d32', text: '#b8c4d0', height: 170 },
    { title: 'THE NAME OF THE WIND', author: 'PATRICK ROTHFUSS', color: '#16382c', text: '#d4af37', height: 175 },
    { title: 'THE HOBBIT', author: 'J.R.R. TOLKIEN', color: '#1d4838', text: '#edd69a', height: 160 },
    { title: '1984', author: 'GEORGE ORWELL', color: '#802319', text: '#e8ded1', height: 155 },
    { title: 'THE SILENT PATIENT', author: 'ALEX MICHAELIDES', color: '#d1cdc7', text: '#1a1a1a', height: 168 },
    { title: 'SAPIENS', author: 'YUVAL NOAH HARARI', color: '#2b506e', text: '#f2e8cf', height: 172 },
    { title: 'EDUCATED', author: 'TARA WESTOVER', color: '#1f4863', text: '#eddcd2', height: 164 },
  ];

  const paceBars = [
    { month: 'Jan', val: 560 },
    { month: 'Feb', val: 620 },
    { month: 'Mar', val: 780 },
    { month: 'Apr', val: 510 },
    { month: 'May', val: 590, active: true },
    { month: 'Jun', val: 680 },
    { month: 'Jul', val: 720 },
    { month: 'Aug', val: 610 },
    { month: 'Sep', val: 640 },
    { month: 'Oct', val: 750 },
    { month: 'Nov', val: 820 },
    { month: 'Dec', val: 910 },
  ];

  return (
    <div className="space-y-5 text-slate-200 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Good evening, Reader.</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Here's your reading journey at a glance.</p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Friday, May 24, 2024
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Streak */}
        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Flame size={14} className="text-amber-500" />
            <span>Reading Streak</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">28 <span className="text-xs font-normal text-slate-400">days</span></div>
              <p className="text-[11px] text-slate-400 mt-0.5">Longest: 46 days</p>
            </div>
            <svg className="w-20 h-9 text-amber-500 overflow-visible" viewBox="0 0 80 40" fill="none">
              <path d="M0 32 Q 15 35, 25 28 T 50 18 T 65 22 T 80 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="80" cy="8" r="3.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Card 2: Books This Year */}
        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <BookOpen size={14} className="text-amber-500" />
            <span>Books This Year</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">17 <span className="text-xs font-normal text-slate-400">books</span></div>
            <p className="text-[11px] text-slate-400 mt-0.5">Goal: 36 books</p>
            <div className="h-1 w-full bg-slate-800 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '47%' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Pages This Year */}
        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Bookmark size={14} className="text-amber-500" />
            <span>Pages This Year</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">4,312 <span className="text-xs font-normal text-slate-400">pages</span></div>
            <p className="text-[11px] text-slate-400 mt-0.5">Goal: 10,000 pages</p>
            <div className="h-1 w-full bg-slate-800 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '43%' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Average Rating */}
        <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <Star size={14} className="text-amber-500" />
            <span>Average Rating</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white tracking-tight">4.2</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
              <div className="flex text-amber-500 gap-0.5">
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
                <Star size={11} fill="currentColor" />
                <Star size={11} className="text-slate-600" fill="currentColor" />
              </div>
              <span>(23 ratings)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2/3, Right 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-4">
          {/* UP NEXT IN YOUR TBR */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Up Next in Your TBR</span>
              <button
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"
                onClick={() => setActive('TBR Queue')}
              >
                View full TBR <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
              {tbrBooks.map((book, idx) => (
                <div key={idx} className="group cursor-pointer space-y-1.5" onClick={() => setActive('Currently Reading')}>
                  <div className="aspect-[2/3] rounded overflow-hidden bg-slate-800 shadow-md group-hover:scale-105 transition-transform duration-200">
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white truncate leading-snug">{book.title}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two Columns: Pace + Genre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reading Pace */}
            <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-3 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Reading Pace</span>
                <select className="bg-[#1c1e20] border border-[#2e3134] text-slate-300 text-[11px] rounded px-2 py-0.5 outline-none cursor-pointer">
                  <option>Monthly</option>
                  <option>Weekly</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 items-end pt-2">
                {/* Bar Chart Area */}
                <div className="col-span-2 h-36 flex items-end justify-between gap-1 pr-2 border-r border-[#232629]">
                  {paceBars.map((b, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        className={`w-full max-w-[12px] rounded-t ${b.active ? 'bg-amber-500' : 'bg-[#2a2d30]'}`}
                        style={{ height: `${(b.val / 1000) * 100}%` }}
                      />
                      <span className="text-[9px] text-slate-500 font-mono">{b.month[0]}</span>
                    </div>
                  ))}
                </div>

                {/* Right Metrics */}
                <div className="space-y-3 pl-2 flex flex-col justify-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Monthly Average</span>
                    <strong className="text-lg font-bold text-white block">546</strong>
                    <span className="text-[10px] text-slate-500">pages</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">2024 Goal</span>
                    <strong className="text-lg font-bold text-white block">833</strong>
                    <span className="text-[10px] text-slate-500">pages / month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Genre Distribution */}
            <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-3 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Genre Distribution</span>
              </div>

              <div className="flex items-center gap-4 py-1">
                {/* Donut Chart */}
                <div className="relative w-28 h-28 rounded-full shrink-0 grid place-items-center bg-[conic-gradient(#f59e0b_0_41%,#ea580c_41%_59%,#f97316_59%_71%,#ef4444_71%_83%,#3b82f6_83%_92%,#475569_92%_100%)]">
                  <div className="w-20 h-20 rounded-full bg-[#141618] flex flex-col items-center justify-center text-center">
                    <strong className="text-xl font-bold text-white leading-none">17</strong>
                    <span className="text-[9px] text-slate-400 font-medium">books</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1 text-[11px] flex-1">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <i className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Fantasy
                    </span>
                    <span className="font-semibold text-white">41%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <i className="w-2 h-2 rounded-full bg-orange-600 inline-block" /> Sci-Fi
                    </span>
                    <span className="font-semibold text-white">18%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <i className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Mystery
                    </span>
                    <span className="font-semibold text-white">12%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <i className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Thriller
                    </span>
                    <span className="font-semibold text-white">12%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <i className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Non-Fiction
                    </span>
                    <span className="font-semibold text-white">9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <i className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Other
                    </span>
                    <span className="font-semibold text-white">8%</span>
                  </div>
                </div>
              </div>

              <button
                className="text-[11px] text-amber-500 hover:text-amber-400 font-medium text-left pt-1"
                onClick={() => setActive('Genres')}
              >
                View full analytics
              </button>
            </div>
          </div>

          {/* Recent Reading Activity - below Pace & Genre, left of Calendar */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Recent Reading Activity</span>
              <button
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"
                onClick={() => setActive('Reading Logs')}
              >
                View all logs <ChevronRight size={13} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Activity Item 1 */}
              <div className="flex gap-3 items-start">
                <div className="w-12 h-16 rounded bg-slate-800 overflow-hidden shrink-0 shadow-md border border-white/5">
                  <img
                    src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80"
                    alt="The Name of the Wind"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold text-white">The Name of the Wind</h4>
                    <span className="text-[10px] text-slate-500">May 23, 2024 • 9:30 PM</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Session: 45 pages (p. 411-456)</p>
                  <div className="mt-2 p-2 bg-slate-900/50 rounded border border-white/5 text-xs">
                    <p className="text-slate-300">"The important thing is not what you write, but that you write. The water does not care what shape the cup is."</p>
                    <p className="text-[10px] text-amber-400 mt-1">— Quote from page 423</p>
                  </div>
                </div>
              </div>

              {/* Activity Item 2 */}
              <div className="flex gap-3 items-start">
                <div className="w-12 h-16 rounded bg-slate-800 overflow-hidden shrink-0 shadow-md border border-white/5">
                  <img
                    src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80"
                    alt="The Way of Kings"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold text-white">The Way of Kings</h4>
                    <span className="text-[10px] text-slate-500">May 22, 2024 • 10:15 PM</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Session: 32 pages (p. 892-924)</p>
                  <div className="mt-2 p-2 bg-slate-900/50 rounded border border-white/5 text-xs">
                    <p className="text-slate-300">Finished Part Four! Kaladin's journey is getting so intense. The bridge runs are heartbreaking but inspiring.</p>
                    <p className="text-[10px] text-slate-500 mt-1">— Reading reflection</p>
                  </div>
                </div>
              </div>

              {/* Activity Item 3 */}
              <div className="flex gap-3 items-start">
                <div className="w-12 h-16 rounded bg-slate-800 overflow-hidden shrink-0 shadow-md border border-white/5">
                  <img
                    src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=300&q=80"
                    alt="The Silent Patient"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold text-white">The Silent Patient</h4>
                    <span className="text-[10px] text-slate-500">May 20, 2024 • 8:45 PM</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Session: 25 pages (p. 187-212)</p>
                  <div className="mt-2 p-2 bg-slate-900/50 rounded border border-white/5 text-xs">
                    <p className="text-slate-300">The twist about Alicia's diary entries is chilling. I need to reread this section to catch all the clues I missed.</p>
                    <p className="text-[10px] text-slate-500 mt-1">— Reading note</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Currently Reading + Quick Actions + Calendar */}
        <div className="space-y-4">
          {/* Currently Reading Card - Expanded */}
<div className="bg-[#141618] border border-[#232629] rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-bold tracking-wider text-slate-400 uppercase">Currently Reading</span>
              <button className="text-slate-500 hover:text-slate-300">
                <Sliders size={16} />
              </button>
            </div>

            <div className="flex gap-4 items-start pt-1">
              <div className="w-32 aspect-[2/3] rounded bg-slate-800 overflow-hidden shrink-0 shadow-lg border border-white/5">
                <img
                  src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80"
                  alt="The Name of the Wind"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">The Name of the Wind</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Patrick Rothfuss</p>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                  <div className="text-right text-[12px] text-amber-400 font-semibold">65%</div>
                </div>

                <button
                  className="w-full bg-[#232628] hover:bg-[#2c3033] text-white text-sm font-semibold py-2 rounded transition-colors"
                  onClick={() => setActive('Currently Reading')}
                >
                  Continue Reading
                </button>

                <div className="text-[12px] text-slate-400 space-y-0.5 pt-0.5">
                  <p>Page 456 / 704</p>
                  <p>Started on May 10, 2024</p>
                </div>
              </div>
            </div>

            {/* Reading Insights Section */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Reading Insights</span>
                <button className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium">
                  View details <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-slate-400 font-medium">Sessions</div>
                  <div className="text-xl font-bold text-white mt-1">12</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-slate-400 font-medium">Time Spent</div>
                  <div className="text-xl font-bold text-white mt-1">14h 32m</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Recent Notes & Quotes</span>
                  <button className="text-xs text-amber-500 hover:text-amber-400 font-medium" onClick={onAddNote}>
                    Add note +
                  </button>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5 text-xs">
                  <p className="text-slate-300">"The important thing is not what you write, but that you write. The water does not care what shape the cup is."</p>
                  <p className="text-[10px] text-amber-400 mt-2">— Quote from page 423</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-3 space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">Quick Actions</span>
            <div className="space-y-0.5 pt-0.5">
              <button
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-xs text-slate-300 transition-colors"
                onClick={onAddBook}
              >
                <span>Add a New Book</span>
                <Plus size={14} className="text-slate-400" />
              </button>
              <button
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-xs text-slate-300 transition-colors"
                onClick={onLogSession}
              >
                <span>Log a Reading Session</span>
                <CalendarDays size={14} className="text-slate-400" />
              </button>
              <button
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-white/5 text-xs text-slate-300 transition-colors"
                onClick={() => setActive('Notes & Quotes')}
              >
                <span>Write a Reading Log</span>
                <Bookmark size={14} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Reading Streak Calendar Card */}
          <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Reading Streak Calendar</span>
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-white">
              <span>May 2024</span>
              <div className="flex gap-2 text-slate-400">
                <button className="hover:text-white">{"<"}</button>
                <button className="hover:text-white">{">"}</button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 text-center text-[10px] text-slate-500 font-bold">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 text-center text-xs gap-y-1 text-slate-400">
                <span className="text-slate-600">28</span><span className="text-slate-600">29</span><span className="text-slate-600">30</span>
                <span>1</span><span>2</span><span>3</span><span>4</span>
                <span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span>
                <span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span>
                <span>19</span><span>20</span><span>21</span><span>22</span><span>23</span>
                {/* Active Highlight Day */}
                <span className="w-6 h-6 rounded-full border border-amber-500 text-amber-400 font-bold mx-auto flex items-center justify-center">24</span>
                <span>25</span>
                <span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span><span className="text-slate-600">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>


     </div>
   );
}
