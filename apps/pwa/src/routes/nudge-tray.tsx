import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { addHours } from 'date-fns';
import type { Nudge, ActorRole } from '@olivia/contracts';
import { NUDGE_MAX_DISPLAY_COUNT, NUDGE_SNOOZE_INTERVAL_HOURS } from '@olivia/contracts';
import {
  loadNudges,
  submitRoutineSkip,
  completeRoutineOccurrenceCommand,
  completeReminderCommand,
  snoozeReminderCommand
} from '../lib/sync';
import { dismissNudge, filterDismissed, pruneStaleNudgeDismissals, clientDb } from '../lib/client-db';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ─── useNudges hook ────────────────────────────────────────────────────────────

export function useNudges(role: ActorRole) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    await pruneStaleNudgeDismissals();
    const raw = await loadNudges(role);
    const filtered = await filterDismissed(raw);
    setNudges(filtered);
  }, [role]);

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
  role: ActorRole;
  isSpouse: boolean;
  onDismiss: (entityId: string) => void;
  onDone: (entityId: string) => void;
  onSkip?: (entityId: string) => void;
  onSnooze?: (entityId: string) => void;
  onStartReview?: (entityId: string) => void;
}

function NudgeCard({ nudge, isSpouse, onDismiss, onDone, onSkip, onSnooze, onStartReview }: NudgeCardProps) {
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
              <span className="nudge-card__icon">↻</span>
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

// ─── NudgeTray ─────────────────────────────────────────────────────────────────

interface NudgeTrayProps {
  role: ActorRole;
  nudges: Nudge[];
  onDismiss: (entityId: string) => Promise<void>;
  onRemove: (entityId: string) => void;
}

export function NudgeTray({ role, nudges, onDismiss, onRemove }: NudgeTrayProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSpouse = role === 'spouse';

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
      await completeRoutineOccurrenceCommand(role, entityId, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      onRemove(entityId);
    } catch {
      onRemove(entityId);
    }
  }, [nudges, role, queryClient, onRemove]);

  const handleRoutineSkip = useCallback(async (entityId: string) => {
    try {
      const routine = await clientDb.routines.get(entityId);
      if (!routine) { onRemove(entityId); return; }
      await submitRoutineSkip(role, entityId, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      onRemove(entityId);
    } catch {
      onRemove(entityId);
    }
  }, [role, queryClient, onRemove]);

  const handleReminderDone = useCallback(async (entityId: string) => {
    try {
      const reminder = await clientDb.reminders.get(entityId);
      if (!reminder) { onRemove(entityId); return; }
      await completeReminderCommand(role, entityId, reminder.version);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      onRemove(entityId);
    } catch {
      onRemove(entityId);
    }
  }, [role, queryClient, onRemove]);

  const handleReminderSnooze = useCallback(async (entityId: string) => {
    try {
      const reminder = await clientDb.reminders.get(entityId);
      if (!reminder) { onRemove(entityId); return; }
      const snoozedUntil = addHours(new Date(), NUDGE_SNOOZE_INTERVAL_HOURS).toISOString();
      await snoozeReminderCommand(role, entityId, reminder.version, snoozedUntil);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      onRemove(entityId);
    } catch {
      onRemove(entityId);
    }
  }, [role, queryClient, onRemove]);

  const handleStartReview = useCallback(async (entityId: string) => {
    const occurrenceId = crypto.randomUUID();
    await void navigate({ to: '/routines/$routineId/review/$occurrenceId', params: { routineId: entityId, occurrenceId } });
  }, [navigate]);

  if (nudges.length === 0) return null;

  return (
    <div className="nudge-tray" role="region" aria-label="Household nudges">
      {displayed.map((nudge) => (
        <NudgeCard
          key={nudge.entityId}
          nudge={nudge}
          role={role}
          isSpouse={isSpouse}
          onDismiss={(id) => void handleDismiss(id)}
          onDone={nudge.entityType === 'routine' ? (id) => void handleRoutineDone(id) : (id) => void handleReminderDone(id)}
          onSkip={nudge.entityType === 'routine' ? (id) => void handleRoutineSkip(id) : undefined}
          onSnooze={nudge.entityType === 'reminder' ? (id) => void handleReminderSnooze(id) : undefined}
          onStartReview={nudge.entityType === 'planningRitual' ? (id) => void handleStartReview(id) : undefined}
        />
      ))}
      {overflowCount > 0 && (
        <div className="nudge-tray__overflow" aria-label={`${overflowCount} more items`}>
          + {overflowCount} more {overflowCount === 1 ? 'item' : 'items'} →
        </div>
      )}
    </div>
  );
}
