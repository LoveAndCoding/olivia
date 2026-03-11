import { resolve } from 'node:path';

const resolveDbPath = () => process.env.OLIVIA_DB_PATH ?? resolve(process.cwd(), 'apps/api/data/olivia.sqlite');

export type AppConfig = {
  port: number;
  dbPath: string;
  staleThresholdDays: number;
  dueSoonDays: number;
  aiProvider: 'disabled';
};

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: resolveDbPath(),
    staleThresholdDays: Number(process.env.OLIVIA_STALE_THRESHOLD_DAYS ?? 14),
    dueSoonDays: Number(process.env.OLIVIA_DUE_SOON_DAYS ?? 7),
    aiProvider: 'disabled'
  };
}
