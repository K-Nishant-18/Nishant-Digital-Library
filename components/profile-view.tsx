'use client';

import { useState } from 'react';
import {
  User, Award, Flame, BookOpen, Bookmark, Calendar, Settings, Shield,
  CheckCircle2, Lock, Edit3, Save, Download, Share2, Sparkles, Star,
  TrendingUp, RefreshCw, Layers, Check, Trophy
} from 'lucide-react';
import { mockStats, mockBooks } from '@/lib/data';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Streak' | 'Volume' | 'Genre' | 'Mastery';
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

const mockBadges: Badge[] = [
  { id: 'b1', name: 'Night Owl Reader', description: 'Log 15 reading sessions after 10:00 PM', icon: '🌙', category: 'Streak', unlocked: true, unlockedAt: 'Jul 14, 2026', progress: 15, maxProgress: 15 },
  { id: 'b2', name: 'Speed Demon', description: 'Read more than 100 pages in a single day', icon: '⚡', category: 'Volume', unlocked: true, unlockedAt: 'Aug 02, 2026', progress: 1, maxProgress: 1 },
  { id: 'b3', name: 'Genre Polymath', description: 'Read books across 8 different genres', icon: '🎨', category: 'Genre', unlocked: true, unlockedAt: 'Aug 19, 2026', progress: 8, maxProgress: 8 },
  { id: 'b4', name: '100-Day Fire Streak', description: 'Maintain a 100-day consecutive reading streak', icon: '🔥', category: 'Streak', unlocked: false, progress: 42, maxProgress: 100 },
  { id: 'b5', name: 'Marathoner', description: 'Complete a book over 600 pages long', icon: '🏃', category: 'Volume', unlocked: true, unlockedAt: 'May 30, 2026', progress: 1, maxProgress: 1 },
  { id: 'b6', name: 'Annotation Master', description: 'Create 50 notes or quotes in your journal', icon: '✍️', category: 'Mastery', unlocked: true, unlockedAt: 'Aug 10, 2026', progress: 50, maxProgress: 50 },
  { id: 'b7', name: 'Classics Vault', description: 'Finish 10 timeless literary classics', icon: '🏛️', category: 'Genre', unlocked: false, progress: 6, maxProgress: 10 },
  { id: 'b8', name: 'Library Architect', description: 'Add 100 books to your virtual library shelves', icon: '📚', category: 'Mastery', unlocked: false, progress: 78, maxProgress: 100 }
];

