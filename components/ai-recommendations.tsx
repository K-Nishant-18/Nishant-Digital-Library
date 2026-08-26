'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { aiRecommendAction } from '@/lib/ai-actions';
import { addBookToLibraryAction } from '@/lib/actions';
import { CoverImage } from '@/components/cover-image';
import { toast } from '@/components/toast';

interface Recommendation {
  title: string;
  author: string;
  reason: string;
  matchPercent: number;
}

interface AiRecommendationsProps {
  onRefresh?: () => void;
}

export function AiRecommendations({ onRefresh }: AiRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const result = await aiRecommendAction();
      if (result.success && result.recommendations) {
        setRecommendations(result.recommendations);
      } else {
        toast('Could not load recommendations', 'error');
      }
    } catch {
      toast('AI service unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recommendations.length === 0 && !loading) {
      fetchRecommendations();
    }
  }, []);

  const handleAddBook = async (rec: Recommendation, index: number) => {
    const res = await addBookToLibraryAction(
      {
        title: rec.title,
        author: rec.author,
        genres: [],
        pageCount: 0,
      },
      'tbr',
    );
    if (res.success) {
      setAddedIds((prev) => new Set(prev).add(index));
      toast(`Added "${rec.title}" to TBR queue`);
      onRefresh?.();
    } else {
      toast('Failed to add book', 'error');
    }
  };

  return (
    <div className="bg-[#141618] border border-[#232629] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">AI Recommendations</span>
        </div>
        <button
          className="text-xs text-slate-400 hover:text-amber-400 transition-colors p-1 rounded hover:bg-white/5"
          onClick={fetchRecommendations}
          disabled={loading}
          title="Refresh recommendations"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && recommendations.length === 0 ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-14 rounded bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-2.5 bg-slate-800 rounded w-1/2" />
                <div className="h-2.5 bg-slate-800 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex gap-3 p-2.5 rounded-xl bg-slate-900/50 border border-white/5 hover:border-amber-500/20 transition-colors group"
            >
              <div className="w-10 h-14 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-amber-400/60" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{rec.title}</h4>
                <p className="text-[10px] text-slate-400 truncate">{rec.author}</p>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{rec.reason}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${rec.matchPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-amber-400 font-mono">{rec.matchPercent}%</span>
                  </div>
                  <button
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      addedIds.has(i)
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                    }`}
                    onClick={() => handleAddBook(rec, i)}
                    disabled={addedIds.has(i)}
                  >
                    {addedIds.has(i) ? 'Added' : 'Add to TBR'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
