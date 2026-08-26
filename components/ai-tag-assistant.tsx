'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Check, ChevronRight } from 'lucide-react';
import { aiTagBookAction, aiBatchTagAction, applyBookTagsAction } from '@/lib/ai-actions';
import { toast } from '@/components/toast';
import type { LibraryEntry } from '@/lib/types';

interface AiTagAssistantProps {
  open: boolean;
  onClose: () => void;
  entryId?: string | null;
  entries: LibraryEntry[];
  onComplete: () => void;
}

interface TagSuggestion {
  entryId: string;
  title: string;
  genres: string[];
  mood: string[];
  difficulty: number;
}

const MOOD_OPTIONS = [
  'focused', 'relaxed', 'emotional', 'inspired', 'engaged',
  'thoughtful', 'adventurous', 'humorous', 'dark', 'uplifting',
];

export function AiTagAssistant({ open, onClose, entryId, entries, onComplete }: AiTagAssistantProps) {
  const [mode, setMode] = useState<'single' | 'batch'>(entryId ? 'single' : 'batch');
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<TagSuggestion | null>(null);
  const [batchResults, setBatchResults] = useState<TagSuggestion[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(entryId ? 'single' : 'batch');
    setSingleResult(null);
    setBatchResults([]);
    setSelectedGenres(new Set());
    setSelectedMoods(new Set());
    setSelectedDifficulty(3);

    if (entryId) {
      fetchSingleTags(entryId);
    }
  }, [open, entryId]);

  const fetchSingleTags = async (id: string) => {
    setLoading(true);
    try {
      const result = await aiTagBookAction(id);
      if (result.success) {
        const suggestion: TagSuggestion = {
          entryId: id,
          title: entries.find((e) => e.id === id)?.book?.title || 'Unknown',
          genres: result.genres || [],
          mood: result.mood || [],
          difficulty: result.difficulty || 3,
        };
        setSingleResult(suggestion);
        setSelectedGenres(new Set(suggestion.genres));
        setSelectedMoods(new Set(suggestion.mood));
        setSelectedDifficulty(suggestion.difficulty);
      } else {
        toast('Could not generate tags', 'error');
      }
    } catch {
      toast('AI service unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchTags = async () => {
    setLoading(true);
    try {
      const result = await aiBatchTagAction();
      if (result.success && result.results) {
        setBatchResults(result.results);
      } else {
        toast('Could not generate batch tags', 'error');
      }
    } catch {
      toast('AI service unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSingle = async () => {
    if (!singleResult) return;
    setSaving(true);
    try {
      const res = await applyBookTagsAction(singleResult.entryId, [...selectedGenres]);
      if (res.success) {
        toast('Tags saved successfully');
        onComplete();
        onClose();
      } else {
        toast('Failed to save tags', 'error');
      }
    } catch {
      toast('Failed to save tags', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) => {
      const next = new Set(prev);
      if (next.has(mood)) next.delete(mood);
      else next.add(mood);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="search-overlay" role="dialog">
      <div className="search-modal space-y-5 max-w-lg">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            {mode === 'single' ? 'AI Tag Suggestions' : 'Batch Auto-Tag'}
          </h2>
          <button className="close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {mode === 'single' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="text-amber-400 animate-spin" />
                <p className="text-xs text-slate-400">Analyzing book metadata...</p>
              </div>
            ) : singleResult ? (
              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-white font-semibold">{singleResult.title}</p>
                </div>

                {/* Genres */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
                    Suggested Genres
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {singleResult.genres.map((genre) => (
                      <button
                        key={genre}
                        className={`text-[11px] px-2.5 py-1 rounded-lg transition-all ${
                          selectedGenres.has(genre)
                            ? 'bg-amber-500 text-black font-semibold'
                            : 'bg-slate-900 text-slate-400 border border-white/5'
                        }`}
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                {singleResult.mood.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
                      Suggested Mood
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {singleResult.mood.map((m) => (
                        <button
                          key={m}
                          className={`text-[11px] px-2.5 py-1 rounded-lg capitalize transition-all ${
                            selectedMoods.has(m)
                              ? 'bg-amber-500 text-black font-semibold'
                              : 'bg-slate-900 text-slate-400 border border-white/5'
                          }`}
                          onClick={() => toggleMood(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Difficulty */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
                    Difficulty: {selectedDifficulty}/5
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                          d === selectedDifficulty
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-900 text-slate-500 border border-white/5 hover:border-amber-500/30'
                        }`}
                        onClick={() => setSelectedDifficulty(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="outline-button flex-1 !py-2.5 text-xs" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    className="primary flex-1 !py-2.5 text-xs flex items-center justify-center gap-1.5"
                    onClick={handleSaveSingle}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save Tags
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No suggestions available.
              </div>
            )}
          </>
        )}

        {mode === 'batch' && (
          <>
            {!loading && batchResults.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Generate AI-suggested genres for all books in your library at once.
                </p>
                <button className="primary full !py-2.5 text-xs" onClick={fetchBatchTags}>
                  <Sparkles size={14} /> Generate Tags for All Books
                </button>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="text-amber-400 animate-spin" />
                <p className="text-xs text-slate-400">Processing books...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {batchResults.map((result, i) => (
                  <BatchTagCard key={i} result={result} onComplete={onComplete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BatchTagCard({ result, onComplete }: { result: TagSuggestion; onComplete: () => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await applyBookTagsAction(result.entryId, result.genres);
      if (res.success) {
        setSaved(true);
        onComplete();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-white truncate">{result.title}</h4>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {result.genres.slice(0, 4).map((g) => (
            <span key={g} className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
              {g}
            </span>
          ))}
          {result.mood.slice(0, 2).map((m) => (
            <span key={m} className="text-[9px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded capitalize">
              {m}
            </span>
          ))}
        </div>
      </div>
      <button
        className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${
          saved
            ? 'bg-green-500/20 text-green-400'
            : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
        }`}
        onClick={handleSave}
        disabled={saved || saving}
      >
        {saved ? 'Saved' : saving ? '...' : 'Apply'}
      </button>
    </div>
  );
}
