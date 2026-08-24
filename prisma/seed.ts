import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Neon PostgreSQL Database...');

  // 1. User Profile
  await prisma.userProfile.upsert({
    where: { id: 'user-default' },
    update: {},
    create: {
      id: 'user-default',
      name: 'Kumar Nishant',
      email: 'kumar.nishant@devreader.com',
      bio: 'Software engineer by day, voracious reader by night. Building my personal library one book at a time.',
      location: 'Bangalore, India',
      website: 'https://github.com/kumarnishant',
      level: 15,
      xpCurrent: 3450,
      xpNext: 5000,
      currentStreak: 42,
      longestStreak: 68,
      targetBooks: 60,
      dailyMinutesGoal: 45,
    },
  });

  // 2. Reading Goal
  await prisma.readingGoal.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      targetBooks: 60,
      targetPages: 18000,
      targetMinutes: 12000,
    },
  });

  // 3. Shelves
  const shelvesData = [
    { id: 'shelf-1', name: 'All Books', isDefault: true, description: 'Complete library collection' },
    { id: 'shelf-2', name: 'Favorites & Masterpieces', isDefault: false, color: '#f59e0b', description: 'Top rated 5-star reads' },
    { id: 'shelf-3', name: 'Tech, Systems & AI', isDefault: false, color: '#3b82f6', description: 'Software engineering and technological futures' },
    { id: 'shelf-4', name: 'Mindset & Productivity', isDefault: false, color: '#10b981', description: 'Habits, psychology, and personal growth' },
    { id: 'shelf-5', name: 'Sci-Fi & Speculative', isDefault: false, color: '#8b5cf6', description: 'Space exploration and futuristic narratives' },
  ];

  for (const s of shelvesData) {
    await prisma.shelf.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // 4. Sample Books & Library Entries
  const booksData = [
    {
      id: 'b-1',
      title: 'Atomic Habits',
      subtitle: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
      author: 'James Clear',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
      coverColor: '#b7791f',
      description: 'No matter your goals, Atomic Habits offers a proven framework for improving every day.',
      isbn: '0735211299',
      isbn13: '9780735211292',
      genres: ['Self-Improvement', 'Psychology', 'Productivity'],
      format: 'paperback',
      pageCount: 320,
      publishedYear: 2018,
      publisher: 'Avery',
      entry: {
        id: 'e-1',
        status: 'reading',
        owned: true,
        rating: 4.8,
        difficulty: 2,
        emotionalImpact: 4,
        wouldRecommend: true,
        rereadValue: 5,
        currentPage: 218,
        progressPercent: 68,
        dateStarted: new Date('2026-08-01'),
      },
    },
    {
      id: 'b-2',
      title: 'Tomorrow, and Tomorrow, and Tomorrow',
      author: 'Gabrielle Zevin',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593321201-L.jpg',
      coverColor: '#64748b',
      description: 'A magnificent novel about two friends who come together as creative partners in video game design.',
      isbn: '0593321200',
      isbn13: '9780593321201',
      genres: ['Fiction', 'Literary Fiction', 'Technology'],
      format: 'hardcover',
      pageCount: 416,
      publishedYear: 2022,
      publisher: 'Knopf',
      entry: {
        id: 'e-2',
        status: 'read',
        owned: true,
        rating: 5.0,
        difficulty: 3,
        emotionalImpact: 5,
        wouldRecommend: true,
        rereadValue: 4,
        currentPage: 416,
        progressPercent: 100,
        dateStarted: new Date('2026-07-10'),
        dateFinished: new Date('2026-07-25'),
      },
    },
    {
      id: 'b-3',
      title: 'The Creative Act: A Way of Being',
      author: 'Rick Rubin',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg',
      coverColor: '#c2410c',
      description: 'A beautiful exploration of creativity and the artistic process from music legend Rick Rubin.',
      isbn: '0593652885',
      isbn13: '9780593652886',
      genres: ['Creativity', 'Non-Fiction', 'Art'],
      format: 'kindle',
      pageCount: 432,
      publishedYear: 2023,
      publisher: 'Penguin Press',
      entry: {
        id: 'e-3',
        status: 'tbr',
        owned: false,
        rating: 4.5,
        currentPage: 0,
        progressPercent: 0,
      },
    },
    {
      id: 'b-4',
      title: 'Project Hail Mary',
      author: 'Andy Weir',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg',
      coverColor: '#15803d',
      description: 'Ryland Grace is the sole survivor on a desperate last-chance mission to save humanity.',
      isbn: '0593135202',
      isbn13: '9780593135204',
      genres: ['Science Fiction', 'Space', 'Adventure'],
      format: 'audiobook',
      pageCount: 496,
      publishedYear: 2021,
      publisher: 'Ballantine Books',
      entry: {
        id: 'e-4',
        status: 'read',
        owned: true,
        rating: 5.0,
        difficulty: 2,
        emotionalImpact: 5,
        wouldRecommend: true,
        rereadValue: 5,
        currentPage: 496,
        progressPercent: 100,
        dateStarted: new Date('2026-06-01'),
        dateFinished: new Date('2026-06-18'),
      },
    },
  ];

  for (const b of booksData) {
    const { entry, ...bookProps } = b;
    await prisma.book.upsert({
      where: { id: bookProps.id },
      update: {},
      create: bookProps,
    });

    await prisma.libraryEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        ...entry,
        bookId: bookProps.id,
      },
    });

    // Link to default shelf
    await prisma.shelfOnEntry.upsert({
      where: {
        shelfId_libraryEntryId: {
          shelfId: 'shelf-1',
          libraryEntryId: entry.id,
        },
      },
      update: {},
      create: {
        shelfId: 'shelf-1',
        libraryEntryId: entry.id,
      },
    });
  }

  // 5. Sample Reading Sessions
  await prisma.readingSession.createMany({
    skipDuplicates: true,
    data: [
      { id: 'sess-1', libraryEntryId: 'e-1', pageStart: 180, pageEnd: 218, minutes: 45, mood: 'focused', notes: 'Great insights on habit stacking!' },
      { id: 'sess-2', libraryEntryId: 'e-1', pageStart: 140, pageEnd: 180, minutes: 35, mood: 'engaged', notes: 'The 2-minute rule explanation was brilliant.' },
      { id: 'sess-3', libraryEntryId: 'e-2', pageStart: 350, pageEnd: 416, minutes: 60, mood: 'emotional', notes: 'Emotional ending, loved Sam and Marx.' },
    ],
  });

  // 6. Sample Notes & Quotes
  await prisma.note.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'n-1',
        libraryEntryId: 'e-1',
        type: 'quote',
        text: 'You do not rise to the level of your goals. You fall to the level of your systems.',
        page: 27,
        tags: ['Identity', 'Systems', 'Habits'],
        isFavorite: true,
      },
      {
        id: 'n-2',
        libraryEntryId: 'e-1',
        type: 'reflection',
        text: 'Focusing on 1% daily improvements is far more sustainable than aiming for sudden massive transformations.',
        page: 15,
        tags: ['Mindset', 'Growth'],
        isFavorite: false,
      },
      {
        id: 'n-3',
        libraryEntryId: 'e-2',
        type: 'quote',
        text: 'To allow yourself to play with another person is no small risk. It means allowing yourself to be open, to be exposed, to be hurt.',
        page: 184,
        tags: ['Friendship', 'Vulnerability'],
        isFavorite: true,
      },
    ],
  });

  console.log('✅ Neon PostgreSQL Database Seeded Successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
