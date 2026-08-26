import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const MODEL = 'gemini-3.6-flash';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LibraryContext {
  totalBooks: number;
  booksRead: number;
  currentlyReading: string[];
  tbr: string[];
  genres: string[];
  avgRating: number;
  favoriteGenres: string[];
  topBooks: { title: string; author: string; rating?: number }[];
  recentNotes: { text: string; type: string; book: string }[];
  stats: string;
}

interface Recommendation {
  title: string;
  author: string;
  reason: string;
  matchPercent: number;
}

interface BookTags {
  genres: string[];
  mood: string[];
  difficulty: number;
}

interface NoteTags {
  tags: string[];
}

// ─── Context Builder ────────────────────────────────────────────────────────

export function buildLibraryContext(data: any): LibraryContext {
  const entries = data.entries || [];
  const books = data.books || [];
  const notes = data.notes || [];

  const readEntries = entries.filter((e: any) => e.status === 'read');
  const readingEntries = entries.filter((e: any) => e.status === 'reading');
  const tbrEntries = entries.filter((e: any) => e.status === 'tbr');

  const genreCounts: Record<string, number> = {};
  readEntries.forEach((e: any) => {
    (e.book?.genres || []).forEach((g: string) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  const favoriteGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const ratings = entries.filter((e: any) => e.rating).map((e: any) => e.rating);
  const avgRating = ratings.length
    ? parseFloat((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1))
    : 0;

  const topBooks = readEntries
    .filter((e: any) => e.rating && e.rating >= 4)
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10)
    .map((e: any) => ({
      title: e.book?.title || 'Unknown',
      author: e.book?.author || 'Unknown',
      rating: e.rating,
    }));

  const recentNotes = notes
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((n: any) => ({
      text: n.text,
      type: n.type,
      book: entries.find((e: any) => e.id === n.libraryEntryId)?.book?.title || 'Unknown',
    }));

  return {
    totalBooks: entries.length,
    booksRead: readEntries.length,
    currentlyReading: readingEntries.map((e: any) => e.book?.title || 'Unknown'),
    tbr: tbrEntries.map((e: any) => e.book?.title || 'Unknown'),
    genres: Array.from(new Set<string>(entries.flatMap((e: any) => (e.book?.genres as string[]) || []))),
    avgRating,
    favoriteGenres,
    topBooks,
    recentNotes,
    stats: JSON.stringify(data.stats || {}),
  };
}

// ─── AI Functions ───────────────────────────────────────────────────────────

export async function chatWithLibrary(
  history: { role: 'user' | 'model'; text: string }[],
  userMessage: string,
  libraryContext: LibraryContext,
): Promise<string> {
  const genai = getClient();

  const systemPrompt = `You are the Librarian — a warm, knowledgeable, and enthusiastic reading assistant for a personal library app. You know the user's reading habits, favorite genres, and books.

PERSONALITY:
- Friendly and encouraging, like a favorite librarian who really knows their patron
- Enthusiastic about books without being over the-top
- Concise but informative — prefer structured responses over walls of text

RESPONSE FORMAT RULES:
- Use numbered lists when recommending multiple items
- Use bullet points (•) for key details
- Keep paragraphs to 2-3 sentences max
- Use **bold** for book titles and key highlights
- End with a thoughtful follow-up question when appropriate
- For recommendations: always use a clean numbered list with title, author, and a one-line reason each

Here is the user's library context:
- Total books: ${libraryContext.totalBooks}
- Books read: ${libraryContext.booksRead}
- Currently reading: ${libraryContext.currentlyReading.join(', ') || 'Nothing currently'}
- TBR queue: ${libraryContext.tbr.slice(0, 10).join(', ') || 'Empty'}
- Favorite genres: ${libraryContext.favoriteGenres.join(', ') || 'No data yet'}
- Average rating: ${libraryContext.avgRating}
- Highest rated books: ${libraryContext.topBooks.map(b => `${b.title} by ${b.author} (${b.rating}/5)`).join('; ') || 'None rated yet'}
- Recent notes: ${libraryContext.recentNotes.map(n => `"${n.text}" from ${n.book}`).join('; ') || 'No notes yet'}`;

  const contents = history.map((m) => ({
    role: m.role === 'model' ? 'model' as const : 'user' as const,
    parts: [{ text: m.text }],
  }));

  contents.push({ role: 'user' as const, parts: [{ text: userMessage }] });

  const response = await genai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      maxOutputTokens: 4096,
      systemInstruction: systemPrompt,
    },
  });

  return response.text || 'Sorry, I could not generate a response.';
}

