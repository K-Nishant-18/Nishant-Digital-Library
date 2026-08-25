'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  User, Award, Flame, BookOpen, Bookmark, Calendar, Settings, Shield,
  CheckCircle2, Lock, Edit3, Save, Download, Share2, Sparkles, Star,
  TrendingUp, RefreshCw, Layers, Check, Trophy
} from 'lucide-react';
import { EMPTY_STATS } from '@/lib/empty-stats';
import type { ReadingStats } from '@/lib/types';
import { updateProfileAction, updateGoalsAction } from '@/lib/actions';

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

interface ProfileViewProps {
  userProfile?: any;
  stats?: ReadingStats;
}

export function ProfileView({ userProfile, stats: dbStats }: ProfileViewProps) {
  const stats = dbStats ?? EMPTY_STATS;

  const [editing, setEditing] = useState(false);
  const [userName, setUserName] = useState(userProfile?.name || 'Kumar Nishant');
  const [userBio, setUserBio] = useState(userProfile?.bio || 'Software engineer by day, voracious reader by night. Building my personal library one book at a time.');
  const [targetBooks, setTargetBooks] = useState(userProfile?.targetBooks || 60);
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState(userProfile?.dailyMinutesGoal || 45);
  const [userLocation, setUserLocation] = useState(userProfile?.location || 'Bangalore, India');
  const [userWebsite, setUserWebsite] = useState(userProfile?.website || 'https://github.com/kumarnishant');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'goals' | 'settings'>('overview');

  const handleSaveProfile = async () => {
    setEditing(false);
    const res = await updateProfileAction({
      name: userName,
      bio: userBio,
      location: userLocation,
      website: userWebsite,
      dailyMinutesGoal,
    });
    await updateGoalsAction({ targetBooks });
    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const levelXpCurrent = userProfile?.xpCurrent || 3450;
  const levelXpNext = userProfile?.xpNext || 5000;
  const xpPercent = Math.round((levelXpCurrent / levelXpNext) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="panel bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              {userProfile?.avatarUrl ? (
                <Image src={userProfile.avatarUrl} alt={userName} width={80} height={80} className="w-20 h-20 rounded-2xl object-cover shadow-xl border-2 border-amber-300/50" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl border-2 border-amber-300/50">
                  {userName.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow border border-slate-950">
                LVL {userProfile?.level || 15}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">{userName}</h1>
                <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Trophy size={12} /> Level {userProfile?.level || 15} Master Reader
                </span>
              </div>

              <p className="text-xs text-slate-400 max-w-xl line-clamp-2">{userBio}</p>

              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={13} className="text-amber-500" /> Joined January 2024</span>
              <span className="flex items-center gap-1"><Flame size={13} className="text-amber-500" /> {stats.currentStreak} Day Streak</span>
              <span className="flex items-center gap-1"><BookOpen size={13} className="text-amber-500" /> {stats.booksThisYear} Books Read</span>
              <span className="flex items-center gap-1"><Bookmark size={13} className="text-amber-500" /> {stats.pagesThisYear.toLocaleString()} Pages</span>
              <span className="flex items-center gap-1"><Star size={13} className="text-amber-500" /> {stats.averageRating.toFixed(1)} Avg Rating</span>
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
              <Sparkles size={14} className="text-amber-400" /> XP Progress to Level {(userProfile?.level || 15) + 1}
            </span>
            <span className="text-amber-400 font-mono">{levelXpCurrent.toLocaleString()} / {levelXpNext.toLocaleString()} XP ({xpPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-3 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-2 rounded-lg border border-emerald-500/30 flex items-center gap-2">
            <Check size={14} /> Profile details saved successfully to Neon DB!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {(['overview', 'badges', 'goals', 'settings'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${
              activeTab === tab 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <section className="panel space-y-4">
              <h2 className="text-lg font-bold text-white">About Me</h2>
              {editing ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Bio</label>
                    <textarea value={userBio} onChange={e => setUserBio(e.target.value)} rows={3} className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Location</label>
                      <input value={userLocation} onChange={e => setUserLocation(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Website</label>
                      <input value={userWebsite} onChange={e => setUserWebsite(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-300">
                  <p>{userBio}</p>
                  <div className="flex gap-4 text-xs text-slate-400 pt-2 border-t border-white/5">
                    <span>Location: <strong className="text-white">{userLocation}</strong></span>
                    <span>Website: <a href={userWebsite} target="_blank" className="text-amber-400 hover:underline">{userWebsite}</a></span>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="panel space-y-3">
              <h2 className="text-lg font-bold text-white">Reading Goals</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>2026 Target Books</span>
                  <span className="font-mono text-white font-bold">{targetBooks} books</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Daily Reading Goal</span>
                  <span className="font-mono text-white font-bold">{dailyMinutesGoal} mins / day</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}