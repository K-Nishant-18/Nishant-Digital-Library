'use server';

import { prisma } from '@/lib/db';
import { assertAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { Book, LibraryEntry, ReadingSession, Note, Shelf, ReadingGoal, ReadingStats } from '@/lib/types';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatEntry(e: any): LibraryEntry {
  return {
    id: e.id,
    bookId: e.bookId,
    book: e.book ? {
      id: e.book.id,
      title: e.book.title,
      subtitle: e.book.subtitle ?? undefined,
      author: e.book.author,
      coverUrl: e.book.coverUrl ?? undefined,
      coverColor: e.book.coverColor ?? '#b7791f',
      description: e.book.description ?? undefined,
      isbn: e.book.isbn ?? undefined,
      isbn13: e.book.isbn13 ?? undefined,
      genres: e.book.genres ?? [],
      format: (e.book.format as any) ?? 'paperback',
      pageCount: e.book.pageCount,
      publishedYear: e.book.publishedYear ?? undefined,
      publisher: e.book.publisher ?? undefined,
      language: e.book.language ?? undefined,
      openLibraryId: e.book.openLibraryId ?? undefined,
      googleBooksId: e.book.googleBooksId ?? undefined,
      createdAt: e.book.createdAt,
      updatedAt: e.book.updatedAt,
    } : undefined,
    status: e.status as any,
    owned: e.owned,
    rating: e.rating ?? undefined,
    difficulty: e.difficulty ?? undefined,
    emotionalImpact: e.emotionalImpact ?? undefined,
    wouldRecommend: e.wouldRecommend ?? undefined,
    rereadValue: e.rereadValue ?? undefined,
    dateAdded: e.dateAdded,
    dateStarted: e.dateStarted ?? undefined,
    dateFinished: e.dateFinished ?? undefined,
    shelfIds: (e.shelves ?? []).map((s: any) => s.shelfId),
    currentPage: e.currentPage,
    progressPercent: e.progressPercent,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function computeStats(entries: LibraryEntry[], sessions: ReadingSession[], userProfile: any): ReadingStats {
  const readEntries = entries.filter(e => e.status === 'read');
  const booksRead = readEntries.length;
  const pagesRead = readEntries.reduce((acc, e) => acc + (e.book?.pageCount ?? 0), 0);
  const readingTimeMinutes = sessions.reduce((acc, s) => acc + (s.minutes ?? 0), 0);
  const ratings = entries.filter(e => e.rating).map(e => e.rating!);
  const averageRating = ratings.length ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0;

  // Genre distribution from read books
  const genreMap: Record<string, { count: number; pages: number }> = {};
  readEntries.forEach(e => {
    (e.book?.genres ?? []).forEach(genre => {
      if (!genreMap[genre]) genreMap[genre] = { count: 0, pages: 0 };
      genreMap[genre].count++;
      genreMap[genre].pages += e.book?.pageCount ?? 0;
    });
  });
  const totalGenreCount = Object.values(genreMap).reduce((a, b) => a + b.count, 0);
  const genreDistribution = Object.entries(genreMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([genre, data]) => ({
      genre,
      count: data.count,
      pages: data.pages,
      percent: totalGenreCount ? Math.round((data.count / totalGenreCount) * 100) : 0,
    }));

  // Format distribution
  const formatMap: Record<string, number> = {};
  entries.forEach(e => {
    const fmt = e.book?.format ?? 'paperback';
    formatMap[fmt] = (formatMap[fmt] ?? 0) + 1;
  });
  const totalFmt = Object.values(formatMap).reduce((a, b) => a + b, 0);
  const formatDistribution = Object.entries(formatMap).map(([format, count]) => ({
    format: format.charAt(0).toUpperCase() + format.slice(1),
    count,
    percent: totalFmt ? Math.round((count / totalFmt) * 100) : 0,
  }));

  // Rating distribution
  const ratingMap: Record<string, number> = { '5': 0, '4.5': 0, '4': 0, '3.5': 0, '3': 0, '2': 0, '1': 0 };
  entries.forEach(e => {
    if (e.rating) {
      const key = String(e.rating);
      if (ratingMap[key] !== undefined) ratingMap[key]++;
    }
  });
  const ratingDistribution = Object.entries(ratingMap)
    .map(([rating, count]) => ({ rating: parseFloat(rating), count }))
    .sort((a, b) => b.rating - a.rating);

  // Monthly pages from sessions
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyMap: Record<number, { pages: number; books: Set<string> }> = {};
  sessions.forEach(s => {
    const month = new Date(s.startedAt).getMonth();
    if (!monthlyMap[month]) monthlyMap[month] = { pages: 0, books: new Set() };
    const pagesInSession = (s.pageEnd ?? s.pageStart) - s.pageStart;
    monthlyMap[month].pages += Math.max(pagesInSession, 0);
    monthlyMap[month].books.add(s.libraryEntryId);
  });
  readEntries.forEach(e => {
    if (e.dateFinished) {
      const month = new Date(e.dateFinished).getMonth();
      if (!monthlyMap[month]) monthlyMap[month] = { pages: 0, books: new Set() };
      monthlyMap[month].books.add(e.id);
    }
  });
  const monthlyPages = monthNames.map((month, i) => ({
    month,
    pages: monthlyMap[i]?.pages ?? 0,
    books: monthlyMap[i]?.books.size ?? 0,
  }));
  const monthlyBooks = monthNames.map((month, i) => ({
    month,
    count: monthlyMap[i]?.books.size ?? 0,
  }));

  // Heatmap: last 90 days of session activity
  const heatmapMap: Record<string, number> = {};
  sessions.forEach(s => {
    const dateStr = new Date(s.startedAt).toISOString().split('T')[0];
    heatmapMap[dateStr] = (heatmapMap[dateStr] ?? 0) + (s.minutes ?? 0);
  });
  const heatmapData = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (89 - i));
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, minutes: heatmapMap[dateStr] ?? 0 };
  });

  // Longest/shortest read books
  const readBooksWithPages = readEntries.filter(e => e.book?.pageCount).map(e => ({ title: e.book!.title, pages: e.book!.pageCount }));
  const longestBook = readBooksWithPages.sort((a, b) => b.pages - a.pages)[0];
  const shortestBook = readBooksWithPages.sort((a, b) => a.pages - b.pages)[0];

  // Books this year
  const thisYear = now.getFullYear();
  const booksThisYear = readEntries.filter(e => e.dateFinished && new Date(e.dateFinished).getFullYear() === thisYear).length;
  const pagesThisYear = readEntries
    .filter(e => e.dateFinished && new Date(e.dateFinished).getFullYear() === thisYear)
    .reduce((acc, e) => acc + (e.book?.pageCount ?? 0), 0);

  // Most productive month
  const mostProductiveMonth = monthlyBooks.reduce((best, curr) =>
    curr.count > (best?.count ?? 0) ? curr : best
    , { month: 'January', count: 0 });

  return {
    booksRead,
    pagesRead,
    readingTimeMinutes,
    averageRating,
    longestStreak: userProfile?.longestStreak ?? 0,
    currentStreak: userProfile?.currentStreak ?? 0,
    booksThisYear,
    pagesThisYear,
    averagePagesPerDay: sessions.length ? Math.round(pagesRead / 30) : 0,
    averagePagesPerHour: readingTimeMinutes ? Math.round((pagesRead / readingTimeMinutes) * 60) : 0,
    averageBooksPerMonth: Math.round(booksRead / 12),
    longestBook: longestBook ?? undefined,
    shortestBook: shortestBook ?? undefined,
    mostProductiveMonth: { month: mostProductiveMonth.month, books: mostProductiveMonth.count, pages: monthlyPages.find(m => m.month === mostProductiveMonth.month)?.pages ?? 0 },
    genreDistribution,
    formatDistribution,
    ratingDistribution,
    monthlyPages,
    monthlyBooks,
    heatmapData,
    topAuthors: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// READ: Fetch all library data
// ──────────────────────────────────────────────────────────────────────────────

export async function getLibraryData() {
  try {
    await assertAuth();
    // 1. User Profile
    let userProfile = await prisma.userProfile.findUnique({ where: { id: 'user-default' } });
    if (!userProfile) {
      userProfile = await prisma.userProfile.create({
        data: { id: 'user-default', name: 'Kumar Nishant', email: 'kumar.nishant@devreader.com', bio: 'Software engineer by day, voracious reader by night.', level: 15, currentStreak: 0, longestStreak: 0, targetBooks: 60, dailyMinutesGoal: 45 },
      });
    }

    // 2. Reading Goal
    let goal = await prisma.readingGoal.findUnique({ where: { year: new Date().getFullYear() } });
    if (!goal) {
      goal = await prisma.readingGoal.create({ data: { year: new Date().getFullYear(), targetBooks: 60, targetPages: 18000, targetMinutes: 12000 } });
    }

    // 3. Shelves
    const rawShelves = await prisma.shelf.findMany({ include: { entries: true }, orderBy: { createdAt: 'asc' } });

    // 4. Library entries with full relations
    const rawEntries = await prisma.libraryEntry.findMany({
      include: { book: true, sessions: { orderBy: { startedAt: 'desc' } }, notes: { orderBy: { createdAt: 'desc' } }, shelves: true },
      orderBy: { updatedAt: 'desc' },
    });

    const entries: LibraryEntry[] = rawEntries.map(formatEntry);
    const books: Book[] = entries.map(e => e.book!).filter(Boolean);

    // Flag which entries have an EPUB/PDF uploaded for the in-app reader
    const readerFiles = await prisma.bookFile.findMany({ select: { libraryEntryId: true, format: true } });
    const fileFormats = new Map(readerFiles.map(f => [f.libraryEntryId, f.format]));
    for (const entry of entries) {
      const fmt = fileFormats.get(entry.id);
      if (fmt) {
        entry.hasReaderFile = true;
        entry.readerFormat = fmt as 'epub' | 'pdf';
      }
    }

    const sessions: ReadingSession[] = rawEntries.flatMap(e =>
      e.sessions.map(s => ({
        id: s.id, libraryEntryId: s.libraryEntryId, startedAt: s.startedAt,
        endedAt: s.endedAt ?? undefined, pageStart: s.pageStart, pageEnd: s.pageEnd ?? undefined,
        minutes: s.minutes ?? undefined, mood: (s.mood as any) ?? undefined,
        notes: s.notes ?? undefined, createdAt: s.createdAt,
      }))
    );

    const notes: Note[] = rawEntries.flatMap(e =>
      e.notes.map(n => ({
        id: n.id, libraryEntryId: n.libraryEntryId, type: n.type as any,
        text: n.text, page: n.page ?? undefined, chapter: n.chapter ?? undefined,
        tags: n.tags, isFavorite: n.isFavorite, createdAt: n.createdAt, updatedAt: n.updatedAt,
      }))
    );

    const shelves: Shelf[] = rawShelves.map(s => ({
      id: s.id, name: s.name, description: s.description ?? undefined,
      bookIds: s.entries.map(e => e.libraryEntryId),
      isDefault: s.isDefault, color: s.color ?? undefined, icon: s.icon ?? undefined,
      createdAt: s.createdAt, updatedAt: s.updatedAt,
    }));

    // Ensure default "All Books" shelf exists
    if (shelves.length === 0) {
      const defaultShelf = await prisma.shelf.create({ data: { name: 'All Books', isDefault: true } });
      shelves.push({ id: defaultShelf.id, name: 'All Books', bookIds: entries.map(e => e.id), isDefault: true, createdAt: defaultShelf.createdAt, updatedAt: defaultShelf.updatedAt });
    }

    const stats = computeStats(entries, sessions, userProfile);

    return {
      success: true,
      userProfile,
      goal: { id: goal.id, year: goal.year, targetBooks: goal.targetBooks, targetPages: goal.targetPages, targetMinutes: goal.targetMinutes ?? undefined, createdAt: goal.createdAt, updatedAt: goal.updatedAt } as ReadingGoal,
      shelves,
      entries,
      books,
      sessions,
      notes,
      stats,
    };
  } catch (error: any) {
    console.error('[getLibraryData] Error:', error);
    return { success: false as const, error: error.message, userProfile: undefined, goal: undefined, shelves: [], entries: [], books: [], sessions: [], notes: [], stats: undefined };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// BOOKS: Add / Delete / Update
// ──────────────────────────────────────────────────────────────────────────────

export async function addBookToLibraryAction(book: Partial<Book>, status: 'tbr' | 'reading' | 'read' = 'tbr') {
  try {
    await assertAuth();
    const newBook = await prisma.book.create({
      data: {
        title: book.title || 'Untitled',
        subtitle: book.subtitle,
        author: book.author || 'Unknown Author',
        coverUrl: book.coverUrl,
        coverColor: book.coverColor || '#b7791f',
        description: book.description,
        isbn: book.isbn,
        isbn13: book.isbn13,
        genres: book.genres ?? [],
        format: book.format ?? 'paperback',
        pageCount: book.pageCount ?? 300,
        publishedYear: book.publishedYear,
        publisher: book.publisher,
        language: book.language ?? 'en',
        openLibraryId: book.openLibraryId,
        googleBooksId: book.googleBooksId,
      },
    });

    const newEntry = await prisma.libraryEntry.create({
      data: {
        bookId: newBook.id, status, owned: true,
        currentPage: status === 'read' ? newBook.pageCount : 0,
        progressPercent: status === 'read' ? 100 : 0,
        dateStarted: status === 'reading' ? new Date() : undefined,
        dateFinished: status === 'read' ? new Date() : undefined,
      },
    });

    // Add to default shelf
    const defaultShelf = await prisma.shelf.findFirst({ where: { isDefault: true } });
    if (defaultShelf) {
      await prisma.shelfOnEntry.create({ data: { shelfId: defaultShelf.id, libraryEntryId: newEntry.id } });
    }

    // Award XP
    await prisma.userProfile.update({ where: { id: 'user-default' }, data: { xpCurrent: { increment: 50 } } });

    revalidatePath('/');
    return { success: true, bookId: newBook.id, entryId: newEntry.id };
  } catch (error: any) {
    console.error('[addBookToLibraryAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBookAction(entryId: string) {
  try {
    await assertAuth();
    const entry = await prisma.libraryEntry.findUnique({ where: { id: entryId } });
    if (!entry) return { success: false, error: 'Entry not found' };

    await prisma.libraryEntry.delete({ where: { id: entryId } });
    await prisma.book.delete({ where: { id: entry.bookId } }).catch(() => {}); // may cascade

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteBookAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// NEW: Update book details
export async function updateBookAction(bookId: string, bookData: Partial<Book>) {
  try {
    await assertAuth();
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        title: bookData.title,
        subtitle: bookData.subtitle,
        author: bookData.author,
        coverUrl: bookData.coverUrl,
        coverColor: bookData.coverColor,
        description: bookData.description,
        isbn: bookData.isbn,
        isbn13: bookData.isbn13,
        genres: bookData.genres,
        format: bookData.format,
        pageCount: bookData.pageCount,
        publishedYear: bookData.publishedYear,
        publisher: bookData.publisher,
        language: bookData.language,
        openLibraryId: bookData.openLibraryId,
        googleBooksId: bookData.googleBooksId,
      },
    });

    // Update the associated entry's progress if pageCount changed
    if (bookData.pageCount) {
      const entries = await prisma.libraryEntry.findMany({ where: { bookId } });
      for (const entry of entries) {
        const progressPercent = Math.min(100, Math.round((entry.currentPage / bookData.pageCount) * 100));
        await prisma.libraryEntry.update({
          where: { id: entry.id },
          data: { progressPercent },
        });
      }
    }

    revalidatePath('/');
    return { success: true, book: updatedBook };
  } catch (error: any) {
    console.error('[updateBookAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// READER: file upload, progress, highlights
// ──────────────────────────────────────────────────────────────────────────────

const MAX_READER_FILE_BYTES = 30 * 1024 * 1024; // 30MB

export async function uploadReaderFileAction(entryId: string, formData: FormData) {
  try {
    await assertAuth();
    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: 'No file provided' };
    if (file.size > MAX_READER_FILE_BYTES) {
      return { success: false, error: 'File too large (max 30MB)' };
    }

    const name = file.name.toLowerCase();
    const format = name.endsWith('.epub') ? 'epub' : name.endsWith('.pdf') ? 'pdf' : null;
    if (!format) return { success: false, error: 'Only .epub or .pdf files are supported' };

    const buffer = Buffer.from(await file.arrayBuffer());

    await prisma.bookFile.upsert({
      where: { libraryEntryId: entryId },
      create: { libraryEntryId: entryId, format, fileName: file.name, sizeBytes: file.size, data: buffer },
      update: { format, fileName: file.name, sizeBytes: file.size, data: buffer },
    });

    revalidatePath('/');
    return { success: true as const, format };
  } catch (error: any) {
    console.error('[uploadReaderFileAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteReaderFileAction(entryId: string) {
  try {
    await assertAuth();
    await prisma.bookFile.delete({ where: { libraryEntryId: entryId } }).catch(() => {});
    await prisma.readerProgress.delete({ where: { libraryEntryId: entryId } }).catch(() => {});
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getReaderDataAction(entryId: string) {
  try {
    await assertAuth();
    const [file, progress] = await Promise.all([
      prisma.bookFile.findUnique({ where: { libraryEntryId: entryId }, select: { format: true, sizeBytes: true, fileName: true } }),
      prisma.readerProgress.findUnique({ where: { libraryEntryId: entryId } }),
    ]);
    if (!file) return { success: true as const, hasFile: false as const, annotations: [], progress: null };

    const highlights = await prisma.readerHighlight.findMany({
      where: { libraryEntryId: entryId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true as const,
      hasFile: true as const,
      format: file.format as 'epub' | 'pdf',
      fileName: file.fileName ?? undefined,
      progress: progress ? { cfi: progress.cfi ?? undefined, percent: progress.percent ?? undefined, page: progress.page ?? undefined } : null,
      annotations: highlights.map(h => ({
        id: h.id,
        kind: h.kind as 'highlight' | 'note',
        text: h.text,
        note: h.note ?? undefined,
        cfi: h.cfi ?? undefined,
        page: h.page ?? undefined,
        rects: h.rects ? JSON.parse(h.rects) : undefined,
      })),
    };
  } catch (error: any) {
    console.error('[getReaderDataAction] Error:', error);
    return { success: false as const, error: error.message, hasFile: false as const, annotations: [], progress: null };
  }
}

export async function saveReaderProgressAction(
  entryId: string,
  data: { cfi?: string; percent?: number; page?: number }
) {
  try {
    await assertAuth();

    // Keep the dashboard's manual-tracking fields in sync with real reading position
    const entry = await prisma.libraryEntry.findUnique({ where: { id: entryId }, include: { book: { select: { pageCount: true } } } });
    if (entry && (data.page !== undefined || data.percent !== undefined)) {
      const totalPages = entry.book?.pageCount || 0;
      const currentPage = data.page ?? (data.percent !== undefined && totalPages > 0 ? Math.round((data.percent / 100) * totalPages) : undefined);
      if (currentPage !== undefined && currentPage > entry.currentPage) {
        const progressPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
        await prisma.libraryEntry.update({
          where: { id: entryId },
          data: { currentPage, progressPercent, ...(entry.status === 'tbr' && { status: 'reading', dateStarted: new Date() }) },
        });
      }
    }

    await prisma.readerProgress.upsert({
      where: { libraryEntryId: entryId },
      create: { libraryEntryId: entryId, ...data },
      update: { ...data, updatedAt: new Date() },
    });
    return { success: true as const };
  } catch (error: any) {
    console.error('[saveReaderProgressAction] Error:', error);
    return { success: false as const, error: error.message };
  }
}

/**
 * Called by the in-app reader when a reading stint ends (close, tab hidden,
 * periodic checkpoint). Creates a REAL ReadingSession so pages, time, streaks,
 * XP and analytics all update exactly like manual logging.
 */
export async function flushReaderSessionAction(
  entryId: string,
  data: {
    minutes?: number;         // active seconds/60 spent reading this stint
    pagesRead?: number;       // distinct pages viewed / estimated pages turned
    cfi?: string;             // latest EPUB position
    percent?: number;         // latest EPUB percent
    page?: number;            // latest PDF page
    completed?: boolean;      // client says the book was read to the end
  }
) {
  try {
    await assertAuth();
    const minutes = Math.max(0, Math.round(data.minutes ?? 0));
    const pagesRead = Math.max(0, Math.round(data.pagesRead ?? 0));

    // Always persist resume position even if the stint was tiny
    if (data.cfi || data.percent !== undefined || data.page !== undefined) {
      await prisma.readerProgress.upsert({
        where: { libraryEntryId: entryId },
        create: { libraryEntryId: entryId, cfi: data.cfi, percent: data.percent, page: data.page },
        update: { cfi: data.cfi, percent: data.percent, page: data.page, updatedAt: new Date() },
      });
    }

    const entry = await prisma.libraryEntry.findUnique({ where: { id: entryId }, include: { book: true } });
    if (!entry) return { success: false as const, error: 'Entry not found' };

    const totalPages = entry.book.pageCount || 300;
    const reachedPage =
      data.page ??
      (data.percent !== undefined && totalPages > 0 ? Math.ceil((data.percent / 100) * totalPages) : undefined);

    const furthest = Math.max(entry.currentPage, reachedPage ?? 0);
    const isFinished = furthest >= totalPages || !!data.completed;

    // Only create a session when something actually happened
    const shouldLogSession = minutes >= 1 || pagesRead >= 1 || isFinished;

    // Streak counts once per day regardless of how many flushes happen
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const alreadyCountedToday = await prisma.readingSession.findFirst({
      where: { startedAt: { gte: startOfToday } },
      select: { id: true },
    });

    if (shouldLogSession) {
      await prisma.readingSession.create({
        data: {
          libraryEntryId: entryId,
          pageStart: entry.currentPage,
          pageEnd: isFinished ? totalPages : Math.max(furthest, entry.currentPage + pagesRead),
          minutes: minutes || (pagesRead > 0 ? 1 : 0),
          notes: 'Auto-logged from in-app reader',
          startedAt: new Date(),
        },
      });

      const progressPercent = Math.min(100, Math.round(((isFinished ? totalPages : furthest) / totalPages) * 100));
      await prisma.libraryEntry.update({
        where: { id: entryId },
        data: {
          currentPage: isFinished ? totalPages : Math.max(furthest, entry.currentPage),
          progressPercent,
          status: isFinished ? 'read' : entry.status === 'read' ? 'read' : 'reading',
          dateStarted: entry.dateStarted ?? new Date(),
          dateFinished: isFinished && !entry.dateFinished ? new Date() : entry.dateFinished,
        },
      });

      // XP — same formula as manual logging (+ completion bonus)
      const profile = await prisma.userProfile.findUnique({ where: { id: 'user-default' } });
      const xpGain = minutes * 2 + pagesRead + (isFinished ? 500 : 0);

      let streakData: any = {};
      if (!alreadyCountedToday) {
        const newStreak = (profile?.currentStreak ?? 0) + 1;
        streakData = { currentStreak: newStreak, longestStreak: Math.max(profile?.longestStreak ?? 0, newStreak) };
      } else if ((profile?.currentStreak ?? 0) === 0) {
        streakData = { currentStreak: 1, longestStreak: Math.max(profile?.longestStreak ?? 0, 1) };
      }

      await prisma.userProfile.update({
        where: { id: 'user-default' },
        data: { xpCurrent: { increment: xpGain }, ...streakData },
      });
    }

    revalidatePath('/');
    return { success: true as const, isFinished };
  } catch (error: any) {
    console.error('[flushReaderSessionAction] Error:', error);
    return { success: false as const, error: error.message };
  }
}

export async function addReaderHighlightAction(input: {
  libraryEntryId: string;
  kind?: 'highlight' | 'note';
  text?: string;
  note?: string;
  cfi?: string;
  page?: number;
  rects?: { pctX: number; pctY: number; pctW: number; pctH: number }[];
}) {
  try {
    await assertAuth();
    const created = await prisma.readerHighlight.create({
      data: {
        libraryEntryId: input.libraryEntryId,
        kind: input.kind ?? 'highlight',
        text: input.text?.slice(0, 4000) ?? '',
        note: input.note,
        cfi: input.cfi,
        page: input.page,
        rects: input.rects ? JSON.stringify(input.rects) : undefined,
      },
    });

    // Mirror into the Journal (Note) so it appears in Notes & Quotes + search
    const passage = input.text?.slice(0, 2000) ?? '';
    const journalText =
      input.kind === 'note' && input.note
        ? `${input.note}\n\n“${passage}”`
        : passage;
    const mirrored = await prisma.note.create({
      data: {
        libraryEntryId: input.libraryEntryId,
        type: input.kind === 'note' ? 'note' : 'highlight',
        text: journalText,
        page: input.page,
        tags: ['reader'],
      },
    });
    await prisma.readerHighlight.update({ where: { id: created.id }, data: { noteId: mirrored.id } });

    return { success: true as const, id: created.id, noteId: mirrored.id };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function updateReaderHighlightAction(id: string, note: string) {
  try {
    await assertAuth();
    const existing = await prisma.readerHighlight.findUnique({ where: { id } });
    if (!existing) return { success: false as const, error: 'Not found' };

    await prisma.readerHighlight.update({ where: { id }, data: { note, kind: 'note' } });

    // Keep the mirrored Journal note in sync
    if (existing.noteId) {
      const body = note.trim();
      const text = existing.text ? `“${existing.text.slice(0, 2000)}”` : '';
      const journalText = body ? (text ? `${body}\n\n${text}` : body) : text;
      await prisma.note.update({ where: { id: existing.noteId }, data: { text: journalText || '(note)' } }).catch(() => {});
    } else {
      const mirrored = await prisma.note.create({
        data: {
          libraryEntryId: existing.libraryEntryId,
          type: 'note',
          text: `${note.trim()}\n\n“${existing.text.slice(0, 2000)}”`,
          page: existing.page ?? undefined,
          tags: ['reader'],
        },
      });
      await prisma.readerHighlight.update({ where: { id }, data: { noteId: mirrored.id } });
    }

    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function deleteReaderHighlightAction(id: string) {
  try {
    await assertAuth();
    const existing = await prisma.readerHighlight.findUnique({ where: { id } });
    if (existing?.noteId) {
      await prisma.note.delete({ where: { id: existing.noteId } }).catch(() => {});
    }
    await prisma.readerHighlight.delete({ where: { id } });
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// LIBRARY ENTRY: Update status, rating, owned
// ──────────────────────────────────────────────────────────────────────────────

export async function updateLibraryEntryAction({
  entryId, status, rating, owned, currentPage, difficulty, emotionalImpact, wouldRecommend, rereadValue, dateStarted, dateFinished,
}: {
  entryId: string;
  status?: 'tbr' | 'reading' | 'read' | 'dnf';
  rating?: number;
  owned?: boolean;
  currentPage?: number;
  difficulty?: number;
  emotionalImpact?: number;
  wouldRecommend?: boolean;
  rereadValue?: number;
  dateStarted?: Date;
  dateFinished?: Date;
}) {
  try {
    await assertAuth();
    const entry = await prisma.libraryEntry.findUnique({ where: { id: entryId }, include: { book: true } });
    if (!entry) return { success: false, error: 'Entry not found' };

    const totalPages = entry.book.pageCount || 300;
    const newPage = currentPage ?? entry.currentPage;
    const progressPercent = Math.min(100, Math.round((newPage / totalPages) * 100));

    await prisma.libraryEntry.update({
      where: { id: entryId },
      data: {
        ...(status && { status }),
        ...(rating !== undefined && { rating }),
        ...(owned !== undefined && { owned }),
        ...(currentPage !== undefined && { currentPage, progressPercent }),
        ...(difficulty !== undefined && { difficulty }),
        ...(emotionalImpact !== undefined && { emotionalImpact }),
        ...(wouldRecommend !== undefined && { wouldRecommend }),
        ...(rereadValue !== undefined && { rereadValue }),
        ...(dateStarted !== undefined && { dateStarted }),
        ...(dateFinished !== undefined && { dateFinished }),
        ...(status === 'reading' && !entry.dateStarted && !dateStarted && { dateStarted: new Date() }),
        ...(status === 'read' && !dateFinished && { dateFinished: new Date(), currentPage: totalPages, progressPercent: 100 }),
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[updateLibraryEntryAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// READING SESSIONS: Log session
// ──────────────────────────────────────────────────────────────────────────────

export async function logReadingSessionAction({
  libraryEntryId, currentPage, minutes, mood, notes,
}: {
  libraryEntryId: string;
  currentPage: number;
  minutes: number;
  mood?: string;
  notes?: string;
}) {
  try {
    await assertAuth();
    const entry = await prisma.libraryEntry.findUnique({ where: { id: libraryEntryId }, include: { book: true } });
    if (!entry) return { success: false, error: 'Library entry not found' };

    const pageStart = entry.currentPage;
    const totalPages = entry.book.pageCount || 300;
    const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));
    const isFinished = currentPage >= totalPages;

    await prisma.readingSession.create({
      data: { libraryEntryId, pageStart, pageEnd: currentPage, minutes, mood, notes, startedAt: new Date() },
    });

    await prisma.libraryEntry.update({
      where: { id: libraryEntryId },
      data: {
        currentPage, progressPercent,
        status: isFinished ? 'read' : 'reading',
        dateStarted: entry.dateStarted ?? new Date(),
        dateFinished: isFinished ? new Date() : entry.dateFinished,
      },
    });

    // Award XP + update streak
    const today = new Date().toDateString();
    const profile = await prisma.userProfile.findUnique({ where: { id: 'user-default' } });
    const xpGain = Math.round(minutes * 2) + (isFinished ? 500 : 0);
    const newStreak = (profile?.currentStreak ?? 0) + 1;
    const longestStreak = Math.max(profile?.longestStreak ?? 0, newStreak);

    await prisma.userProfile.update({
      where: { id: 'user-default' },
      data: { xpCurrent: { increment: xpGain }, currentStreak: newStreak, longestStreak },
    });

    revalidatePath('/');
    return { success: true, progressPercent, isFinished, xpGained: xpGain };
  } catch (error: any) {
    console.error('[logReadingSessionAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// NOTES: Add / Delete / Toggle Favorite
// ──────────────────────────────────────────────────────────────────────────────

export async function addNoteAction({
  libraryEntryId, type, text, page, tags,
}: {
  libraryEntryId: string;
  type: 'note' | 'quote' | 'reflection' | 'highlight';
  text: string;
  page?: number;
  tags?: string[];
}) {
  try {
    await assertAuth();
    const note = await prisma.note.create({
      data: { libraryEntryId, type, text, page, tags: tags ?? [], isFavorite: false },
    });

    await prisma.userProfile.update({ where: { id: 'user-default' }, data: { xpCurrent: { increment: 25 } } });

    revalidatePath('/');
    return { success: true, noteId: note.id };
  } catch (error: any) {
    console.error('[addNoteAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function searchNotesAction(query: string) {
  try {
    await assertAuth();
    const q = query.trim();
    if (q.length < 2) return { success: true as const, notes: [] };

    const rows = await prisma.note.findMany({
      where: { text: { contains: q, mode: 'insensitive' } },
      include: { libraryEntry: { include: { book: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      success: true as const,
      notes: rows.map(r => ({
        id: r.id,
        text: r.text,
        type: r.type as string,
        page: r.page ?? undefined,
        createdAt: r.createdAt,
        bookTitle: r.libraryEntry?.book?.title || 'Unknown book',
      })),
    };
  } catch (error: any) {
    console.error('[searchNotesAction] Error:', error);
    return { success: false as const, error: error.message, notes: [] };
  }
}

export async function deleteNoteAction(noteId: string) {
  try {
    await assertAuth();
    await prisma.note.delete({ where: { id: noteId } });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteNoteAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleNoteFavoriteAction(noteId: string, isFavorite: boolean) {
  try {
    await assertAuth();
    await prisma.note.update({ where: { id: noteId }, data: { isFavorite } });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[toggleNoteFavoriteAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// NEW: Update note
export async function updateNoteAction({
  noteId,
  text,
  page,
  chapter,
  tags,
  type,
}: {
  noteId: string;
  text?: string;
  page?: number;
  chapter?: number;
  tags?: string[];
  type?: 'note' | 'quote' | 'reflection' | 'highlight';
}) {
  try {
    await assertAuth();
    await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(text !== undefined && { text }),
        ...(page !== undefined && { page }),
        ...(chapter !== undefined && { chapter }),
        ...(tags !== undefined && { tags }),
        ...(type !== undefined && { type }),
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[updateNoteAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SHELVES: Add shelf, add book to shelf
// ──────────────────────────────────────────────────────────────────────────────

export async function addShelfAction({ name, description, color }: { name: string; description?: string; color?: string }) {
  try {
    await assertAuth();
    const shelf = await prisma.shelf.create({ data: { name, description, color, isDefault: false } });
    revalidatePath('/');
    return { success: true, shelfId: shelf.id };
  } catch (error: any) {
    console.error('[addShelfAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function addBookToShelfAction(shelfId: string, libraryEntryId: string) {
  try {
    await assertAuth();
    await prisma.shelfOnEntry.upsert({
      where: { shelfId_libraryEntryId: { shelfId, libraryEntryId } },
      update: {},
      create: { shelfId, libraryEntryId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[addBookToShelfAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// NEW: Remove book from shelf
export async function removeBookFromShelfAction(shelfId: string, libraryEntryId: string) {
  try {
    await assertAuth();
    await prisma.shelfOnEntry.delete({
      where: { shelfId_libraryEntryId: { shelfId, libraryEntryId } },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[removeBookFromShelfAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// NEW: Delete shelf
export async function deleteShelfAction(shelfId: string) {
  try {
    await assertAuth();
    await prisma.shelf.delete({ where: { id: shelfId } });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteShelfAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// NEW: Update shelf
export async function updateShelfAction({
  shelfId,
  name,
  description,
  color,
  icon,
}: {
  shelfId: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  try {
    await assertAuth();
    await prisma.shelf.update({
      where: { id: shelfId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[updateShelfAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PROFILE & GOALS: Update
// ──────────────────────────────────────────────────────────────────────────────

export async function updateProfileAction({
  name, bio, location, website, dailyMinutesGoal,
}: {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  dailyMinutesGoal?: number;
}) {
  try {
    await assertAuth();
    await prisma.userProfile.update({
      where: { id: 'user-default' },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(dailyMinutesGoal !== undefined && { dailyMinutesGoal }),
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[updateProfileAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateGoalsAction({
  targetBooks, targetPages, year,
}: {
  targetBooks: number;
  targetPages?: number;
  year?: number;
}) {
  try {
    await assertAuth();
    const goalYear = year ?? new Date().getFullYear();
    await prisma.readingGoal.upsert({
      where: { year: goalYear },
      update: { targetBooks, ...(targetPages && { targetPages }) },
      create: { year: goalYear, targetBooks, targetPages: targetPages ?? targetBooks * 300 },
    });
    await prisma.userProfile.update({ where: { id: 'user-default' }, data: { targetBooks } });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[updateGoalsAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// Keep old name for compatibility
export const updateProfileGoalsAction = updateProfileAction;