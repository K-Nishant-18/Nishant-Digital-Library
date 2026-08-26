import webPush from 'web-push';
import { prisma } from '@/lib/db';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@mylibrary.app';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function sendPushNotification(params: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}): Promise<{ sent: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    icon: params.icon || '/my-logo.png',
    badge: params.badge || '/my-logo.png',
    tag: params.tag || 'my-library-notification',
    data: params.data || {},
  });

  let sent = 0;
  let failed = 0;
  const toDelete: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sent++;
    } catch (error: any) {
      failed++;
      // 404 = subscription expired, 410 = subscription revoked
      if (error.statusCode === 404 || error.statusCode === 410) {
        toDelete.push(sub.id);
      }
    }
  }

  // Clean up expired subscriptions
  if (toDelete.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  return { sent, failed };
}

export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth },
      create: { endpoint, p256dh, auth },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removePushSubscription(
  endpoint: string,
): Promise<{ success: boolean }> {
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { success: true };
  } catch {
    return { success: false };
  }
}
