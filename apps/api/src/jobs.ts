import type { FastifyBaseLogger } from 'fastify';
import { buildSuggestions, computeCompletionWindow, getCurrentLocalHour, groupReminders, rankRemindersForSurfacing, skipRoutineOccurrence, completeReminderOccurrence, snoozeReminder, sortNudgesByPriority } from '@olivia/domain';
import { COMPLETION_WINDOW_MAX_HOLD_DAYS, COMPLETION_WINDOW_SAMPLE_SIZE, NUDGE_SNOOZE_INTERVAL_HOURS } from '@olivia/contracts';
import type { Nudge, Reminder, AutomationRule } from '@olivia/contracts';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from './config';
import type { PushProvider, ApnsPushProvider, NotificationPayload, PushSubscriptionPayload } from './push';
import { isApnsSubscriptionPayload } from './push';
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
/** Placeholder userId for household-level notification delivery deduplication. */
const HOUSEHOLD_DELIVERY_USER_ID = 'household';

function isPushSubscriptionPayload(payload: Record<string, unknown>): payload is PushSubscriptionPayload {
  return (
    typeof payload.endpoint === 'string' &&
    payload.keys !== null &&
    typeof payload.keys === 'object' &&
    typeof (payload.keys as Record<string, unknown>).p256dh === 'string' &&
    typeof (payload.keys as Record<string, unknown>).auth === 'string'
  );
}

