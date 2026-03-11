import type { FastifyBaseLogger } from 'fastify';
import { buildSuggestions } from '@olivia/domain';
import type { AppConfig } from './config';
import type { PushProvider, PushSubscriptionPayload } from './push';
import type { InboxRepository } from './repository';

type NotificationRecord = {
  rule: 'due_soon' | 'stale_item' | 'digest';
  itemId?: string;
  itemTitle?: string;
  delivered: boolean;
  error?: string;
  timestamp: string;
};

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
    } catch (error) {
      logger.error({ error }, 'notification job run failed');
    }
  };

  const intervalId = setInterval(() => void runOnce(), config.notificationIntervalMs);

  return () => clearInterval(intervalId);
}
