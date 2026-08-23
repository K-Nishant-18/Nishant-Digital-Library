export type BookStatus = 'tbr' | 'reading' | 'read' | 'dnf';
export type BookFormat = 'paperback' | 'hardcover' | 'kindle' | 'audiobook' | 'other';
export type NoteType = 'note' | 'quote' | 'reflection' | 'highlight';
export type MoodTag = 'focused' | 'relaxed' | 'emotional' | 'inspired' | 'bored' | 'engaged';

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  authorId?: string;
  coverUrl?: string;
  coverColor?: string;
  description?: string;
  isbn?: string;
  isbn13?: string;
  genres: string[];
  format: BookFormat;
  pageCount: number;
  publishedYear?: number;
  publisher?: string;
  language?: string;
  openLibraryId?: string;
  googleBooksId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryEntry {
  id: string;
  bookId: string;
  book?: Book;
  status: BookStatus;
  owned: boolean;
  rating?: number; // 1-5 with 0.5 increments
  difficulty?: number; // 1-5
  emotionalImpact?: number; // 1-5
  wouldRecommend?: boolean;
  rereadValue?: number; // 1-5
  dateAdded: Date;
  dateStarted?: Date;
  dateFinished?: Date;
  shelfIds: string[];
  currentPage: number;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingSession {
  id: string;
  libraryEntryId: string;
  startedAt: Date;
  endedAt?: Date;
  pageStart: number;
  pageEnd?: number;
  minutes?: number;
  mood?: MoodTag;
  notes?: string;
  createdAt: Date;
}

export interface ProgressSnapshot {
  id: string;
  libraryEntryId: string;
  timestamp: Date;
  currentPage: number;
  percentComplete: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  number: number;
  title?: string;
  pageStart?: number;
  pageEnd?: number;
  percentComplete: number;
  completed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  libraryEntryId: string;
  type: NoteType;
  text: string;
  page?: number;
  chapter?: number;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shelf {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  isDefault: boolean;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  birthYear?: number;
  deathYear?: number;
  openLibraryId?: string;
  bookCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  color?: string;
  createdAt: Date;
}

export interface ReadingGoal {
  id: string;
  year: number;
  targetBooks: number;
  targetPages: number;
  targetMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingStats {
  booksRead: number;
  pagesRead: number;
  readingTimeMinutes: number;
  averageRating: number;
  longestStreak: number;
  currentStreak: number;
  booksThisYear: number;
  pagesThisYear: number;
  averagePagesPerDay: number;
  averagePagesPerHour: number;
  averageBooksPerMonth: number;
  longestBook?: { title: string; pages: number };
  shortestBook?: { title: string; pages: number };
  mostProductiveMonth?: { month: string; books: number; pages: number };
  genreDistribution: { genre: string; count: number; pages: number; percent: number }[];
  formatDistribution: { format: string; count: number; percent: number }[];
  ratingDistribution: { rating: number; count: number }[];
  monthlyPages: { month: string; pages: number; books: number }[];
  monthlyBooks: { month: string; count: number }[];
  heatmapData: { date: string; minutes: number }[];
  topAuthors: { author: Author; booksRead: number; pagesRead: number }[];
}

// Open Library API types
export interface OpenLibraryBook {
  key: string;
  title: string;
  subtitle?: string;
  authors: { key: string; name: string }[];
  cover?: { large: string; medium: string; small: string };
  covers?: number[];
  description?: string | { value: string };
  isbn_10?: string[];
  isbn_13?: string[];
  subjects?: string[];
  publish_date?: string[];
  publish_year?: number[];
  publishers?: string[];
  number_of_pages_median?: number;
  language?: { key: string }[];
}

export interface OpenLibrarySearchResult {
  numFound: number;
  start: number;
  docs: OpenLibraryBook[];
}

// Google Books API types
export interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
    categories?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    language?: string;
  };
}

export interface GoogleBooksSearchResult {
  totalItems: number;
  items?: GoogleBooksVolume[];
}