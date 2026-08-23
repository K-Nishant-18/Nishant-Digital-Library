'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, Flame, Calendar, Award, BarChart3, PieChart, Clock, BookOpen, Star, Filter, Tags
} from 'lucide-react';
import { mockStats, mockReadingGoal } from '@/lib/data';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell
} from 'recharts';

interface AnalyticsViewProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AnalyticsView({ activeTab = 'Overview', onTabChange }: AnalyticsViewProps) {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [currentTab, setCurrentTab] = useState(activeTab);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const stats = mockStats;
  const goal = mockReadingGoal;
  const goalPercent = Math.round((stats.booksThisYear / goal.targetBooks) * 100);

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

  const tabs = [
    { name: 'Overview', icon: TrendingUp },
    { name: 'Year in Books', icon: BookOpen },
    { name: 'Genres', icon: Tags },
    { name: 'Pace & Streaks', icon: Flame },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Goal Tracker */}
      <div className="panel space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="eyebrow">Analytics & Insights</div>
            <h1 className="text-2xl font-bold text-white">2026 Reading Journey</h1>
            <p className="text-sm text-slate-400">Track your momentum, reading pace, and literary habits.</p>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-white/10 text-xs font-semibold text-white rounded-lg px-3 py-2 outline-none"
            >
              <option value="2026">2026 Year</option>
              <option value="2025">2025 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Analytics Nav Tabs */}
        <div className="flex items-center gap-2 border-t border-white/10 pt-3">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = currentTab === t.name;
            return (
              <button
                key={t.name}
                onClick={() => handleTabClick(t.name)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Goal Card */}
        {(currentTab === 'Overview' || currentTab === 'Year in Books') && (
          <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Annual Goal</span>
              <div className="text-xl font-bold text-amber-500 font-mono">{stats.booksThisYear} / {goal.targetBooks} books</div>
              <div className="progress">
                <span style={{ width: `${goalPercent}%` }} />
              </div>
              <span className="text-[11px] text-slate-500">{goalPercent}% completed</span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Pages Read</span>
              <div className="text-xl font-bold text-white font-mono">{stats.pagesThisYear.toLocaleString()}</div>
              <span className="text-[11px] text-slate-500">Avg {stats.averagePagesPerDay} pages / day</span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Reading Time</span>
              <div className="text-xl font-bold text-white font-mono">{Math.round(stats.readingTimeMinutes / 60)}h {stats.readingTimeMinutes % 60}m</div>
              <span className="text-[11px] text-slate-500">~{stats.averagePagesPerHour} pages / hour</span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Streak Record</span>
              <div className="text-xl font-bold text-amber-400 font-mono flex items-center gap-1">
                <Flame size={18} className="fill-amber-400" />
                {stats.currentStreak} days
              </div>
              <span className="text-[11px] text-slate-500">Longest: {stats.longestStreak} days</span>
            </div>
          </div>
        )}
      </div>

      {/* Pages per Month Area Chart */}
      {(currentTab === 'Overview' || currentTab === 'Year in Books' || currentTab === 'Pace & Streaks') && (
        <section className="panel space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Monthly Reading Volume</h2>
              <p className="text-xs text-slate-400">Pages read each month in {selectedYear}</p>
            </div>
            <span className="text-xs font-mono text-amber-500">Peak: Aug (920 pages)</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyPages}>
                <defs>
                  <linearGradient id="pageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`${value} pages`, 'Volume']}
                />
                <Area type="monotone" dataKey="pages" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#pageGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Genre Distribution & Format Breakdown Grid */}
      {(currentTab === 'Overview' || currentTab === 'Genres') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="panel space-y-4">
            <h2 className="text-lg font-bold text-white">Genre Breakdown</h2>
            <div className="space-y-3">
              {stats.genreDistribution.map((genre, idx) => (
                <div key={genre.genre} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {genre.genre}
                    </span>
                    <span className="font-mono">{genre.count} books ({genre.percent}%)</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${genre.percent}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel space-y-4">
            <h2 className="text-lg font-bold text-white">Rating Distribution</h2>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ratingDistribution}>
                  <XAxis dataKey="rating" stroke="#64748b" fontSize={12} tickFormatter={val => `${val}★`} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any) => [`${value} books`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {stats.ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Heatmap Activity representation */}
      {(currentTab === 'Overview' || currentTab === 'Pace & Streaks') && (
        <section className="panel space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">90-Day Reading Heatmap</h2>
              <p className="text-xs text-slate-400">Consistency across past 3 months</p>
            </div>
            <span className="text-xs text-amber-500 font-mono">12 Day Active Streak</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {stats.heatmapData.map((day, i) => {
              const intensity = day.minutes === 0 ? 'bg-slate-800' : day.minutes < 30 ? 'bg-amber-900/60' : day.minutes < 45 ? 'bg-amber-600' : 'bg-amber-500';
              return (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-sm ${intensity} transition-transform hover:scale-125 cursor-pointer`}
                  title={`${day.date}: ${day.minutes} minutes`}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}