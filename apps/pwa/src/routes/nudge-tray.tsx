import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { addHours } from 'date-fns';
import { ArrowsClockwise, ClockCountdown } from '@phosphor-icons/react';
import type { Nudge } from '@olivia/contracts';
import { NUDGE_MAX_DISPLAY_COUNT, NUDGE_SNOOZE_INTERVAL_HOURS, FRESHNESS_NUDGE_MAX_PER_DAY } from '@olivia/contracts';
import {
  loadNudges,
  submitRoutineSkip,
  completeRoutineOccurrenceCommand,
  completeReminderCommand,
  snoozeReminderCommand
} from '../lib/sync';
import { dismissNudge, filterDismissed, pruneStaleNudgeDismissals, filterFreshnessNudgesByThrottle, clientDb } from '../lib/client-db';
import { confirmFreshness, archiveFreshnessEntity } from '../lib/api';
import { usePushOptIn } from '../lib/push-opt-in';
import { showErrorToast } from '../lib/error-toast';
import { reportError, errorMessage, errorStack } from '../lib/error-reporter';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ─── useNudges hook ────────────────────────────────────────────────────────────

export function useNudges() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      await pruneStaleNudgeDismissals();
      const raw = await loadNudges();
      const filtered = await filterDismissed(raw);
      // Apply 2/day throttle to freshness nudges
      const nonFreshness = filtered.filter((n) => n.entityType !== 'freshness');
      const freshnessOnly = filtered.filter((n) => n.entityType === 'freshness');
      const throttledFreshness = await filterFreshnessNudgesByThrottle(freshnessOnly, FRESHNESS_NUDGE_MAX_PER_DAY);
      setNudges([...nonFreshness, ...throttledFreshness]);
    } catch (err) {
      reportError({ message: errorMessage(err), stack: errorStack(err), context: 'nudge-poll' });
    }
  }, []);

  useEffect(() => {
    void poll();

    const startPolling = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        void poll();
        startPolling();
      }
    };

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [poll]);

  const dismiss = useCallback(async (entityId: string) => {
    await dismissNudge(entityId);
    setNudges((prev) => prev.filter((n) => n.entityId !== entityId));
  }, []);

  const removeNudge = useCallback((entityId: string) => {
    setNudges((prev) => prev.filter((n) => n.entityId !== entityId));
  }, []);

  return { nudges, dismiss, removeNudge };
}

// ─── NudgeCard ─────────────────────────────────────────────────────────────────

interface NudgeCardProps {
  nudge: Nudge;
  isSpouse: boolean;
  onDismiss: (entityId: string) => void;
  onDone: (entityId: string) => void;
  onSkip?: (entityId: string) => void;
  onSnooze?: (entityId: string) => void;
  onStartReview?: (entityId: string) => void;
  onStillActive?: (entityId: string) => void;
  onArchive?: (entityId: string) => void;
}