export async function getRecommendations(
  libraryContext: LibraryContext,
): Promise<Recommendation[]> {
  const genai = getClient();

  const prompt = `Based on this reader's library, recommend exactly 5 books they would enjoy. Consider their favorite genres, highly-rated books, reading patterns, and current reading.

Library context:
- Favorite genres: ${libraryContext.favoriteGenres.join(', ')}
- Highest rated: ${libraryContext.topBooks.map(b => `${b.title} by ${b.author} (${b.rating}/5)`).join('; ')}
- Currently reading: ${libraryContext.currentlyReading.join(', ') || 'Nothing'}
- TBR queue: ${libraryContext.tbr.join(', ') || 'Empty'}
- Total books read: ${libraryContext.booksRead}
- Genres explored: ${libraryContext.genres.join(', ')}
- Recent notes: ${libraryContext.recentNotes.map(n => `"${n.text}"`).join('; ')}

Respond with ONLY a JSON array (no markdown fences, no explanation). Each object must have:
- "title": book title (string)
- "author": author name (string)
- "reason": one short sentence explaining why it matches their taste — be specific and reference their actual reading history (string)
- "matchPercent": a number 50-99 indicating how well it fits their taste

Do NOT recommend books already in their library. Return real, published books only.`;

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 4096, temperature: 0.7 },
  });

  const text = response.text || '[]';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as Recommendation[];
  } catch {
    return [];
  }
}

export async function summarizeJournal(
  notesContext: { text: string; type: string; book: string; tags: string[] }[],
  userPrompt: string,
): Promise<string> {
  const genai = getClient();

  const notesText = notesContext
    .map((n) => `[${n.type}] from "${n.book}": "${n.text}" (tags: ${n.tags.join(', ') || 'none'})`)
    .join('\n');

  const prompt = `You are the Librarian — a thoughtful reading journal assistant. The user has the following notes, quotes, and highlights from their reading:

${notesText}

User's question: ${userPrompt}

RESPONSE FORMAT:
- Organize by theme or topic when summarizing
- Use bullet points (•) for key themes, patterns, or insights
- Reference specific books and quotes when making observations
- Keep paragraphs short (2-3 sentences max)
- End with an insightful observation or follow-up question`;

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 4096 },
  });

  return response.text || 'No analysis available.';
}

export async function suggestBookTags(
  title: string,
  author: string,
  description: string,
  genres: string[],
): Promise<BookTags> {
  const genai = getClient();

  const prompt = `Analyze this book and suggest metadata:
- Title: "${title}"
- Author: "${author}"
- Description: ${description || 'Not available'}
- Existing genres: ${genres.join(', ') || 'None'}

Respond with ONLY a JSON object (no markdown). Each field:
- "genres": array of 2-4 genre strings (keep existing ones if they fit, add new ones)
- "mood": array of 1-3 mood tags from: focused, relaxed, emotional, inspired, engaged, thoughtful, adventurous, humorous, dark, uplifting
- "difficulty": number 1-5 (1=light read, 5=very challenging)`;

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 256 },
  });

  const text = response.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { genres, mood: [], difficulty: 3 };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      genres: Array.isArray(parsed.genres) ? parsed.genres : genres,
      mood: Array.isArray(parsed.mood) ? parsed.mood : [],
      difficulty: typeof parsed.difficulty === 'number' ? parsed.difficulty : 3,
    };
  } catch {
    return { genres, mood: [], difficulty: 3 };
  }
}

export async function suggestNoteTags(
  noteText: string,
  bookTitle: string,
  bookAuthor: string,
): Promise<NoteTags> {
  const genai = getClient();

  const prompt = `Suggest relevant tags for this reading note:
- Book: "${bookTitle}" by ${bookAuthor}
- Note: "${noteText}"

Respond with ONLY a JSON object (no markdown):
- "tags": array of 2-5 lowercase tag strings that capture the themes, topics, or concepts in this note

Keep tags concise and useful for organization.`;

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 256 },
  });

  const text = response.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { tags: [] };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return { tags: Array.isArray(parsed.tags) ? parsed.tags : [] };
  } catch {
    return { tags: [] };
  }
}
