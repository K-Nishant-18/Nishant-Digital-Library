'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, User, Image, FileText, Tag, Book as BookIcon, Calendar, Building, Globe, Type, Hash, Bookmark, Star, Heart, Repeat, Smile, Meh, Frown, Check, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { updateBookAction, updateLibraryEntryFullAction } from '@/lib/actions';
import type { Book, LibraryEntry } from '@/lib/types';

export function BookEditModal({
  entry,
  onClose,
  onSave,
}: {
  entry: LibraryEntry;
  onClose: () => void;
  onSave: () => void;
}) {
  const [bookData, setBookData] = useState<Partial<Book>>({
    title: entry.book?.title || '',
    subtitle: entry.book?.subtitle || '',
    author: entry.book?.author || '',
    coverUrl: entry.book?.coverUrl || '',
    description: entry.book?.description || '',
    genres: entry.book?.genres || [],
    format: entry.book?.format || 'paperback',
    pageCount: entry.book?.pageCount || 0,
    publishedYear: entry.book?.publishedYear,
    publisher: entry.book?.publisher || '',
    language: entry.book?.language || 'en',
  });

  const [entryData, setEntryData] = useState({
    status: entry.status,
    rating: entry.rating || 0,
    owned: entry.owned,
    currentPage: entry.currentPage,
    difficulty: entry.difficulty || 3,
    emotionalImpact: entry.emotionalImpact || 3,
    wouldRecommend: entry.wouldRecommend || false,
    rereadValue: entry.rereadValue || 3,
    dateStarted: entry.dateStarted ? new Date(entry.dateStarted).toISOString().split('T')[0] : '',
    dateFinished: entry.dateFinished ? new Date(entry.dateFinished).toISOString().split('T')[0] : '',
  });

  const [activeTab, setActiveTab] = useState<'book' | 'entry'>('book');
  const [genreInput, setGenreInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleBookChange = (field: keyof Book, value: any) => {
    setBookData((prev: Partial<Book>) => ({ ...prev, [field]: value }));
  };

  const handleEntryChange = (field: string, value: any) => {
    setEntryData((prev: typeof entryData) => ({ ...prev, [field]: value }));
  };

  const addGenre = () => {
    if (genreInput.trim() && !bookData.genres?.includes(genreInput.trim())) {
      handleBookChange('genres', [...(bookData.genres || []), genreInput.trim()]);
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    handleBookChange('genres', bookData.genres?.filter((g: string) => g !== genre) || []);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      // Update book details
      const bookUpdateResult = await updateBookAction(entry.bookId, {
        title: bookData.title,
        subtitle: bookData.subtitle,
        author: bookData.author,
        coverUrl: bookData.coverUrl,
        description: bookData.description,
        genres: bookData.genres,
        format: bookData.format,
        pageCount: bookData.pageCount,
        publishedYear: bookData.publishedYear,
        publisher: bookData.publisher,
        language: bookData.language,
      });

      if (!bookUpdateResult.success) {
        throw new Error(bookUpdateResult.error || 'Failed to update book details');
      }

      // Update library entry details
      const entryUpdateResult = await updateLibraryEntryFullAction({
        entryId: entry.id,
        status: entryData.status,
        rating: entryData.rating,
        owned: entryData.owned,
        currentPage: entryData.currentPage,
        difficulty: entryData.difficulty,
        emotionalImpact: entryData.emotionalImpact,
        wouldRecommend: entryData.wouldRecommend,
        rereadValue: entryData.rereadValue,
        dateStarted: entryData.dateStarted ? new Date(entryData.dateStarted) : undefined,
        dateFinished: entryData.dateFinished ? new Date(entryData.dateFinished) : undefined,
      });

      if (!entryUpdateResult.success) {
        throw new Error(entryUpdateResult.error || 'Failed to update library entry');
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const formatOptions = [
    { value: 'paperback', label: 'Paperback' },
    { value: 'hardcover', label: 'Hardcover' },
    { value: 'kindle', label: 'Kindle' },
    { value: 'audiobook', label: 'Audiobook' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'tbr', label: 'To Be Read' },
    { value: 'reading', label: 'Reading' },
    { value: 'read', label: 'Read' },
    { value: 'dnf', label: 'Did Not Finish' },
  ];

  const ratingOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const difficultyOptions = [1, 2, 3, 4, 5];
  const emotionalImpactOptions = [1, 2, 3, 4, 5];
  const rereadValueOptions = [1, 2, 3, 4, 5];

  return (
<div className="search-overlay" role="dialog">
  <div className="search-modal space-y-0 max-w-2xl w-full rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit3 size={20} className="text-amber-500" /> Edit Book Details
          </h2>
          <button className="close hover:bg-slate-800/50 p-1.5 rounded-lg transition-colors" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mt-2 mb-4">
          <button
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-all ${activeTab === 'book' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setActiveTab('book')}
          >
            Book Metadata
          </button>
          <button
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-all ${activeTab === 'entry' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setActiveTab('entry')}
          >
            Reading Progress & Rating
          </button>
        </div>

        {/* Content */}
<div className="space-y-5 max-h-[70vh] overflow-y-auto p-4">
          {/* Book Details Tab */}
          {activeTab === 'book' && (
            <div className="space-y-4">
              {/* Cover Image */}
              <div className="flex gap-4">
<div className="w-32 h-44 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                  {bookData.coverUrl ? (
                    <img
                      src={bookData.coverUrl}
                      alt={bookData.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-700">
                      <BookOpen size={24} className="text-slate-400" />
                    </div>
                  )}
                </div>

<div className="flex-1 space-y-4">
                  {/* Title */}
                  <div>
<label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                      <BookIcon size={12} /> Title
                    </label>
<input
  type="text"
  value={bookData.title}
  onChange={(e) => handleBookChange('title', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
/>
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                      <Type size={12} /> Subtitle
                    </label>
                    <input
                      type="text"
                      value={bookData.subtitle}
                      onChange={(e) => handleBookChange('subtitle', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                      <User size={12} /> Author
                    </label>
                    <input
                      type="text"
                      value={bookData.author}
                      onChange={(e) => handleBookChange('author', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
              </div>

                {/* Cover URL */}
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                    <Image size={12} /> Cover Image URL
                  </label>
                  <input
                    type="text"
                    value={bookData.coverUrl}
                    onChange={(e) => handleBookChange('coverUrl', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                    <FileText size={12} /> Description
                  </label>
                  <textarea
                    value={bookData.description}
                    onChange={(e) => handleBookChange('description', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white min-h-[120px] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                    placeholder="Book description..."
                  />
                </div>

              {/* Genres */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Tag size={12} /> Genres
                </label>
<div className="flex gap-2 mb-2">
  <input
    type="text"
    value={genreInput}
    onChange={(e) => setGenreInput(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && addGenre()}
    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
    placeholder="Add a genre..."
  />
  <button
    onClick={addGenre}
    className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
  >
    Add
  </button>
</div>
<div className="flex flex-wrap gap-2">
  {bookData.genres?.map(genre => (
    <span
      key={genre}
      className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 hover:bg-slate-600 transition-colors"
    >
      {genre}
      <button onClick={() => removeGenre(genre)} className="text-slate-400 hover:text-white">
        <X size={14} />
      </button>
    </span>
  ))}
</div>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Bookmark size={12} /> Format
                </label>
<select
  value={bookData.format}
  onChange={(e) => handleBookChange('format', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
>
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Count */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Hash size={12} /> Page Count
                </label>
<input
  type="number"
  value={bookData.pageCount}
  onChange={(e) => handleBookChange('pageCount', parseInt(e.target.value) || 0)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
  min="0"
/>
              </div>

              {/* Published Year */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Calendar size={12} /> Published Year
                </label>
<input
  type="number"
  value={bookData.publishedYear || ''}
  onChange={(e) => handleBookChange('publishedYear', parseInt(e.target.value) || undefined)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
  min="0"
  placeholder="YYYY"
/>
              </div>

              {/* Publisher */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Building size={12} /> Publisher
                </label>
<input
  type="text"
  value={bookData.publisher}
  onChange={(e) => handleBookChange('publisher', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
/>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Globe size={12} /> Language
                </label>
<input
  type="text"
  value={bookData.language}
  onChange={(e) => handleBookChange('language', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
/>
              </div>
            </div>
          )}

          {/* Library Entry Tab */}
          {activeTab === 'entry' && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <BookOpen size={12} /> Reading Status
                </label>
<select
  value={entryData.status}
  onChange={(e) => handleEntryChange('status', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Star size={12} /> Rating
                </label>
                <div className="flex gap-1">
                  {ratingOptions.map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleEntryChange('rating', rating)}
                      className={`p-2 rounded ${entryData.rating >= rating ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'}`}
                    >
                      {rating % 1 === 0 ? rating : '½'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owned */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="owned"
                  checked={entryData.owned}
                  onChange={(e) => handleEntryChange('owned', e.target.checked)}
                  className="rounded border-white/10 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="owned" className="text-xs text-slate-400 flex items-center gap-1">
                  <BookIcon size={12} /> I own this book
                </label>
              </div>

              {/* Current Page */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Hash size={12} /> Current Page
                </label>
<input
  type="number"
  value={entryData.currentPage}
  onChange={(e) => handleEntryChange('currentPage', parseInt(e.target.value) || 0)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
  min="0"
  max={bookData.pageCount || 1000}
/>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Meh size={12} /> Difficulty (1-5)
                </label>
                <div className="flex gap-1">
                  {difficultyOptions.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleEntryChange('difficulty', level)}
                      className={`px-3 py-2 rounded text-sm ${entryData.difficulty >= level ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotional Impact */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Heart size={12} /> Emotional Impact (1-5)
                </label>
                <div className="flex gap-1">
                  {emotionalImpactOptions.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleEntryChange('emotionalImpact', level)}
                      className={`px-3 py-2 rounded text-sm ${entryData.emotionalImpact >= level ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Would Recommend */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="wouldRecommend"
                  checked={entryData.wouldRecommend}
                  onChange={(e) => handleEntryChange('wouldRecommend', e.target.checked)}
                  className="rounded border-white/10 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="wouldRecommend" className="text-xs text-slate-400 flex items-center gap-1">
                  <Check size={12} /> I would recommend this book
                </label>
              </div>

              {/* Reread Value */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Repeat size={12} /> Reread Value (1-5)
                </label>
                <div className="flex gap-1">
                  {rereadValueOptions.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleEntryChange('rereadValue', level)}
                      className={`px-3 py-2 rounded text-sm ${entryData.rereadValue >= level ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Started */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Calendar size={12} /> Date Started
                </label>
<input
  type="date"
  value={entryData.dateStarted}
  onChange={(e) => handleEntryChange('dateStarted', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
/>
              </div>

              {/* Date Finished */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Calendar size={12} /> Date Finished
                </label>
<input
  type="date"
  value={entryData.dateFinished}
  onChange={(e) => handleEntryChange('dateFinished', e.target.value)}
  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
/>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 text-red-400 text-xs p-2 rounded border border-red-500/30">
            {error}
          </div>
        )}

        {/* Footer */}
<div className="flex justify-end gap-3 pt-4 border-t border-white/10">
  <button
    onClick={onClose}
    className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
  >
    Cancel
  </button>
  <button
    onClick={handleSave}
    disabled={isSaving}
    className="primary px-5 py-2.5 text-sm shadow-md hover:shadow-lg transition-all"
  >
    {isSaving ? 'Saving...' : 'Save Changes'}
  </button>
</div>
      </div>
    </div>
  );
}