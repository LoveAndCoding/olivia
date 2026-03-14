import type { FastifyBaseLogger } from 'fastify';
import { buildSuggestions, groupReminders, rankRemindersForSurfacing } from '@olivia/domain';
import type { Reminder } from '@olivia/contracts';
import type { AppConfig } from './config';
import type { PushProvider, PushSubscriptionPayload } from './push';
import type { InboxRepository, NotificationDeliveryRecord } from './repository';

type NotificationRecord = {
  rule: 'due_soon' | 'stale_item' | 'digest';
  itemId?: string;
  itemTitle?: string;
  delivered: boolean;
  error?: string;
  timestamp: string;
};

const DAILY_SUMMARY_SEND_WINDOW_UTC_HOUR = 8;

function isPushSubscriptionPayload(payload: Record<string, unknown>): payload is PushSubscriptionPayload {
  return (
    typeof payload.endpoint === 'string' &&
    payload.keys !== null &&
    typeof payload.keys === 'object' &&
    typeof (payload.keys as Record<string, unknown>).p256dh === 'string' &&
    typeof (payload.keys as Record<string, unknown>).auth === 'string'
  );
}

async function deliverToStakeholderSubscriptions(
  repository: InboxRepository,
  push: PushProvider,
  notification: { title: string; body: string; url: string; tag: string },
  logger: FastifyBaseLogger
): Promise<NotificationRecord[]> {
  const subscriptions = repository.listNotificationSubscriptions('stakeholder');
  const results: NotificationRecord[] = [];

  for (const subscription of subscriptions) {
    if (!isPushSubscriptionPayload(subscription.payload)) {
      logger.warn({ subscriptionId: subscription.id }, 'notification subscription payload is missing Web Push keys; skipping');
      continue;
    }

    const record: NotificationRecord = {
      rule: notification.tag.startsWith('digest') ? 'digest' : notification.tag.startsWith('stale') ? 'stale_item' : 'due_soon',
      itemId: undefined,
      itemTitle: undefined,
      delivered: false,
      timestamp: new Date().toISOString()
    };

    try {
      await push.send(subscription.payload, notification);
      record.delivered = true;
      logger.info({ subscriptionId: subscription.id, tag: notification.tag }, 'notification delivered');
    } catch (error) {
      record.error = error instanceof Error ? error.message : 'Unknown delivery error';
      logger.warn({ subscriptionId: subscription.id, tag: notification.tag, error: record.error }, 'notification delivery failed');
    }

    results.push(record);
  }

  return results;
}

function hasEnabledReminderNotificationPreference(
  repository: InboxRepository,
  notificationType: NotificationDeliveryRecord['notificationType']
): boolean {
  const preferences = repository.getReminderNotificationPreferences('stakeholder');
  if (!preferences.enabled) {
    return false;
  }

  return notificationType === 'due_reminder' ? preferences.dueRemindersEnabled : preferences.dailySummaryEnabled;
}

function reminderDeliveryBucket(reminder: Reminder): string {
  return `${reminder.id}:${reminder.snoozedUntil ?? reminder.scheduledAt}`;
}

function isDailySummaryWindow(now: Date): boolean {
  return now.getUTCHours() === DAILY_SUMMARY_SEND_WINDOW_UTC_HOUR;
}

function buildDailySummaryBody(grouped: ReturnType<typeof groupReminders>): string {
  const activeCount = grouped.upcoming.length + grouped.due.length + grouped.overdue.length + grouped.snoozed.length;
  const segments = [
    grouped.overdue.length ? `${grouped.overdue.length} overdue` : null,
    grouped.due.length ? `${grouped.due.length} due now` : null,
    grouped.upcoming.length ? `${grouped.upcoming.length} upcoming` : null,
    grouped.snoozed.length ? `${grouped.snoozed.length} snoozed` : null
  ].filter(Boolean);

  return `You have ${activeCount} active reminder${activeCount === 1 ? '' : 's'}${segments.length ? `: ${segments.join(', ')}.` : '.'}`;
}

