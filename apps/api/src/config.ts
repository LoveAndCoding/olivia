import { resolve } from 'node:path';

const resolveDbPath = () => process.env.OLIVIA_DB_PATH ?? resolve(process.cwd(), 'apps/api/data/olivia.sqlite');

export type NotificationRulesConfig = {
  dueSoonEnabled: boolean;
  staleItemEnabled: boolean;
  digestEnabled: boolean;
};

export type ApnsConfig = {
  keyId: string | null;
  teamId: string | null;
  privateKey: string | null;
  bundleId: string;
  useSandbox: boolean;
};

export type PaperclipConfig = {
  apiUrl: string | null;
  apiKey: string | null;
  companyId: string | null;
  sreAgentId: string | null;
};

export type AuthConfig = {
  enabled: boolean;
  resendApiKey: string | null;
};

export type AppConfig = {
  port: number;
  dbPath: string;
  auth: AuthConfig;
  staleThresholdDays: number;
  dueSoonDays: number;
  aiProvider: 'disabled' | 'claude';
  anthropicApiKey?: string;
  notificationsEnabled: boolean;
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  vapidContact: string;
  notificationRules: NotificationRulesConfig;
  notificationIntervalMs: number;
  nudgePushIntervalMs: number;
  pwaOrigin: string;
  householdTimezone: string;
  apns: ApnsConfig;
  paperclip: PaperclipConfig;
};

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: resolveDbPath(),
    auth: {
      enabled: process.env.OLIVIA_AUTH_ENABLED === 'true',
      resendApiKey: process.env.OLIVIA_RESEND_API_KEY ?? null,
    },
    staleThresholdDays: Number(process.env.OLIVIA_STALE_THRESHOLD_DAYS ?? 14),
    dueSoonDays: Number(process.env.OLIVIA_DUE_SOON_DAYS ?? 7),
    aiProvider: process.env.ANTHROPIC_API_KEY ? 'claude' : 'disabled',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
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
    nudgePushIntervalMs: Number(process.env.OLIVIA_NUDGE_PUSH_INTERVAL_MS ?? 1_800_000),
    pwaOrigin: process.env.OLIVIA_PWA_ORIGIN ?? 'http://localhost:4173',
    apns: {
      keyId: process.env.OLIVIA_APNS_KEY_ID ?? null,
      teamId: process.env.OLIVIA_APNS_TEAM_ID ?? null,
      privateKey: process.env.OLIVIA_APNS_PRIVATE_KEY ?? null,
      bundleId: process.env.OLIVIA_APNS_BUNDLE_ID ?? 'com.loveandcoding.olivia',
      useSandbox: process.env.OLIVIA_APNS_SANDBOX === 'true',
    },
    householdTimezone: process.env.OLIVIA_HOUSEHOLD_TIMEZONE
      ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    paperclip: {
      apiUrl: process.env.OLIVIA_PAPERCLIP_API_URL ?? null,
      apiKey: process.env.OLIVIA_PAPERCLIP_API_KEY ?? null,
      companyId: process.env.OLIVIA_PAPERCLIP_COMPANY_ID ?? null,
      sreAgentId: process.env.OLIVIA_PAPERCLIP_SRE_AGENT_ID ?? null,
    },
  };
}
