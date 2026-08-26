'use server';

import { prisma } from '@/lib/db';
import { assertAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  chatWithLibrary,
  getRecommendations,
  summarizeJournal,
  suggestBookTags,
  suggestNoteTags,
  buildLibraryContext,
} from '@/lib/gemini';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadLibraryContext() {
  const entries = await prisma.libraryEntry.findMany({
    include: { book: true, notes: true, shelves: true },
    orderBy: { updatedAt: 'desc' },
  });

  const notes = await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const userProfile = await prisma.userProfile.findUnique({ where: { id: 'user-default' } });

  return buildLibraryContext({
    entries: entries.map((e) => ({
      id: e.id,
      status: e.status,
      rating: e.rating,
      book: e.book
        ? {
            title: e.book.title,
            author: e.book.author,
            genres: e.book.genres,
            pageCount: e.book.pageCount,
            description: e.book.description,
          }
        : undefined,
    })),
    notes: notes.map((n) => ({
      text: n.text,
      type: n.type,
      libraryEntryId: n.libraryEntryId,
      tags: n.tags,
    })),
    stats: {
      currentStreak: userProfile?.currentStreak ?? 0,
      longestStreak: userProfile?.longestStreak ?? 0,
    },
  });
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function aiChatAction(params: {
  message: string;
  history: { role: 'user' | 'model'; text: string }[];
}): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    await assertAuth();
    const ctx = await loadLibraryContext();
    const reply = await chatWithLibrary(params.history, params.message, ctx);
    return { success: true, reply };
  } catch (error: any) {
    console.error('[aiChatAction] Error:', error);
    return { success: false, error: error.message || 'AI request failed' };
  }
}

// ─── Recommendations ────────────────────────────────────────────────────────

export async function aiRecommendAction(): Promise<{
  success: boolean;
  recommendations?: { title: string; author: string; reason: string; matchPercent: number }[];
  error?: string;
}> {
  try {
    await assertAuth();
    const ctx = await loadLibraryContext();
    const recommendations = await getRecommendations(ctx);
    return { success: true, recommendations };
  } catch (error: any) {
    console.error('[aiRecommendAction] Error:', error);
    return { success: false, error: error.message || 'AI request failed' };
  }
}

// ─── Journal / Notes Summary ────────────────────────────────────────────────

export async function aiSummarizeNotesAction(params: {
  prompt: string;
  noteIds?: string[];
}): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    await assertAuth();

    let notes;
    if (params.noteIds && params.noteIds.length > 0) {
      notes = await prisma.note.findMany({ where: { id: { in: params.noteIds } } });
    } else {
      notes = await prisma.note.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    }

    const entries = await prisma.libraryEntry.findMany({
      include: { book: true },
    });
    const entryMap = new Map(entries.map((e) => [e.id, e]));

    const notesContext = notes.map((n) => {
      const entry = entryMap.get(n.libraryEntryId);
      return {
        text: n.text,
        type: n.type,
        book: entry?.book?.title || 'Unknown',
        tags: n.tags,
      };
    });

    const response = await summarizeJournal(notesContext, params.prompt);
    return { success: true, response };
  } catch (error: any) {
    console.error('[aiSummarizeNotesAction] Error:', error);
    return { success: false, error: error.message || 'AI request failed' };
  }
}

// ─── Auto-Tag Book ──────────────────────────────────────────────────────────

export async function aiTagBookAction(entryId: string): Promise<{
  success: boolean;
  genres?: string[];
  mood?: string[];
  difficulty?: number;
  error?: string;
}> {
  try {
    await assertAuth();

    const entry = await prisma.libraryEntry.findUnique({
      where: { id: entryId },
      include: { book: true },
    });
    if (!entry?.book) return { success: false, error: 'Book not found' };

    const book = entry.book;
    const result = await suggestBookTags(
      book.title,
      book.author,
      book.description || '',
      book.genres,
    );

    return { success: true, ...result };
  } catch (error: any) {
    console.error('[aiTagBookAction] Error:', error);
    return { success: false, error: error.message || 'AI request failed' };
  }
}

// ─── Auto-Tag Note ──────────────────────────────────────────────────────────

export async function aiTagNoteAction(noteId: string): Promise<{
  success: boolean;
  tags?: string[];
  error?: string;
}> {
  try {
    await assertAuth();

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) return { success: false, error: 'Note not found' };

    const entry = await prisma.libraryEntry.findUnique({
      where: { id: note.libraryEntryId },
      include: { book: true },
    });

    const result = await suggestNoteTags(
      note.text,
      entry?.book?.title || 'Unknown',
      entry?.book?.author || 'Unknown',
    );

    return { success: true, tags: result.tags };
  } catch (error: any) {
    console.error('[aiTagNoteAction] Error:', error);
    return { success: false, error: error.message || 'AI request failed' };
  }
}

// ─── Batch Auto-Tag ─────────────────────────────────────────────────────────

export async function aiBatchTagAction(entryIds?: string[]): Promise<{
  success: boolean;
  results?: {
    entryId: string;
    title: string;
    genres: string[];
    mood: string[];
    difficulty: number;
  }[];
  error?: string;
}> {
  try {
    await assertAuth();

    let entriesToTag;
    if (entryIds && entryIds.length > 0) {
      entriesToTag = await prisma.libraryEntry.findMany({
        where: { id: { in: entryIds } },
        include: { book: true },
      });
    } else {
      entriesToTag = await prisma.libraryEntry.findMany({
        include: { book: true },
        orderBy: { updatedAt: 'desc' },
      });
    }

    const results: {
      entryId: string;
      title: string;
      genres: string[];
      mood: string[];
      difficulty: number;
    }[] = [];

    for (const entry of entriesToTag) {
      if (!entry.book) continue;
      try {
        const tags = await suggestBookTags(
          entry.book.title,
          entry.book.author,
          entry.book.description || '',
          entry.book.genres,
        );
        results.push({
          entryId: entry.id,
          title: entry.book.title,
          ...tags,
        });
      } catch {
        results.push({
          entryId: entry.id,
          title: entry.book?.title || 'Unknown',
          genres: entry.book?.genres || [],
          mood: [],
          difficulty: 3,
        });
      }
    }

    return { success: true, results };
  } catch (error: any) {
    console.error('[aiBatchTagAction] Error:', error);
    return { success: false, error: error.message || 'AI request failed' };
  }
}

// ─── Apply Tags (save to DB) ───────────────────────────────────────────────

export async function applyBookTagsAction(
  entryId: string,
  genres: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAuth();
    const entry = await prisma.libraryEntry.findUnique({ where: { id: entryId } });
    if (!entry) return { success: false, error: 'Entry not found' };

    await prisma.book.update({
      where: { id: entry.bookId },
      data: { genres },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[applyBookTagsAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function applyNoteTagsAction(
  noteId: string,
  tags: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAuth();
    await prisma.note.update({
      where: { id: noteId },
      data: { tags },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[applyNoteTagsAction] Error:', error);
    return { success: false, error: error.message };
  }
}
