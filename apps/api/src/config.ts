import { resolve } from 'node:path';

const resolveDbPath = () => process.env.OLIVIA_DB_PATH ?? resolve(process.cwd(), 'apps/api/data/olivia.sqlite');

export type NotificationRulesConfig = {
  dueSoonEnabled: boolean;
  staleItemEnabled: boolean;
  digestEnabled: boolean;
};

export type AppConfig = {
  port: number;
  dbPath: string;
  staleThresholdDays: number;
  dueSoonDays: number;
  aiProvider: 'disabled';
  notificationsEnabled: boolean;
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  vapidContact: string;
  notificationRules: NotificationRulesConfig;
  notificationIntervalMs: number;
  pwaOrigin: string;
};

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: resolveDbPath(),
    staleThresholdDays: Number(process.env.OLIVIA_STALE_THRESHOLD_DAYS ?? 14),
    dueSoonDays: Number(process.env.OLIVIA_DUE_SOON_DAYS ?? 7),
    aiProvider: 'disabled',
    notificationsEnabled: process.env.OLIVIA_NOTIFICATIONS_ENABLED === 'true',
    vapidPublicKey: process.env.OLIVIA_VAPID_PUBLIC_KEY ?? null,
    vapidPrivateKey: process.env.OLIVIA_VAPID_PRIVATE_KEY ?? null,
    vapidContact: process.env.OLIVIA_VAPID_CONTACT ?? 'mailto:admin@localhost',
    notificationRules: {
      dueSoonEnabled: process.env.OLIVIA_NOTIFY_DUE_SOON === 'true',
      staleItemEnabled: process.env.OLIVIA_NOTIFY_STALE_ITEM === 'true',
      digestEnabled: process.env.OLIVIA_NOTIFY_DIGEST === 'true'
    },
    notificationIntervalMs: Number(process.env.OLIVIA_NOTIFICATION_INTERVAL_MS ?? 3_600_000),
    pwaOrigin: process.env.OLIVIA_PWA_ORIGIN ?? 'http://localhost:4173'
  };
}
