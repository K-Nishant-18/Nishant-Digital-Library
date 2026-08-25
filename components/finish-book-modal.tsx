'use client';

import { useMemo, useState } from 'react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { CoverImage } from '@/components/cover-image';
import { toast } from '@/components/toast';
import { updateLibraryEntryAction, addNoteAction } from '@/lib/actions';
import type { LibraryEntry, ReadingSession } from '@/lib/types';

interface FinishBookModalProps {
  entry: LibraryEntry;
  sessions: ReadingSession[];
  onClose: () => void;
}

export function FinishBookModal({ entry, sessions, onClose }: FinishBookModalProps) {
  const [rating, setRating] = useState<number>(entry.rating ?? 0);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);

  const book = entry.book;
  const entrySessions = useMemo(
    () => sessions.filter(s => s.libraryEntryId === entry.id),
    [sessions, entry.id]
  );

  const stats = useMemo(() => {
    const pagesLogged = entrySessions.reduce(
      (acc, s) => acc + Math.max(0, (s.pageEnd ?? s.pageStart) - s.pageStart),
      0
    );
    const minutes = entrySessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
    const days = entry.dateStarted
      ? Math.max(1, differenceInDays(new Date(), new Date(entry.dateStarted)))
      : 1;
    const pagesRead = pagesLogged > 0 ? pagesLogged : (book?.pageCount || 0);
    return {
      pagesRead,
      minutes,
      pagesPerDay: Math.round(pagesRead / days),
      pagesPerHour: minutes > 0 ? Math.round((pagesRead / minutes) * 60) : 0,
    };
  }, [entrySessions, entry.dateStarted, book?.pageCount]);

  if (!book) return null;

  const handleFinish = async () => {
    setSaving(true);
    try {
      const res = await updateLibraryEntryAction({
        entryId: entry.id,
        status: 'read',
        ...(rating > 0 ? { rating } : {}),
        dateFinished: new Date(),
      });
      if (!res.success) {
        toast(`Error finishing book: ${res.error}`, 'error');
        setSaving(false);
        return;
      }

      if (review.trim()) {
        await addNoteAction({
          libraryEntryId: entry.id,
          type: 'reflection',
          text: review.trim(),
          tags: ['review'],
        });
      }

      const hours = Math.floor(stats.minutes / 60);
      const mins = stats.minutes % 60;
      toast(
        `🏆 Finished "${book.title}" — ${stats.pagesRead} pages in ${hours}h ${mins}m (~${stats.pagesPerDay} pages/day)`,
        'success'
      );
      onClose();
    } catch (err: any) {
      toast(`Error: ${err.message}`, 'error');
      setSaving(false);
    }
  };

  return (
    <div className="search-overlay" role="dialog" aria-label="Finish book">
      <div className="search-modal max-w-md">
        <button className="close" onClick={onClose} disabled={saving}><X size={18} /></button>

        <div className="flex items-center gap-4 pr-8 pb-4 border-b border-white/10">
          {book.coverUrl && (
            <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0 shadow-lg">
              <CoverImage src={book.coverUrl} alt={book.title} fill sizes="56px" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={14} /> Finished!
            </div>
            <h2 className="text-base font-bold text-white leading-tight truncate">{book.title}</h2>
            <p className="text-xs text-slate-400">{book.author}</p>
          </div>
        </div>

        {/* Auto-computed session stats */}
        <div className="grid grid-cols-4 gap-2 py-4 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Pages</span>
            <strong className="text-sm text-white font-mono">{stats.pagesRead}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Time</span>
            <strong className="text-sm text-white font-mono">
              {Math.floor(stats.minutes / 60)}h{stats.minutes % 60}m
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Pace</span>
            <strong className="text-sm text-amber-400 font-mono">{stats.pagesPerDay}/d</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Speed</span>
            <strong className="text-sm text-amber-400 font-mono">{stats.pagesPerHour}/h</strong>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-1.5 pb-4">
          <label className="text-slate-300 font-semibold text-xs block">Your rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                className={`p-0.5 transition-transform hover:scale-110 ${n <= rating ? 'text-amber-400' : 'text-slate-600'}`}
                aria-label={`Rate ${n} stars`}
              >
                <Star size={24} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs text-slate-400 font-mono ml-2">{rating}.0 / 5</span>
            )}
          </div>
        </div>

        {/* Review */}
        <div className="space-y-1.5 pb-5">
          <label className="text-slate-300 font-semibold text-xs block">
            Review or final thoughts <span className="text-slate-500 font-normal">(optional — saved to your journal)</span>
          </label>
          <textarea
            rows={3}
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="What did you think? Would you recommend it?"
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500/50 resize-none"
          />
        </div>

        <button className="primary w-full justify-center !py-3 text-sm font-bold" onClick={handleFinish} disabled={saving}>
          <CheckCircle2 size={18} /> {saving ? 'Saving…' : 'Mark as Finished'}
        </button>
      </div>
    </div>
  );
}

function differenceInDays(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}
