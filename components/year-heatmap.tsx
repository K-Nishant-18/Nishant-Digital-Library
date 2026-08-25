'use client';

import { useMemo } from 'react';
import type { ReadingSession } from '@/lib/types';

interface YearHeatmapProps {
  sessions: ReadingSession[];
}

const LEVEL_COLORS = [
  'var(--faint)',
  'rgba(245, 158, 11, 0.25)',
  'rgba(245, 158, 11, 0.45)',
  'rgba(245, 158, 11, 0.7)',
  '#f59e0b',
];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function YearHeatmap({ sessions }: YearHeatmapProps) {
  const { weeks, monthLabels, totalMinutes } = useMemo(() => {
    const minutesByDay = new Map<string, number>();
    let total = 0;
    for (const s of sessions) {
      const key = dayKey(new Date(s.startedAt));
      const mins = s.minutes ?? ((s.pageEnd ?? s.pageStart) - s.pageStart > 0 ? 20 : 15);
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + mins);
      total += mins;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start on the Sunday 52 weeks ago so we end on the current week
    const start = new Date(today);
    start.setDate(start.getDate() - 364 - start.getDay());

    const levelFor = (mins: number) => {
      if (!mins || mins <= 0) return 0;
      if (mins < 20) return 1;
      if (mins < 40) return 2;
      if (mins < 60) return 3;
      return 4;
    };

    const weeksOut: { date: Date; key: string; minutes: number; level: number; future: boolean }[][] = [];
    const monthLabels: { index: number; label: string }[] = [];
    const cursor = new Date(start);
    let lastMonth = -1;

    for (let w = 0; w < 53; w++) {
      const week: { date: Date; key: string; minutes: number; level: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const future = cursor > today;
        const key = dayKey(cursor);
        const minutes = minutesByDay.get(key) ?? 0;
        week.push({ date: new Date(cursor), key, minutes, level: future ? -1 : levelFor(minutes), future });
        if (d === 0 && cursor.getMonth() !== lastMonth && !future) {
          lastMonth = cursor.getMonth();
          monthLabels.push({
            index: w,
            label: cursor.toLocaleString('en-US', { month: 'short' }),
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksOut.push(week);
    }

    return { weeks: weeksOut, monthLabels, totalMinutes: total };
  }, [sessions]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-400">
          {Math.floor(totalMinutes / 60)}h read in the last 12 months
        </span>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          Less
          {LEVEL_COLORS.map((color, i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: color }}
            />
          ))}
          More
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-max space-y-1">
          {/* Month labels */}
          <div className="relative h-4 ml-8">
            {monthLabels.map(m => (
              <span
                key={`${m.label}-${m.index}`}
                className="absolute text-[10px] text-slate-500 font-medium"
                style={{ left: `${m.index * 17}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[5px]">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[5px] mr-1 pt-0">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                <span key={i} className="w-6 h-3 text-[9px] leading-3 text-slate-500 text-right">
                  {label}
                </span>
              ))}
            </div>

            {/* Day cells */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[5px]">
                {week.map(day => (
                  <div
                    key={day.key}
                    className={`w-3 h-3 rounded-sm ${day.future ? 'opacity-30' : 'hover:scale-125 transition-transform'}`}
                    style={{
                      backgroundColor: day.level < 0 ? 'transparent' : LEVEL_COLORS[day.level],
                    }}
                    title={
                      day.future
                        ? undefined
                        : `${day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}: ${Math.round(day.minutes)} min read`
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
