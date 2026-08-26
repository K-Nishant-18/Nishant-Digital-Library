'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, BookOpen, StickyNote, Tags, Loader2 } from 'lucide-react';
import { aiChatAction, aiRecommendAction, aiSummarizeNotesAction } from '@/lib/ai-actions';
import type { Book, LibraryEntry, Note, ReadingStats } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AiChatPanelProps {
  open: boolean;
  onClose: () => void;
  entries: LibraryEntry[];
  books: Book[];
  notes: Note[];
  stats: ReadingStats;
}

const QUICK_ACTIONS = [
  { label: 'Recommend me a book', icon: BookOpen, action: 'recommend' },
  { label: 'Summarize my notes', icon: StickyNote, action: 'summarize' },
  { label: 'What are my top genres?', icon: Tags, action: 'genres' },
] as const;

export function AiChatPanel({ open, onClose, entries, books, notes, stats }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    try {
      const result = await aiChatAction({ message: text.trim(), history });
      if (result.success && result.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', text: result.reply! }]);
      } else {
        const errMsg = result.error || 'Unknown error';
        const friendly = errMsg.includes('API key')
          ? 'Invalid API key. Please check your GEMINI_API_KEY in .env'
          : errMsg.includes('429') || errMsg.includes('quota')
          ? 'Rate limit reached. Please wait a moment and try again.'
          : `Something went wrong. Please try again.`;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: friendly },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Failed to reach the AI service. Check your GEMINI_API_KEY.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text: QUICK_ACTIONS.find((q) => q.action === action)?.label || action }]);

    try {
      if (action === 'recommend') {
        const result = await aiRecommendAction();
        if (result.success && result.recommendations) {
          const recs = result.recommendations
            .map((r, i) => `${i + 1}. **${r.title}** by ${r.author}\n   ${r.reason} (${r.matchPercent}% match)`)
            .join('\n\n');
          setMessages((prev) => [...prev, { role: 'assistant', text: `Here are some books you might enjoy:\n\n${recs}` }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', text: 'Could not generate recommendations. Please try again.' }]);
        }
      } else if (action === 'summarize') {
        const result = await aiSummarizeNotesAction({ prompt: 'Give me a brief summary of the key themes and ideas across all my notes and highlights.' });
        if (result.success && result.response) {
          setMessages((prev) => [...prev, { role: 'assistant', text: result.response! }]);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', text: 'Could not summarize notes. Please try again.' }]);
        }
      } else if (action === 'genres') {
        await sendMessage('What are my most read genres and which genres should I explore more?');
        return;
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Failed to reach the AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-label="Librarian">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="chat-drawer chat-drawer-in absolute right-0 top-0 bottom-0 w-[420px] max-w-[92vw] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Sparkles size={16} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Librarian</h2>
              <p className="text-[10px] text-slate-400">Your personal reading assistant</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close AI panel">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="space-y-4 pt-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto">
                  <Sparkles size={24} className="text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-white">Hello! I&apos;m your Librarian.</p>
                <p className="text-xs text-slate-400">Ask me about your books, notes, or what to read next.</p>
              </div>
              <div className="space-y-2 pt-2">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.action}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/30 text-left transition-colors group"
                    onClick={() => handleQuickAction(qa.action)}
                  >
                    <qa.icon size={16} className="text-amber-400 group-hover:text-amber-300 shrink-0" />
                    <span className="text-xs text-slate-300 group-hover:text-white">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-black font-medium'
                    : 'bg-slate-900/80 border border-white/5 text-slate-200'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{renderMarkdown(msg.text)}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900/80 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="text-amber-400 animate-spin" />
                <span className="text-xs text-slate-400">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about your books, notes, reading habits..."
              rows={1}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500/50 resize-none max-h-24"
            />
            <button
              className="primary !p-2.5 rounded-xl shrink-0"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();

    // Bold lines: **text**
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      return <div key={i} className="font-bold mt-1">{renderInline(trimmed.slice(2, -2))}</div>;
    }

    // Numbered list: 1. **Title** — reason
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      return (
        <div key={i} className="flex gap-2 ml-1 mb-1">
          <span className="text-amber-400 font-bold text-[11px] shrink-0">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      return (
        <div key={i} className="flex gap-2 ml-1 mb-0.5">
          <span className="text-amber-400 shrink-0">•</span>
          <span>{renderInline(trimmed.slice(2))}</span>
        </div>
      );
    }

    // Section headers: **Header:**
    if (trimmed.match(/^\*\*.*:\*\*$/)) {
      const header = trimmed.slice(2, -3);
      return <div key={i} className="font-bold text-amber-400 text-[11px] uppercase tracking-wider mt-2 mb-1">{header}</div>;
    }

    // Empty line
    if (!trimmed) {
      return <div key={i} className="h-2" />;
    }

    return <div key={i}>{renderInline(trimmed)}</div>;
  });
}

function renderInline(text: string) {
  const parts: (string | React.ReactNode)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