function NudgeCard({ nudge, isSpouse, onDismiss, onDone, onSkip, onSnooze, onStartReview, onStillActive, onArchive }: NudgeCardProps) {
  const [exiting, setExiting] = useState(false);

  const handleAction = (fn: (entityId: string) => void) => {
    setExiting(true);
    setTimeout(() => fn(nudge.entityId), 200);
  };

  const cardStyle: React.CSSProperties = exiting
    ? { opacity: 0, height: 0, overflow: 'hidden', transition: 'opacity 200ms ease-in, height 200ms ease-in', marginBottom: 0 }
    : {};

  if (nudge.entityType === 'routine') {
    return (
      <div className="nudge-card nudge-card--routine" style={cardStyle} role="article" aria-label={nudge.entityName}>
        <div className="nudge-card__stripe nudge-card__stripe--mint" />
        <div className="nudge-card__body">
          <div className="nudge-card__header">
            <div className="nudge-card__icon-wrap nudge-card__icon-wrap--mint" aria-hidden="true">
              <span className="nudge-card__icon"><ArrowsClockwise size={18} /></span>
            </div>
            <div className="nudge-card__text">
              <div className="nudge-card__name">{nudge.entityName}</div>
              <div className="nudge-card__trigger">{nudge.triggerReason}</div>
            </div>
            <button
              type="button"
              className="nudge-card__dismiss"
              aria-label="Dismiss nudge"
              disabled={isSpouse}
              onClick={() => handleAction(onDismiss)}
            >
              ×
            </button>
          </div>
          <div className="nudge-card__actions">
            <button
              type="button"
              className="nudge-card__btn nudge-card__btn--primary"
              disabled={isSpouse}
              onClick={() => handleAction(onDone)}
            >
              Mark done
            </button>
            <button
              type="button"
              className="nudge-card__btn nudge-card__btn--ghost"
              disabled={isSpouse}
              onClick={() => onSkip && handleAction(onSkip)}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (nudge.entityType === 'reminder') {
    return (
      <div className="nudge-card nudge-card--reminder" style={cardStyle} role="article" aria-label={nudge.entityName}>
        <div className="nudge-card__stripe nudge-card__stripe--rose" />
        <div className="nudge-card__body">
          <div className="nudge-card__header">
            <div className="nudge-card__icon-wrap nudge-card__icon-wrap--rose" aria-hidden="true">
              <span className="nudge-card__icon">🔔</span>
            </div>
            <div className="nudge-card__text">
              <div className="nudge-card__name">{nudge.entityName}</div>
              <div className="nudge-card__trigger">{nudge.triggerReason}</div>
            </div>
            <button
              type="button"
              className="nudge-card__dismiss"
              aria-label="Dismiss nudge"
              disabled={isSpouse}
              onClick={() => handleAction(onDismiss)}
            >
              ×
            </button>
          </div>
          <div className="nudge-card__actions">
            <button
              type="button"
              className="nudge-card__btn nudge-card__btn--primary"
              disabled={isSpouse}
              onClick={() => handleAction(onDone)}
            >
              Done
            </button>
            <button
              type="button"
              className="nudge-card__btn nudge-card__btn--ghost"
              disabled={isSpouse}
              onClick={() => onSnooze && handleAction(onSnooze)}
            >
              Snooze
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (nudge.entityType === 'freshness') {
    return (
      <div className="nudge-card nudge-card--freshness" style={cardStyle} role="article" aria-label={nudge.entityName}>
        <div className="nudge-card__stripe nudge-card__stripe--amber" />
        <div className="nudge-card__body">
          <div className="nudge-card__header">
            <div className="nudge-card__icon-wrap nudge-card__icon-wrap--amber" aria-hidden="true">
              <span className="nudge-card__icon"><ClockCountdown size={18} /></span>
            </div>
            <div className="nudge-card__text">
              <div className="nudge-card__name">{nudge.entityName}</div>
              <div className="nudge-card__trigger">{nudge.triggerReason}</div>
            </div>
            <button
              type="button"
              className="nudge-card__dismiss"
              aria-label="Dismiss nudge"
              disabled={isSpouse}
              onClick={() => handleAction(onDismiss)}
            >
              ×
            </button>
          </div>
          <div className="nudge-card__actions">
            <button
              type="button"
              className="nudge-card__btn nudge-card__btn--primary"
              disabled={isSpouse}
              onClick={() => onStillActive && handleAction(onStillActive)}
            >
              Still active
            </button>
            <button
              type="button"
              className="nudge-card__btn nudge-card__btn--ghost"
              disabled={isSpouse}
              onClick={() => onArchive && handleAction(onArchive)}
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    );
  }

  // planningRitual
  return (
    <div className="nudge-card nudge-card--ritual" style={cardStyle} role="article" aria-label={nudge.entityName}>
      <div className="nudge-card__stripe nudge-card__stripe--violet" />
      <div className="nudge-card__body">
        <div className="nudge-card__header">
          <div className="nudge-card__icon-wrap nudge-card__icon-wrap--violet" aria-hidden="true">
            <span className="nudge-card__icon">📋</span>
          </div>
          <div className="nudge-card__text">
            <div className="nudge-card__name">{nudge.entityName}</div>
            <div className="nudge-card__trigger">{nudge.triggerReason}</div>
          </div>
          <button
            type="button"
            className="nudge-card__dismiss"
            aria-label="Dismiss nudge"
            disabled={isSpouse}
            onClick={() => handleAction(onDismiss)}
          >
            ×
          </button>
        </div>
        <div className="nudge-card__actions">
          <button
            type="button"
            className="nudge-card__btn nudge-card__btn--primary nudge-card__btn--full"
            disabled={isSpouse}
            onClick={() => onStartReview && handleAction(onStartReview)}
          >
            Start review →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PushOptInPrompt ────────────────────────────────────────────────────────────

function PushOptInPrompt() {
  const { state, requestPermission, dismiss } = usePushOptIn();

  if (state !== 'prompt') return null;

  return (
    <div className="push-opt-in-prompt">
      <p>
        Get notified about routines and reminders that need attention, even when Olivia is closed.
        {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
          <span> Note: on iOS, Olivia must be added to your Home Screen for push notifications to work.</span>
        )}
      </p>
      <div className="push-opt-in-actions">
        <button type="button" onClick={() => void requestPermission()}>Turn on</button>
        <button type="button" onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}

// ─── NudgeTray ─────────────────────────────────────────────────────────────────

interface NudgeTrayProps {
  nudges: Nudge[];
  onDismiss: (entityId: string) => Promise<void>;
  onRemove: (entityId: string) => void;
}

export function NudgeTray({ nudges, onDismiss, onRemove }: NudgeTrayProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSpouse = false;

  const displayed = nudges.slice(0, NUDGE_MAX_DISPLAY_COUNT);
  const overflowCount = nudges.length - NUDGE_MAX_DISPLAY_COUNT;

  const handleDismiss = useCallback(async (entityId: string) => {
    await onDismiss(entityId);
  }, [onDismiss]);

  const handleRoutineDone = useCallback(async (entityId: string) => {
    const nudge = nudges.find((n) => n.entityId === entityId);
    if (!nudge) return;
    try {
      // Need to get version from cached routine
      const routine = await clientDb.routines.get(entityId);
      if (!routine) { onRemove(entityId); return; }
      await completeRoutineOccurrenceCommand(entityId, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      onRemove(entityId);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not complete routine');
      onRemove(entityId);
    }
  }, [nudges, queryClient, onRemove]);

  const handleRoutineSkip = useCallback(async (entityId: string) => {
    try {
      const routine = await clientDb.routines.get(entityId);
      if (!routine) { onRemove(entityId); return; }
      await submitRoutineSkip(entityId, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      onRemove(entityId);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not skip routine');
      onRemove(entityId);
    }
  }, [queryClient, onRemove]);

  const handleReminderDone = useCallback(async (entityId: string) => {
    try {
      const reminder = await clientDb.reminders.get(entityId);
      if (!reminder) { onRemove(entityId); return; }
      await completeReminderCommand(entityId, reminder.version);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      onRemove(entityId);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not complete reminder');
      onRemove(entityId);
    }
  }, [queryClient, onRemove]);

  const handleReminderSnooze = useCallback(async (entityId: string) => {
    try {
      const reminder = await clientDb.reminders.get(entityId);
      if (!reminder) { onRemove(entityId); return; }
      const snoozedUntil = addHours(new Date(), NUDGE_SNOOZE_INTERVAL_HOURS).toISOString();
      await snoozeReminderCommand(entityId, reminder.version, snoozedUntil);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      onRemove(entityId);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not snooze reminder');
      onRemove(entityId);
    }
  }, [queryClient, onRemove]);

  const handleStartReview = useCallback(async (entityId: string) => {
    const occurrenceId = crypto.randomUUID();
    await void navigate({ to: '/routines/$routineId/review/$occurrenceId', params: { routineId: entityId, occurrenceId } });
  }, [navigate]);

  const handleStillActive = useCallback(async (entityId: string) => {
    const nudge = nudges.find((n) => n.entityId === entityId);
    if (!nudge || !nudge.entitySubType) { onRemove(entityId); return; }
    try {
      // Get version from the appropriate cached entity
      let version = 1;
      if (nudge.entitySubType === 'inbox') {
        const item = await clientDb.items.get(entityId);
        version = item?.version ?? 1;
      } else if (nudge.entitySubType === 'routine') {
        const routine = await clientDb.routines.get(entityId);
        version = routine?.version ?? 1;
      } else if (nudge.entitySubType === 'reminder') {
        const reminder = await clientDb.reminders.get(entityId);
        version = reminder?.version ?? 1;
      } else if (nudge.entitySubType === 'list') {
        const list = await clientDb.sharedLists.get(entityId);
        version = list?.version ?? 1;
      }
      await confirmFreshness(nudge.entitySubType, entityId, version);
      onRemove(entityId);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not confirm freshness');
      onRemove(entityId);
    }
  }, [nudges, onRemove]);

  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const handleArchive = useCallback(async (entityId: string) => {
    setArchiveTarget(entityId);
  }, []);

  const confirmArchive = useCallback(async () => {
    if (!archiveTarget) return;
    const nudge = nudges.find((n) => n.entityId === archiveTarget);
    if (!nudge || !nudge.entitySubType) { onRemove(archiveTarget); setArchiveTarget(null); return; }
    try {
      let version = 1;
      if (nudge.entitySubType === 'inbox') {
        const item = await clientDb.items.get(archiveTarget);
        version = item?.version ?? 1;
      } else if (nudge.entitySubType === 'routine') {
        const routine = await clientDb.routines.get(archiveTarget);
        version = routine?.version ?? 1;
      } else if (nudge.entitySubType === 'reminder') {
        const reminder = await clientDb.reminders.get(archiveTarget);
        version = reminder?.version ?? 1;
      } else if (nudge.entitySubType === 'list') {
        const list = await clientDb.sharedLists.get(archiveTarget);
        version = list?.version ?? 1;
      }
      await archiveFreshnessEntity(nudge.entitySubType, archiveTarget, version);
      onRemove(archiveTarget);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not archive');
      onRemove(archiveTarget);
    }
    setArchiveTarget(null);
  }, [archiveTarget, nudges, onRemove]);

  if (nudges.length === 0) return null;

  return (
    <div className="nudge-tray" role="region" aria-label="Household nudges">
      <PushOptInPrompt />
      {displayed.map((nudge) => (
        <NudgeCard
          key={nudge.entityId}
          nudge={nudge}
          isSpouse={isSpouse}
          onDismiss={(id) => void handleDismiss(id)}
          onDone={nudge.entityType === 'routine' ? (id) => void handleRoutineDone(id) : (id) => void handleReminderDone(id)}
          onSkip={nudge.entityType === 'routine' ? (id) => void handleRoutineSkip(id) : undefined}
          onSnooze={nudge.entityType === 'reminder' ? (id) => void handleReminderSnooze(id) : undefined}
          onStartReview={nudge.entityType === 'planningRitual' ? (id) => void handleStartReview(id) : undefined}
          onStillActive={nudge.entityType === 'freshness' ? (id) => void handleStillActive(id) : undefined}
          onArchive={nudge.entityType === 'freshness' ? (id) => void handleArchive(id) : undefined}
        />
      ))}
      {/* Archive confirmation dialog for freshness nudges */}
      {archiveTarget && (
        <div className="freshness-archive-confirm" role="alertdialog" aria-label="Archive confirmation">
          <div className="freshness-archive-confirm__backdrop" onClick={() => setArchiveTarget(null)} />
          <div className="freshness-archive-confirm__sheet">
            <div className="freshness-archive-confirm__title">
              Archive {nudges.find((n) => n.entityId === archiveTarget)?.entityName ?? 'this item'}?
            </div>
            <div className="freshness-archive-confirm__body">
              This item will be archived. You can restore it later if needed.
            </div>
            <div className="freshness-archive-confirm__actions">
              <button type="button" className="btn-secondary" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={() => void confirmArchive()}>Archive</button>
            </div>
          </div>
        </div>
      )}
      {overflowCount > 0 && (
        <div className="nudge-tray__overflow" aria-label={`${overflowCount} more items`}>
          + {overflowCount} more {overflowCount === 1 ? 'item' : 'items'} →
        </div>
      )}
    </div>
  );
}
