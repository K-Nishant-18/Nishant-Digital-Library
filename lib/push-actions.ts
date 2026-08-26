'use server';

import { assertAuth } from '@/lib/auth';
import { savePushSubscription, removePushSubscription, sendPushNotification } from '@/lib/push';
import { revalidatePath } from 'next/cache';

function isRedirectError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('NEXT_REDIRECT');
}

export async function getVapidPublicKeyAction(): Promise<string | null> {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
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
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
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
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;
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
    if (result.sent === 0 && result.failed === 0) {
      return { sent: 0, error: 'No push subscriptions found. Enable push notifications first, then try again.' };
    }
    if (result.failed > 0 && result.sent === 0) {
      return { sent: 0, error: `All ${result.failed} subscription(s) failed. Try disabling and re-enabling push notifications.` };
    }
    return { sent: result.sent };
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { sent: 0, error: message };
  }
}
