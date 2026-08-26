'use server';

import { assertAuth } from '@/lib/auth';
import { savePushSubscription, removePushSubscription, sendPushNotification } from '@/lib/push';
import { revalidatePath } from 'next/cache';

export async function getVapidPublicKeyAction(): Promise<string | null> {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function subscribePushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAuth();
    const result = await savePushSubscription(
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
    );
    if (result.success) revalidatePath('/');
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unsubscribePushAction(
  endpoint: string,
): Promise<{ success: boolean }> {
  try {
    await assertAuth();
    const result = await removePushSubscription(endpoint);
    if (result.success) revalidatePath('/');
    return result;
  } catch {
    return { success: false };
  }
}

export async function sendTestPushAction(): Promise<{ sent: number; error?: string }> {
  try {
    await assertAuth();
    const result = await sendPushNotification({
      title: 'Test Notification',
      body: 'Push notifications are working! You\'ll receive streak alerts, reading reminders, and milestones here.',
      tag: 'test-push',
    });
    if (result.sent === 0) {
      return { sent: 0, error: 'No subscriptions found. Enable push notifications first.' };
    }
    return { sent: result.sent };
  } catch (error: any) {
    return { sent: 0, error: error.message };
  }
}
