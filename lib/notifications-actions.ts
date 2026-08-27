'use server';

import { prisma } from '@/lib/db';
import { assertAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { generateNotifications } from '@/lib/notifications';

export async function getNotificationsAction(): Promise<{
  success: boolean;
  notifications?: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    data?: string;
    createdAt: Date;
  }[];
  unreadCount?: number;
  error?: string;
}> {
  await assertAuth();
  try {
    await generateNotifications();

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { read: false },
    });

    return {
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        data: n.data ?? undefined,
        createdAt: n.createdAt,
      })),
      unreadCount,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function markNotificationReadAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await assertAuth();
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  await assertAuth();
  try {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function dismissNotificationAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await assertAuth();
  try {
    await prisma.notification.delete({ where: { id } });
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function clearAllNotificationsAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  await assertAuth();
  try {
    await prisma.notification.deleteMany();
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