export function ProfileView() {
  const [editing, setEditing] = useState(false);
  const [userName, setUserName] = useState('Kumar Nishant');
  const [userBio, setUserBio] = useState('Software engineer by day, voracious reader by night. Building my personal library one book at a time. Currently aiming for 60 books in 2026.');
  const [targetBooks, setTargetBooks] = useState(60);
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState(45);
  const [userLocation, setUserLocation] = useState('Bangalore, India');
  const [userWebsite, setUserWebsite] = useState('https://github.com/kumarnishant');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'goals' | 'settings'>('overview');

  const handleSaveProfile = () => {
    setEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const levelXpCurrent = 3450;
  const levelXpNext = 5000;
  const xpPercent = Math.round((levelXpCurrent / levelXpNext) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="panel bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl border-2 border-amber-300/50">
                {userName.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow border border-slate-950">
                LVL 15
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">{userName}</h1>
                <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Trophy size={12} /> Level 15 Master Reader
                </span>
              </div>

              <p className="text-xs text-slate-400 max-w-xl line-clamp-2">{userBio}</p>

              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={13} className="text-amber-500" /> Joined January 2024</span>
                <span className="flex items-center gap-1"><Flame size={13} className="text-amber-500" /> {mockStats.currentStreak} Day Streak</span>
                <span className="flex items-center gap-1"><BookOpen size={13} className="text-amber-500" /> {mockStats.booksThisYear} Books Read</span>
                <span className="flex items-center gap-1"><Bookmark size={13} className="text-amber-500" /> {mockStats.pagesThisYear.toLocaleString()} Pages</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {editing ? (
              <button onClick={handleSaveProfile} className="primary text-xs !py-2 !px-4">
                <Save size={14} /> Save Profile
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="outline-button text-xs !py-2 !px-4 flex items-center gap-1.5">
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> XP Progress to Level 16 (Literary Sage)
            </span>
            <span className="text-amber-400 font-mono">{levelXpCurrent.toLocaleString()} / {levelXpNext.toLocaleString()} XP ({xpPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-3 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-2 rounded-lg border border-emerald-500/30 flex items-center gap-2">
            <Check size={14} /> Profile details saved successfully!
          </div>
        )}
      </div>

      {/* Edit Form Drawer if Editing */}
      {editing && (
        <div className="panel space-y-4 bg-slate-900/80 border-amber-500/30 p-5 rounded-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Edit3 size={15} className="text-amber-500" /> Edit Profile Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Display Name</label>
              <input
                value={userName}
                onChange={e => setUserName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Email</label>
              <input
                value="kumar.nishant@devreader.com"
                onChange={e => {}}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">2026 Reading Goal (Books)</label>
              <input
                type="number"
                value={targetBooks}
                onChange={e => setTargetBooks(Number(e.target.value))}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Daily Reading Goal (Minutes)</label>
              <input
                type="number"
                value={dailyMinutesGoal}
                onChange={e => setDailyMinutesGoal(Number(e.target.value))}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">Bio / Reading Motto</label>
              <textarea
                rows={2}
                value={userBio}
                onChange={e => setUserBio(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">Location</label>
              <input
                value={userLocation}
                onChange={e => setUserLocation(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">Website / Portfolio</label>
              <input
                value={userWebsite}
                onChange={e => setUserWebsite(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile Section Tabs */}
      <div className="flex border-b border-white/10 gap-6 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Stats', Icon: User },
          { id: 'badges', label: 'Badges & Achievements', Icon: Award },
          { id: 'goals', label: 'Reading Challenges', Icon: Trophy },
          { id: 'settings', label: 'Account & Export', Icon: Settings }
        ].map(({ id, label, Icon }) => {
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'overview' | 'badges' | 'goals' | 'settings')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-amber-500 text-amber-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Stats */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="panel space-y-1 p-4 border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Books Read</span>
              <strong className="text-2xl font-bold text-white block font-mono">142</strong>
              <span className="text-[10px] text-amber-400 font-medium">Across 14 categories</span>
            </div>

            <div className="panel space-y-1 p-4 border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Pages Turned</span>
              <strong className="text-2xl font-bold text-white block font-mono">48,250</strong>
              <span className="text-[10px] text-amber-400 font-medium">~34 pages / day avg</span>
            </div>

            <div className="panel space-y-1 p-4 border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Badges Unlocked</span>
              <strong className="text-2xl font-bold text-amber-400 block font-mono">5 / 8</strong>
              <span className="text-[10px] text-slate-400">62.5% Completed</span>
            </div>

            <div className="panel space-y-1 p-4 border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Current Rating Avg</span>
              <strong className="text-2xl font-bold text-white block font-mono">4.8 ★</strong>
              <span className="text-[10px] text-amber-400 font-medium">Top genre: Sci-Fi</span>
            </div>
          </div>

          {/* Favorite Books Showcase */}
          <div className="panel space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="eyebrow">Reader Spotlight</span>
                <h3 className="text-base font-bold text-white">All-Time Favorite Books</h3>
              </div>
              <button className="text-button text-xs" onClick={() => alert('Editing showcase books...')}>
                Customize Shelf
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {mockBooks.slice(0, 4).map((book, idx) => (
                <div key={book.id} className="relative group bg-slate-900/50 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all">
                  <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center z-10 shadow">
                    #{idx + 1}
                  </div>
                  <img src={book.coverUrl} alt={book.title} className="w-full h-36 object-cover rounded-lg shadow-md mb-2 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-semibold text-white line-clamp-1">{book.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{book.author}</p>
                  <div className="text-amber-400 text-[10px] mt-1 font-mono">★ 5.0</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Badges & Achievements */}
      {activeTab === 'badges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Reading Achievements</h3>
              <p className="text-xs text-slate-400">Unlock badges as you read, log streaks, and explore new genres.</p>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              5 Unlocked • 3 Locked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockBadges.map(badge => (
              <div
                key={badge.id}
                className={`panel p-4 rounded-xl border flex items-start gap-4 transition-all ${
                  badge.unlocked
                    ? 'bg-slate-900/80 border-amber-500/30 shadow-lg'
                    : 'bg-slate-950/60 border-white/5 opacity-75'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                  badge.unlocked ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-slate-900 border border-white/10 grayscale'
                }`}>
                  {badge.icon}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      {badge.name}
                      {badge.unlocked && <CheckCircle2 size={13} className="text-amber-400" />}
                    </h4>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                      {badge.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">{badge.description}</p>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{badge.unlocked ? `Unlocked ${badge.unlockedAt}` : 'Progress'}</span>
                      <span>{badge.progress} / {badge.maxProgress}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full ${badge.unlocked ? 'bg-amber-500' : 'bg-slate-700'}`}
                        style={{ width: `${Math.min(100, (badge.progress / badge.maxProgress) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Reading Challenges */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="panel space-y-4 p-6 bg-slate-900/90 border-amber-500/20 rounded-2xl">
            <div className="flex justify-between items-center">
              <div>
                <span className="eyebrow">Annual Reading Target</span>
                <h3 className="text-lg font-bold text-white">2026 Reading Challenge</h3>
              </div>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {Math.round((mockStats.booksThisYear / targetBooks) * 100)}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>{mockStats.booksThisYear} of {targetBooks} books completed</span>
                <span>{targetBooks - mockStats.booksThisYear} books remaining</span>
              </div>
              <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                  style={{ width: `${Math.min(100, (mockStats.booksThisYear / targetBooks) * 100)}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              You are currently <strong>4 books ahead</strong> of your schedule to hit {targetBooks} books by Dec 31, 2026! 🚀
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel space-y-3 p-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Bookmark size={15} className="text-amber-500" /> Pages Milestone Challenge
              </h4>
              <p className="text-[11px] text-slate-400">Target: Read 15,000 pages in 2026</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-amber-400">
                  <span>10,480 / 15,000 pages</span>
                  <span>70%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
            </div>

            <div className="panel space-y-3 p-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers size={15} className="text-amber-500" /> Genre Exploration Challenge
              </h4>
              <p className="text-[11px] text-slate-400">Target: Read at least 1 book in 10 different genres</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-amber-400">
                  <span>8 / 10 genres explored</span>
                  <span>80%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Account & Data Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <div className="panel space-y-4 p-5">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Download size={16} className="text-amber-500" /> Library Backup & Export
            </h3>
            <p className="text-xs text-slate-400">
              Download a complete JSON or CSV backup of your books, reading sessions, highlights, and notes.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => alert('Downloading My_Library_Backup_2026.json...')}
                className="outline-button text-xs flex items-center gap-2"
              >
                <Download size={14} /> Export JSON Data
              </button>
              <button
                onClick={() => alert('Exporting reading history as CSV...')}
                className="outline-button text-xs flex items-center gap-2"
              >
                <Share2 size={14} /> Export CSV Spreadsheet
              </button>
            </div>
          </div>

          <div className="panel space-y-4 p-5">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Shield size={16} className="text-amber-500" /> Account Privacy & Storage
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <div>
                  <h4 className="font-semibold text-white">Local Library Storage</h4>
                  <p className="text-slate-400">Store all library records locally in browser storage.</p>
                </div>
                <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  Active (Offline Ready)
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-white/5 pt-3">
                <div>
                  <h4 className="font-semibold text-white">Open Library API Sync</h4>
                  <p className="text-slate-400">Fetch metadata, cover art, and page counts online.</p>
                </div>
                <span className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}