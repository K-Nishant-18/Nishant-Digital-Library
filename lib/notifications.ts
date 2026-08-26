import { prisma } from '@/lib/db';
import { sendPushNotification } from '@/lib/push';

// Deduplication: check if a notification of this type with this title already exists today
async function notificationExists(type: string, title: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.notification.findFirst({
    where: {
      type,
      title,
      createdAt: { gte: today },
    },
  });
  return !!existing;
}

async function createNotificationIfNew(params: {
  type: string;
  title: string;
  message: string;
  data?: string;
  push?: boolean;
}): Promise<void> {
  const exists = await notificationExists(params.type, params.title);
  if (!exists) {
    await prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
      },
    });

    // Send push notification if requested
    if (params.push !== false) {
      await sendPushNotification({
        title: params.title,
        body: params.message,
        tag: `my-library-${params.type}`,
        data: { type: params.type },
      });
    }
  }
}

export async function generateNotifications(): Promise<void> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Get all data we need
  const [userProfile, entries, sessionsToday, goal] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: 'user-default' } }),
    prisma.libraryEntry.findMany({
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.readingSession.findMany({
      where: { startedAt: { gte: todayStart } },
    }),
    prisma.readingGoal.findUnique({ where: { year: now.getFullYear() } }),
  ]);

  if (!userProfile) return;

  // ─── Streak Alert ───────────────────────────────────────────────────────
  if (userProfile.currentStreak > 0 && sessionsToday.length === 0) {
    const hour = now.getHours();
    if (hour >= 18) {
      await createNotificationIfNew({
        type: 'streak',
        title: 'Streak at risk!',
        message: `Your ${userProfile.currentStreak}-day streak resets at midnight. Log a reading session to keep it alive!`,
        data: JSON.stringify({ streak: userProfile.currentStreak }),
      });
    }
  }

  // ─── Reading Reminder ───────────────────────────────────────────────────
  if (sessionsToday.length === 0) {
    const hour = now.getHours();
    if (hour >= 20) {
      await createNotificationIfNew({
        type: 'reminder',
        title: "You haven't read today",
        message: `Even 15 minutes counts. Keep your ${userProfile.currentStreak}-day streak going!`,
      });
    }
  }

  // ─── Progress Milestones ────────────────────────────────────────────────
  const readingEntries = entries.filter((e) => e.status === 'reading');
  for (const entry of readingEntries) {
    if (!entry.book) continue;
    const pct = entry.progressPercent;

    // 25%, 50%, 75% milestones
    for (const threshold of [25, 50, 75]) {
      if (pct >= threshold && pct < threshold + 5) {
        await createNotificationIfNew({
          type: 'milestone',
          title: `${threshold}% through "${entry.book.title}"`,
          message: `You're ${Math.round(pct)}% of the way through ${entry.book.title} by ${entry.book.author}. Keep going!`,
          data: JSON.stringify({ entryId: entry.id, bookId: entry.bookId, percent: pct }),
        });
      }
    }
  }

  // ─── Books completed this year ──────────────────────────────────────────
  const readEntries = entries.filter((e) => e.status === 'read');
  const booksThisYear = readEntries.filter((e) => {
    if (!e.dateFinished) return false;
    return new Date(e.dateFinished).getFullYear() === now.getFullYear();
  });

  for (const milestone of [10, 25, 50, 75, 100]) {
    if (booksThisYear.length === milestone) {
      await createNotificationIfNew({
        type: 'milestone',
        title: `You've read ${milestone} books this year!`,
        message: `Incredible progress! You've completed ${milestone} books in ${now.getFullYear()}.`,
        data: JSON.stringify({ count: milestone }),
      });
    }
  }

  // ─── Goal Progress ──────────────────────────────────────────────────────
  if (goal) {
    const goalPct = Math.round((booksThisYear.length / goal.targetBooks) * 100);
    if (goalPct >= 80 && goalPct < 85) {
      await createNotificationIfNew({
        type: 'milestone',
        title: `${goalPct}% of your yearly goal!`,
        message: `You've read ${booksThisYear.length} of your ${goal.targetBooks}-book goal. Almost there!`,
      });
    }
  }

  // ─── Longest Streak Record ──────────────────────────────────────────────
  if (userProfile.currentStreak > 0 && userProfile.currentStreak >= userProfile.longestStreak) {
    await createNotificationIfNew({
      type: 'milestone',
      title: 'New personal record!',
      message: `Your ${userProfile.currentStreak}-day streak is your longest ever. Amazing consistency!`,
    });
  }
}