export async function evaluateDueReminderRule(
  repository: InboxRepository,
  push: PushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger,
  now: Date = new Date()
): Promise<void> {
  if (!config.notificationsEnabled) return;
  if (!hasEnabledReminderNotificationPreference(repository, 'due_reminder')) {
    logger.debug('due-reminder rule: disabled by saved reminder preferences');
    return;
  }

  const reminders = rankRemindersForSurfacing(repository.listReminders(now), now, Number.MAX_SAFE_INTEGER).filter(
    (reminder) => reminder.state === 'due' || reminder.state === 'overdue'
  );

  if (reminders.length === 0) {
    logger.debug('due-reminder rule: no reminders eligible');
    return;
  }

  for (const reminder of reminders) {
    const deliveryBucket = reminderDeliveryBucket(reminder);
    if (repository.hasNotificationDelivery('due_reminder', 'stakeholder', deliveryBucket)) {
      logger.debug({ reminderId: reminder.id, deliveryBucket }, 'due-reminder rule: already delivered for this occurrence');
      continue;
    }

    const title = reminder.state === 'overdue' ? 'Reminder overdue — Olivia' : 'Reminder due — Olivia';
    const body = reminder.linkedInboxItem
      ? `${reminder.title} — linked to "${reminder.linkedInboxItem.title}".`
      : reminder.title;
    const url = `${config.pwaOrigin}/re-entry?reason=reminder-review&reminderId=${reminder.id}`;
    const results = await deliverToStakeholderSubscriptions(
      repository,
      push,
      {
        title,
        body,
        url,
        tag: `due-reminder-${deliveryBucket}`
      },
      logger
    );

    if (results.some((result) => result.delivered)) {
      repository.recordNotificationDelivery('due_reminder', 'stakeholder', reminder.id, deliveryBucket, now.toISOString());
      logger.info({ reminderId: reminder.id, deliveryBucket }, 'due-reminder rule: delivered');
    }
  }
}

export async function evaluateDailySummaryRule(
  repository: InboxRepository,
  push: PushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger,
  now: Date = new Date()
): Promise<void> {
  if (!config.notificationsEnabled) return;
  if (!isDailySummaryWindow(now)) {
    logger.debug({ hourUtc: now.getUTCHours() }, 'daily-summary rule: outside send window');
    return;
  }
  if (!hasEnabledReminderNotificationPreference(repository, 'daily_summary')) {
    logger.debug('daily-summary rule: disabled by saved reminder preferences');
    return;
  }

  const grouped = groupReminders(repository.listReminders(now), now);
  const activeCount = grouped.upcoming.length + grouped.due.length + grouped.overdue.length + grouped.snoozed.length;
  if (activeCount === 0) {
    logger.debug('daily-summary rule: no active reminders');
    return;
  }

  const deliveryBucket = now.toISOString().slice(0, 10);
  if (repository.hasNotificationDelivery('daily_summary', 'stakeholder', deliveryBucket)) {
    logger.debug({ deliveryBucket }, 'daily-summary rule: already delivered today');
    return;
  }

  const results = await deliverToStakeholderSubscriptions(
    repository,
    push,
    {
      title: 'Daily reminder summary — Olivia',
      body: buildDailySummaryBody(grouped),
      url: `${config.pwaOrigin}/re-entry?reason=reminders-daily-summary`,
      tag: `daily-summary-${deliveryBucket}`
    },
    logger
  );

  if (results.some((result) => result.delivered)) {
    repository.recordNotificationDelivery('daily_summary', 'stakeholder', null, deliveryBucket, now.toISOString());
    logger.info({ deliveryBucket }, 'daily-summary rule: delivered');
  }
}

