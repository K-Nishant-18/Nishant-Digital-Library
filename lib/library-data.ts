export type Book = { title: string; author: string; cover: string; pages: number; progress?: number; color: string }

export const books: Book[] = [
  { title: 'Atomic Habits', author: 'James Clear', cover: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg', pages: 320, progress: 68, color: '#b7791f' },
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', cover: 'https://covers.openlibrary.org/b/isbn/9780593321201-M.jpg', pages: 416, color: '#64748b' },
  { title: 'The Creative Act', author: 'Rick Rubin', cover: 'https://covers.openlibrary.org/b/isbn/9780593652886-M.jpg', pages: 432, color: '#c2410c' },
  { title: 'The Midnight Library', author: 'Matt Haig', cover: 'https://covers.openlibrary.org/b/isbn/9780525559474-M.jpg', pages: 304, color: '#334155' },
  { title: 'Project Hail Mary', author: 'Andy Weir', cover: 'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg', pages: 496, color: '#15803d' },
  { title: 'Braiding Sweetgrass', author: 'Robin Wall Kimmerer', cover: 'https://covers.openlibrary.org/b/isbn/9781571313560-M.jpg', pages: 408, color: '#7c3aed' },
]

export const pace = [42, 58, 36, 76, 62, 88, 69, 92, 74, 81, 54, 67]
export const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const genres = [{ name: 'Self-Improvement', percent: 34, count: 12, color: '#f59e0b' }, { name: 'Fiction', percent: 28, count: 10, color: '#60a5fa' }, { name: 'Biography', percent: 20, count: 7, color: '#a78bfa' }, { name: 'Psychology', percent: 18, count: 6, color: '#34d399' }]
