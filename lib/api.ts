import type { OpenLibraryBook, OpenLibrarySearchResult, GoogleBooksVolume, GoogleBooksSearchResult, Book } from './types';

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

export async function searchOpenLibrary(query: string, limit = 20): Promise<OpenLibraryBook[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    fields: 'key,title,subtitle,authors,cover,description,isbn_10,isbn_13,subjects,publish_date,publish_year,publishers,number_of_pages_median,language',
  });

  const response = await fetch(`${OPEN_LIBRARY_BASE}/search.json?${params}`);
  if (!response.ok) throw new Error('Open Library search failed');
  
  const data: OpenLibrarySearchResult = await response.json();
  return data.docs;
}

export async function getOpenLibraryBook(olid: string): Promise<OpenLibraryBook | null> {
  const response = await fetch(`${OPEN_LIBRARY_BASE}/works/${olid}.json`);
  if (!response.ok) return null;
  return response.json();
}

export async function searchGoogleBooks(query: string, limit = 20): Promise<GoogleBooksVolume[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: limit.toString(),
    printType: 'books',
  });

  const response = await fetch(`${GOOGLE_BOOKS_BASE}/volumes?${params}`);
  if (!response.ok) throw new Error('Google Books search failed');
  
  const data: GoogleBooksSearchResult = await response.json();
  return data.items || [];
}

export async function getGoogleBook(volumeId: string): Promise<GoogleBooksVolume | null> {
  const response = await fetch(`${GOOGLE_BOOKS_BASE}/volumes/${volumeId}`);
  if (!response.ok) return null;
  return response.json();
}

export function openLibraryToBook(olBook: OpenLibraryBook): Partial<Book> {
  const coverId = olBook.cover?.large || olBook.covers?.[0];
  const coverUrl = coverId 
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : undefined;

  const author = olBook.authors?.[0]?.name || 'Unknown Author';
  const genres = olBook.subjects?.slice(0, 5) || [];
  const pageCount = olBook.number_of_pages_median || 0;
  const publishedYear = olBook.publish_year?.[0];
  const publisher = olBook.publishers?.[0];
  const isbn = olBook.isbn_13?.[0] || olBook.isbn_10?.[0];
  const description = typeof olBook.description === 'string' 
    ? olBook.description 
    : olBook.description?.value;

  return {
    title: olBook.title,
    subtitle: olBook.subtitle,
    author,
    coverUrl,
    description,
    isbn,
    isbn13: olBook.isbn_13?.[0],
    genres,
    format: 'paperback' as const,
    pageCount,
    publishedYear,
    publisher,
    openLibraryId: olBook.key.replace('/works/', ''),
  };
}

export function googleBooksToBook(gbBook: GoogleBooksVolume): Partial<Book> {
  const info = gbBook.volumeInfo;
  const coverUrl = info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail;
  const author = info.authors?.[0] || 'Unknown Author';
  const genres = info.categories || [];
  const isbn13 = info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;
  const isbn10 = info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
  const publishedYear = info.publishedDate ? new Date(info.publishedDate).getFullYear() : undefined;

  return {
    title: info.title,
    subtitle: info.subtitle,
    author,
    coverUrl,
    description: info.description,
    isbn: isbn10,
    isbn13,
    genres,
    format: 'paperback' as const,
    pageCount: info.pageCount || 0,
    publishedYear,
    publisher: info.publisher,
    language: info.language,
    googleBooksId: gbBook.id,
  };
}

export function getCoverColor(coverUrl?: string): string {
  // Default colors based on genre/topic - in production, extract from cover image
  const colors = [
    '#b7791f', '#64748b', '#c2410c', '#334155', 
    '#15803d', '#7c3aed', '#be185d', '#0891b2',
    '#854d0e', '#4338ca', '#0f766e', '#9a3412'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function searchExternalBooks(query: string): Promise<Book[]> {
  try {
    const docs = await searchOpenLibrary(query, 5);
    return docs.map((doc, idx) => {
      const partial = openLibraryToBook(doc);
      return {
        id: `ext-${idx}`,
        title: partial.title || 'Untitled',
        author: partial.author || 'Unknown Author',
        coverUrl: partial.coverUrl || '/placeholder.jpg',
        coverColor: getCoverColor(),
        format: 'paperback',
        genres: partial.genres?.length ? partial.genres : ['General'],
        pageCount: partial.pageCount || 300,
        publishedYear: partial.publishedYear || 2024,
        description: partial.description || 'No description available.',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Book;
    });
  } catch {
    return [];
  }
}