export async function evaluateDueSoonRule(
  repository: InboxRepository,
  push: PushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger
): Promise<void> {
  if (!config.notificationRules.dueSoonEnabled) return;

  const items = repository.listItems();
  const suggestions = buildSuggestions(items, new Date(), {
    staleThresholdDays: config.staleThresholdDays,
    dueSoonDays: config.dueSoonDays
  });
  const dueSoon = suggestions.filter((s) => s.type === 'due_soon');

  if (dueSoon.length === 0) {
    logger.debug('due-soon rule: no items to notify');
    return;
  }

  for (const suggestion of dueSoon) {
    const url = `${config.pwaOrigin}/re-entry?reason=due-soon-review&itemId=${suggestion.itemId}`;
    logger.info({ itemId: suggestion.itemId, rule: 'due_soon' }, 'notification generated');
    await deliverToStakeholderSubscriptions(
      repository,
      push,
      {
        title: 'Item due soon — Olivia',
        body: suggestion.message,
        url,
        tag: `due-soon-${suggestion.itemId}`
      },
      logger
    );
  }
}

export async function evaluateStaleItemRule(
  repository: InboxRepository,
  push: PushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger
): Promise<void> {
  if (!config.notificationRules.staleItemEnabled) return;

  const items = repository.listItems();
  const suggestions = buildSuggestions(items, new Date(), {
    staleThresholdDays: config.staleThresholdDays,
    dueSoonDays: config.dueSoonDays
  });
  const stale = suggestions.filter((s) => s.type === 'stale');

  if (stale.length === 0) {
    logger.debug('stale-item rule: no items to notify');
    return;
  }

  for (const suggestion of stale) {
    const url = `${config.pwaOrigin}/re-entry?reason=stale-item-review&itemId=${suggestion.itemId}`;
    logger.info({ itemId: suggestion.itemId, rule: 'stale_item' }, 'notification generated');
    await deliverToStakeholderSubscriptions(
      repository,
      push,
      {
        title: 'Stale household item — Olivia',
        body: suggestion.message,
        url,
        tag: `stale-${suggestion.itemId}`
      },
      logger
    );
  }
}

export async function evaluateDigestRule(
  repository: InboxRepository,
  push: PushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger
): Promise<void> {
  if (!config.notificationRules.digestEnabled) return;

  const items = repository.listItems();
  const active = items.filter((item) => item.status === 'open' || item.status === 'in_progress');

  if (active.length === 0) {
    logger.debug('digest rule: no active items');
    return;
  }

  const url = `${config.pwaOrigin}/re-entry?reason=digest-review`;
  logger.info({ activeCount: active.length, rule: 'digest' }, 'notification generated');
  await deliverToStakeholderSubscriptions(
    repository,
    push,
    {
      title: 'Household inbox digest — Olivia',
      body: `You have ${active.length} active item${active.length === 1 ? '' : 's'} in your household inbox.`,
      url,
      tag: 'digest'
    },
    logger
  );
}

export function startBackgroundJobs(
  repository: InboxRepository,
  push: PushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger
): () => void {
  if (!config.notificationsEnabled) {
    logger.info('notification jobs are disabled (OLIVIA_NOTIFICATIONS_ENABLED is not set)');
    return () => {};
  }

  if (!push.isConfigured()) {
    logger.warn('notifications are enabled but VAPID keys are not configured; push delivery will be a no-op');
  }

  logger.info({ intervalMs: config.notificationIntervalMs }, 'starting notification background jobs');

  const runOnce = async () => {
    try {
      await evaluateDueSoonRule(repository, push, config, logger);
      await evaluateStaleItemRule(repository, push, config, logger);
      await evaluateDigestRule(repository, push, config, logger);
      await evaluateDueReminderRule(repository, push, config, logger);
      await evaluateDailySummaryRule(repository, push, config, logger);
    } catch (error) {
      logger.error({ error }, 'notification job run failed');
    }
  };

  const intervalId = setInterval(() => void runOnce(), config.notificationIntervalMs);

  return () => clearInterval(intervalId);
}
