import webPush from 'web-push';
import type { PushSubscription as WebPushSubscription } from 'web-push';
const { generateVAPIDKeys, sendNotification, setVapidDetails } = webPush;

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export interface PushProvider {
  isConfigured(): boolean;
  send(subscription: PushSubscriptionPayload, notification: NotificationPayload): Promise<void>;
}

export class WebPushProvider implements PushProvider {
  constructor(vapidPublicKey: string, vapidPrivateKey: string, contact: string) {
    setVapidDetails(contact, vapidPublicKey, vapidPrivateKey);
  }

  isConfigured(): boolean {
    return true;
  }

  async send(subscription: PushSubscriptionPayload, notification: NotificationPayload): Promise<void> {
    const webPushSub: WebPushSubscription = { endpoint: subscription.endpoint, keys: subscription.keys };
    await sendNotification(webPushSub, JSON.stringify(notification));
  }
}

export class DisabledPushProvider implements PushProvider {
  isConfigured(): boolean {
    return false;
  }

  async send(_subscription: PushSubscriptionPayload, _notification: NotificationPayload): Promise<void> {
    // Push notifications are disabled; no-op.
  }
}

export function createPushProvider(config: {
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  vapidContact: string;
}): PushProvider {
  if (config.vapidPublicKey && config.vapidPrivateKey) {
    return new WebPushProvider(config.vapidPublicKey, config.vapidPrivateKey, config.vapidContact);
  }
  return new DisabledPushProvider();
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return generateVAPIDKeys();
}
