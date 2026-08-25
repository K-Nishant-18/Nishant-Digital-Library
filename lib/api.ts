import type { OpenLibraryBook, OpenLibrarySearchResult, GoogleBooksVolume, GoogleBooksSearchResult, Book } from './types';

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

export async function searchGoogleBooks(query: string, limit = 10): Promise<GoogleBooksVolume[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      maxResults: limit.toString(),
      printType: 'books',
    });

    const response = await fetch(`${GOOGLE_BOOKS_BASE}/volumes?${params}`);
    if (!response.ok) return [];

    const data: GoogleBooksSearchResult = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export async function searchOpenLibrary(query: string, limit = 10): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`${OPEN_LIBRARY_BASE}/search.json?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

export function googleBooksToBook(gbBook: GoogleBooksVolume, idx: number): Book {
  const info = gbBook.volumeInfo;
  
  // Format cover URL with https and higher quality zoom
  let rawCover = info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
  if (rawCover) {
    rawCover = rawCover.replace('http://', 'https://');
    if (rawCover.includes('&edge=curl')) {
      rawCover = rawCover.replace('&edge=curl', '');
    }
  }

  const author = info.authors?.length ? info.authors.join(', ') : 'Unknown Author';
  const genres = info.categories?.length ? info.categories : ['General'];
  const isbn13 = info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;
  const isbn10 = info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
  const publishedYear = info.publishedDate ? parseInt(info.publishedDate.split('-')[0]) : undefined;

  return {
    id: `gb-${gbBook.id || idx}`,
    title: info.title || 'Untitled',
    subtitle: info.subtitle,
    author,
    coverUrl: rawCover || `https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80`,
    coverColor: getCoverColor(rawCover),
    description: info.description || 'No description available for this volume.',
    isbn: isbn10,
    isbn13,
    genres,
    format: 'paperback',
    pageCount: info.pageCount || 320,
    publishedYear: publishedYear || 2024,
    publisher: info.publisher,
    language: info.language || 'en',
    googleBooksId: gbBook.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function openLibraryDocToBook(doc: any, idx: number): Book {
  const coverUrl = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : undefined;

  const author = Array.isArray(doc.author_name) ? doc.author_name.join(', ') : 'Unknown Author';
  const genres = Array.isArray(doc.subject) ? doc.subject.slice(0, 4) : ['General'];
  const publishedYear = doc.first_publish_year || (Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined);
  const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : undefined;

  return {
    id: `ol-${doc.key?.replace('/works/', '') || idx}`,
    title: doc.title || 'Untitled',
    subtitle: doc.subtitle,
    author,
    coverUrl: coverUrl || `https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80`,
    coverColor: getCoverColor(coverUrl),
    description: doc.first_sentence?.[0] || 'No description available.',
    isbn,
    genres,
    format: 'paperback',
    pageCount: doc.number_of_pages_median || 300,
    publishedYear: publishedYear || 2024,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    language: Array.isArray(doc.language) ? doc.language[0] : 'en',
    openLibraryId: doc.key?.replace('/works/', ''),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function getCoverColor(coverUrl?: string): string {
  const colors = [
    '#b7791f', '#64748b', '#c2410c', '#334155', 
    '#15803d', '#7c3aed', '#be185d', '#0891b2',
    '#854d0e', '#4338ca', '#0f766e', '#9a3412'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function searchExternalBooks(query: string): Promise<Book[]> {
  const q = query.trim();
  if (!q) return [];

  // Scanned/typed ISBNs query the isbn index directly for exact matches
  const normalized = q.replace(/[-\s]/g, '');
  const isIsbn = /^(\d{9}[\dxX]|\d{10}|\d{13})$/.test(normalized);
  const gbQuery = isIsbn ? `isbn:${normalized}` : q;

  // Try Google Books API first for high resolution covers & complete metadata
  const gbResults = await searchGoogleBooks(gbQuery, 8);
  if (gbResults.length > 0) {
    return gbResults.map((item, idx) => googleBooksToBook(item, idx));
  }

  // Fallback to Open Library search
  const olDocs = await searchOpenLibrary(isIsbn ? `isbn:${normalized}` : q, 8);
  return olDocs.map((doc, idx) => openLibraryDocToBook(doc, idx));
}
