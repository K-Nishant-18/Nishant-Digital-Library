'use client';

import { useState } from 'react';
import { 
  Bookmark, Search, Plus, Tag, Heart, MessageSquare, Quote, Highlighter as Highlight, 
  ChevronRight, Filter, BookOpen, Share2, Copy, Check
} from 'lucide-react';
import { mockNotes, mockBooks, mockTags } from '@/lib/data';
import type { Note, Book } from '@/lib/types';
import { format } from 'date-fns';

interface NotesJournalProps {
  onAddNote: () => void;
  activeTab?: string;
  notes?: Note[];
  books?: Book[];
}

export function NotesJournalView({ 
  onAddNote, 
  activeTab = 'Notes & Quotes',
  notes: dbNotes,
  books: dbBooks,
}: NotesJournalProps) {
  const notes = dbNotes || mockNotes;
  const books = dbBooks || mockBooks;

  const [searchQuery, setSearchQuery] = useState('');
  
  // Map parent activeTab to type filter
  const initialType = activeTab === 'Reflections' ? 'reflection' : activeTab === 'Chapter Logs' ? 'note' : 'all';
  const [activeType, setActiveType] = useState<string>(initialType);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (note.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = activeType === 'all' || note.type === activeType;
    const matchesTag = !selectedTag || (note.tags || []).includes(selectedTag);
    return matchesSearch && matchesType && matchesTag;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Journal & Knowledge Base</div>
          <h1 className="text-2xl font-bold text-white">Notes & Quotes</h1>
          <p className="text-sm text-slate-400">Lines, reflections, and ideas captured during your reading journeys.</p>
        </div>

        <button className="primary" onClick={onAddNote}>
          <Plus size={16} /> New Entry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-white/5">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search notes, quotes, or tags..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Type Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['all', 'quote', 'note', 'reflection', 'highlight'].map(type => (
            <button
              key={type}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                activeType === type 
                  ? 'bg-amber-500 text-black' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveType(type)}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Notes Cards + Tags Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Notes Grid */}
        <div className="lg:col-span-3 space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="panel text-center py-12 space-y-3">
              <Quote size={32} className="mx-auto text-slate-600" />
              <h3 className="text-white font-semibold">No entries match your search</h3>
              <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map(note => {
                const book = books.find(b => b.id === note.libraryEntryId) || books[0];
                return (
                  <div key={note.id} className="panel space-y-3 relative group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                        note.type === 'quote' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        note.type === 'reflection' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {note.type}
                      </span>

                      <div className="flex items-center gap-2 text-slate-400">
                        {note.page && <span>Page {note.page}</span>}
                        <button 
                          onClick={() => copyToClipboard(note.text, note.id)} 
                          className="hover:text-amber-400 transition-colors"
                          title="Copy text"
                        >
                          {copiedId === note.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <p className={`text-sm text-slate-200 leading-relaxed font-sans ${note.type === 'quote' ? 'italic font-serif text-amber-100/90 text-base' : ''}`}>
                      {note.type === 'quote' ? `“${note.text}”` : note.text}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <BookOpen size={13} className="text-amber-500" />
                        <span className="font-medium text-slate-300 truncate max-w-[160px]">{book?.title || 'My Library Book'}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(note.tags || []).map(t => (
                          <span key={t} className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Tags & Filters */}
        <aside className="space-y-6">
          <section className="panel space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={15} className="text-amber-500" /> Popular Tags
              </h2>
              {selectedTag && (
                <button onClick={() => setSelectedTag(null)} className="text-[11px] text-amber-500 hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {mockTags.map(tag => (
                <button
                  key={tag.id}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    selectedTag === tag.name 
                      ? 'bg-amber-500 text-black font-semibold' 
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                  onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                >
                  #{tag.name} <span className="text-[10px] opacity-70">({tag.usageCount})</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel space-y-3 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <h2 className="text-sm font-bold text-amber-400">Knowledge Collector</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Export your quotes and reflections formatted for Notion, Obsidian, or Markdown journals anytime.
            </p>
            <button className="outline-button w-full text-xs" onClick={() => alert('Exporting notes to Markdown CSV...')}>
              Export All Notes (CSV/MD)
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}