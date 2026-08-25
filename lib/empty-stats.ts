import type { ReadingStats } from './types';

export const EMPTY_STATS: ReadingStats = {
  booksRead: 0,
  pagesRead: 0,
  readingTimeMinutes: 0,
  averageRating: 0,
  longestStreak: 0,
  currentStreak: 0,
  booksThisYear: 0,
  pagesThisYear: 0,
  averagePagesPerDay: 0,
  averagePagesPerHour: 0,
  averageBooksPerMonth: 0,
  genreDistribution: [],
  formatDistribution: [],
  ratingDistribution: [],
  monthlyPages: [],
  monthlyBooks: [],
  heatmapData: [],
  topAuthors: [],
};