async function deliverToAllHouseholdSubscriptions(
  repository: InboxRepository,
  push: PushProvider,
  apns: ApnsPushProvider,
  notification: { title: string; body: string; url: string; tag: string },
  logger: FastifyBaseLogger
): Promise<NotificationRecord[]> {
  const subscriptions = repository.listAllNotificationSubscriptions();
  const results: NotificationRecord[] = [];

  for (const subscription of subscriptions) {
    const record: NotificationRecord = {
      rule: notification.tag.startsWith('digest') ? 'digest' : notification.tag.startsWith('stale') ? 'stale_item' : 'due_soon',
      itemId: undefined,
      itemTitle: undefined,
      delivered: false,
      timestamp: new Date().toISOString()
    };

    try {
      if (isApnsSubscriptionPayload(subscription.payload)) {
        if (!apns.isConfigured()) {
          logger.warn({ subscriptionId: subscription.id }, 'APNs subscription found but APNs provider is not configured; skipping');
          continue;
        }
        await apns.send(subscription.payload.token, notification);
      } else if (isPushSubscriptionPayload(subscription.payload)) {
        await push.send(subscription.payload, notification);
      } else {
        logger.warn({ subscriptionId: subscription.id }, 'notification subscription has unknown payload type; skipping');
        continue;
      }
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
  // Check preferences for all users — if any household member has enabled, deliver
  for (const preferences of repository.listAllReminderNotificationPreferences()) {
    if (!preferences.enabled) continue;
    const enabled = notificationType === 'due_reminder' ? preferences.dueRemindersEnabled : preferences.dailySummaryEnabled;
    if (enabled) return true;
  }
  return false;
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
  apns: ApnsPushProvider,
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
    if (repository.hasNotificationDelivery('due_reminder', HOUSEHOLD_DELIVERY_USER_ID, deliveryBucket)) {
      logger.debug({ reminderId: reminder.id, deliveryBucket }, 'due-reminder rule: already delivered for this occurrence');
      continue;
    }

    const title = reminder.state === 'overdue' ? 'Reminder overdue — Olivia' : 'Reminder due — Olivia';
    const body = reminder.linkedInboxItem
      ? `${reminder.title} — linked to "${reminder.linkedInboxItem.title}".`
      : reminder.title;
    const url = `${config.pwaOrigin}/re-entry?reason=reminder-review&reminderId=${reminder.id}`;
    const results = await deliverToAllHouseholdSubscriptions(
      repository,
      push,
      apns,
      {
        title,
        body,
        url,
        tag: `due-reminder-${deliveryBucket}`
      },
      logger
    );

    if (results.some((result) => result.delivered)) {
      repository.recordNotificationDelivery('due_reminder', HOUSEHOLD_DELIVERY_USER_ID, reminder.id, deliveryBucket, now.toISOString());
      logger.info({ reminderId: reminder.id, deliveryBucket }, 'due-reminder rule: delivered');
    }
  }
}

export async function evaluateDailySummaryRule(
  repository: InboxRepository,
  push: PushProvider,
  apns: ApnsPushProvider,
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
  if (repository.hasNotificationDelivery('daily_summary', HOUSEHOLD_DELIVERY_USER_ID, deliveryBucket)) {
    logger.debug({ deliveryBucket }, 'daily-summary rule: already delivered today');
    return;
  }

  const results = await deliverToAllHouseholdSubscriptions(
    repository,
    push,
    apns,
    {
      title: 'Daily reminder summary — Olivia',
      body: buildDailySummaryBody(grouped),
      url: `${config.pwaOrigin}/re-entry?reason=reminders-daily-summary`,
      tag: `daily-summary-${deliveryBucket}`
    },
    logger
  );

  if (results.some((result) => result.delivered)) {
    repository.recordNotificationDelivery('daily_summary', HOUSEHOLD_DELIVERY_USER_ID, null, deliveryBucket, now.toISOString());
    logger.info({ deliveryBucket }, 'daily-summary rule: delivered');
  }
}

export async function evaluateDueSoonRule(
  repository: InboxRepository,
  push: PushProvider,
  apns: ApnsPushProvider,
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
    await deliverToAllHouseholdSubscriptions(
      repository,
      push,
      apns,
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
  apns: ApnsPushProvider,
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
    await deliverToAllHouseholdSubscriptions(
      repository,
      push,
      apns,
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
  apns: ApnsPushProvider,
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
  await deliverToAllHouseholdSubscriptions(
    repository,
    push,
    apns,
    {
      title: 'Household inbox digest — Olivia',
      body: `You have ${active.length} active item${active.length === 1 ? '' : 's'} in your household inbox.`,
      url,
      tag: 'digest'
    },
    logger
  );
}

// ─── Nudge Push (H5 Phase 2) ────────────────────────────────────────────────

function buildNudgeNotification(nudge: Nudge, pwaOrigin: string): NotificationPayload {
  let body: string;
  if (nudge.entityType === 'routine') {
    body = `${nudge.entityName} routine is overdue`;
  } else if (nudge.entityType === 'planningRitual') {
    body = `${nudge.entityName} is overdue`;
  } else {
    body = `${nudge.entityName} — reminder approaching`;
  }

  const payload: NotificationPayload = {
    title: 'Olivia household nudge',
    body,
    url: `${pwaOrigin}/`,
    tag: `nudge-${nudge.entityType}-${nudge.entityId}`,
    entityId: nudge.entityId,
    entityType: nudge.entityType,
  };

  // Add action buttons for routine and reminder nudges (not planning rituals)
  if (nudge.entityType === 'routine') {
    payload.actions = [
      { action: 'mark_done', title: 'Mark done' },
      { action: 'skip', title: 'Skip' },
    ];
  } else if (nudge.entityType === 'reminder') {
    payload.actions = [
      { action: 'done', title: 'Done' },
      { action: 'snooze', title: 'Snooze' },
    ];
  }

  return payload;
}

export function shouldHoldNudge(
  nudge: Nudge,
  repository: InboxRepository,
  config: AppConfig,
  logger: FastifyBaseLogger,
  now: Date
): boolean {
  if (nudge.entityType !== 'routine') return false;
  const maxHoldMs = COMPLETION_WINDOW_MAX_HOLD_DAYS * 24 * 60 * 60 * 1000;
  const overdueSinceDate = nudge.overdueSince ? new Date(nudge.overdueSince) : null;
  const overdueAge = overdueSinceDate ? now.getTime() - overdueSinceDate.getTime() : 0;
  if (overdueAge > maxHoldMs) return false;

  const timestamps = repository.getRoutineCompletionTimestamps(
    nudge.entityId, COMPLETION_WINDOW_SAMPLE_SIZE
  );
  const currentHour = getCurrentLocalHour(now, config.householdTimezone);
  const windowResult = computeCompletionWindow(timestamps, config.householdTimezone, currentHour);
  if (windowResult.decision === 'hold') {
    logger.debug({
      entityId: nudge.entityId,
      windowStart: windowResult.windowStartHour,
      currentHour,
    }, 'nudge push held: before completion window');
    return true;
  }
  return false;
}

/**
 * Evaluates enabled automation rules against the current nudge set.
 * For each matching rule, executes the configured action and logs the result.
 * Called on the same 30-minute cycle as nudge push evaluation.
 */
export function evaluateAutomationRules(
  repository: InboxRepository,
  logger: FastifyBaseLogger,
  now: Date = new Date()
): void {
  const rules = repository.listEnabledAutomationRules();
  if (rules.length === 0) return;

  const nudges = repository.getNudgePayloads(now);
  if (nudges.length === 0) return;

  // Use the start of the current evaluation cycle as the dedup boundary
  const cycleStart = now.toISOString();

  for (const nudge of nudges) {
    const matchingRules = rules.filter((rule) => ruleMatchesNudge(rule, nudge, repository, now));

    for (const rule of matchingRules) {
      // Dedup: skip if this rule already fired for this entity in the current cycle window (30 min)
      const dedupSince = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
      if (repository.hasRecentAutomationExecution(rule.id, nudge.entityId, dedupSince)) {
        continue;
      }

      try {
        executeAutomationAction(rule, nudge, repository, logger, now);
        repository.createAutomationLogEntry({
          id: randomUUID(),
          ruleId: rule.id,
          entityType: nudge.entityType,
          entityId: nudge.entityId,
          actionType: rule.actionType,
          executedAt: cycleStart,
          userId: rule.userId
        });
        logger.info(
          { ruleId: rule.id, entityId: nudge.entityId, action: rule.actionType },
          'automation rule executed'
        );
      } catch (error) {
        logger.warn(
          { ruleId: rule.id, entityId: nudge.entityId, error },
          'automation rule execution failed (non-fatal)'
        );
      }
    }
  }

  // Purge old log entries
  const purged = repository.purgeOldAutomationLog();
  if (purged > 0) {
    logger.info({ purged }, 'purged old automation log entries');
  }
}

function ruleMatchesNudge(
  rule: AutomationRule,
  nudge: Nudge,
  repository: InboxRepository,
  now: Date
): boolean {
  // Scope check: if rule is scoped to a specific entity, it must match
  if (rule.scopeType === 'specific' && rule.scopeEntityId !== nudge.entityId) {
    return false;
  }

  switch (rule.triggerType) {
    case 'routine_overdue_days': {
      if (nudge.entityType !== 'routine') return false;
      if (!nudge.overdueSince) return false;
      const overdueDate = new Date(nudge.overdueSince);
      const daysOverdue = Math.floor((now.getTime() - overdueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue >= rule.triggerThreshold;
    }
    case 'reminder_snooze_count': {
      if (nudge.entityType !== 'reminder') return false;
      const snoozeCount = repository.getReminderSnoozeCount(nudge.entityId);
      return snoozeCount >= rule.triggerThreshold;
    }
    case 'reminder_overdue_days': {
      if (nudge.entityType !== 'reminder') return false;
      if (!nudge.overdueSince) return false;
      const overdueDate = new Date(nudge.overdueSince);
      const daysOverdue = Math.floor((now.getTime() - overdueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue >= rule.triggerThreshold;
    }
    default:
      return false;
  }
}

function executeAutomationAction(
  rule: AutomationRule,
  nudge: Nudge,
  repository: InboxRepository,
  _logger: FastifyBaseLogger,
  now: Date
): void {
  switch (rule.actionType) {
    case 'skip_routine_occurrence': {
      const routine = repository.getRoutine(nudge.entityId);
      if (!routine) throw new Error(`Routine ${nudge.entityId} not found`);
      const { updatedRoutine, occurrence } = skipRoutineOccurrence(routine, rule.userId, now);
      repository.completeRoutineOccurrence(updatedRoutine, occurrence, routine.version);
      break;
    }
    case 'resolve_reminder': {
      const reminder = repository.getReminder(nudge.entityId, now);
      if (!reminder) throw new Error(`Reminder ${nudge.entityId} not found`);
      const timeline = repository.listReminderTimeline(nudge.entityId);
      const mutation = completeReminderOccurrence(reminder, now, timeline);
      const attributedTimeline = mutation.timelineEntries.map((e) => ({ ...e, userId: rule.userId }));
      repository.updateReminder(mutation.reminder, attributedTimeline, reminder.version);
      break;
    }
    case 'snooze_reminder': {
      const reminder = repository.getReminder(nudge.entityId, now);
      if (!reminder) throw new Error(`Reminder ${nudge.entityId} not found`);
      const snoozedUntil = new Date(now.getTime() + NUDGE_SNOOZE_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
      const timeline = repository.listReminderTimeline(nudge.entityId);
      const mutation = snoozeReminder(reminder, snoozedUntil, now, timeline);
      const attributedTimeline = mutation.timelineEntries.map((e) => ({ ...e, userId: rule.userId }));
      repository.updateReminder(mutation.reminder, attributedTimeline, reminder.version);
      break;
    }
    default:
      throw new Error(`Unknown action type: ${rule.actionType}`);
  }
}

export async function evaluateNudgePushRule(
  repository: InboxRepository,
  push: PushProvider,
  apns: ApnsPushProvider,
  config: AppConfig,
  logger: FastifyBaseLogger,
  now: Date = new Date()
): Promise<void> {
  if (!push.isConfigured() && !apns.isConfigured()) {
    logger.debug('nudge push rule: no push providers configured, skipping');
    return;
  }

  const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
  const PURGE_RETENTION_MS = 48 * 60 * 60 * 1000; // 48 hours

  repository.purgeStalePushNotificationLog(PURGE_RETENTION_MS, now);

  const nudges = sortNudgesByPriority(repository.getNudgePayloads(now));
  if (nudges.length === 0) {
    logger.debug('nudge push rule: no active nudges');
    return;
  }

  // Unified subscription delivery — one table, dispatch by payload type
  const allSubscriptions = repository.listAllNotificationSubscriptions();

  for (const nudge of nudges) {
    if (shouldHoldNudge(nudge, repository, config, logger, now)) continue;

    // Per-user targeting: reminder nudges go to the creator's subscriptions only;
    // household-wide nudges (routines, planning rituals, freshness) go to all.
    let targetSubscriptions = allSubscriptions;
    if (nudge.entityType === 'reminder') {
      const creatorUserId = repository.getReminderCreatorUserId(nudge.entityId);
      if (creatorUserId) {
        const userSubs = repository.listNotificationSubscriptions(creatorUserId);
        if (userSubs.length > 0) {
          targetSubscriptions = userSubs;
        }
        // Fall back to all subscriptions if creator has no subscriptions
      }
    }

    const notification = buildNudgeNotification(nudge, config.pwaOrigin);

    for (const subscription of targetSubscriptions) {
      const alreadySent = repository.hasPushNotificationLog(
        subscription.id, nudge.entityType, nudge.entityId, DEDUP_WINDOW_MS, now
      );
      if (alreadySent) continue;

      try {
        const payload = subscription.payload as Record<string, unknown>;
        if (isApnsSubscriptionPayload(payload)) {
          if (!apns.isConfigured()) continue;
          await apns.send(payload.token, notification);
        } else if (isPushSubscriptionPayload(payload)) {
          if (!push.isConfigured()) continue;
          await push.send(payload, notification);
        } else {
          logger.warn({ subscriptionId: subscription.id }, 'nudge push: unknown payload type; skipping');
          continue;
        }
        repository.recordPushNotificationLog(subscription.id, nudge.entityType, nudge.entityId, now);
        logger.info({ subscriptionId: subscription.id, entityType: nudge.entityType, entityId: nudge.entityId }, 'nudge push delivered');
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 410) {
          repository.deleteNotificationSubscriptionByEndpoint(subscription.endpoint);
          logger.info({ subscriptionId: subscription.id }, 'nudge push: 410 Gone — subscription removed');
          break;
        }
        logger.warn({ subscriptionId: subscription.id, entityId: nudge.entityId, error }, 'nudge push delivery failed (non-fatal)');
      }
    }
  }
}

export function startBackgroundJobs(
  repository: InboxRepository,
  push: PushProvider,
  apns: ApnsPushProvider,
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
      await evaluateDueSoonRule(repository, push, apns, config, logger);
      await evaluateStaleItemRule(repository, push, apns, config, logger);
      await evaluateDigestRule(repository, push, apns, config, logger);
      await evaluateDueReminderRule(repository, push, apns, config, logger);
      await evaluateDailySummaryRule(repository, push, apns, config, logger);
    } catch (error) {
      logger.error({ error }, 'notification job run failed');
    }
  };

  const intervalId = setInterval(() => void runOnce(), config.notificationIntervalMs);

  // Nudge push scheduler (separate interval from reminder notifications)
  const nudgePushIntervalMs = config.nudgePushIntervalMs ?? 1_800_000;
  logger.info({ nudgePushIntervalMs }, 'starting nudge push scheduler');
  const nudgeIntervalId = setInterval(() => {
    void (async () => {
      try {
        evaluateAutomationRules(repository, logger);
        await evaluateNudgePushRule(repository, push, apns, config, logger);
      } catch (error) {
        logger.error({ error }, 'nudge push scheduler run failed');
      }
    })();
  }, nudgePushIntervalMs);

  return () => {
    clearInterval(intervalId);
    clearInterval(nudgeIntervalId);
    apns.close();
  };
}
