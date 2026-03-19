import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReminderUpdateChange } from '@olivia/contracts';
import { computeReminderState, scheduleNextOccurrence } from '@olivia/domain';
import { format } from 'date-fns';
import { Check, Moon, PencilSimple, X, ArrowCounterClockwise, ArrowsClockwise, LinkSimple } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import {
  loadReminderDetail,
  completeReminderCommand,
  snoozeReminderCommand,
  cancelReminderCommand,
  confirmUpdateReminderCommand,
} from '../lib/sync';
import {
  getReminderDueDisplay,
  formatScheduledLabel,
  formatRecurrenceLabel,
  ownerLabel,
} from '../lib/reminder-helpers';
import { BottomNav } from '../components/bottom-nav';
import { OliviaMessage } from '../components/reminders/OliviaMessage';
import { EditReminderSheet } from '../components/reminders/EditReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { CancelConfirmSheet } from '../components/reminders/CancelConfirmSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';

export function ReminderDetailPage() {
  const params = useParams({ from: '/reminders/$reminderId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showSnoozeSheet, setShowSnoozeSheet] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busy, setBusy] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['reminder-detail', role, params.reminderId],
    queryFn: () => loadReminderDetail(role, params.reminderId),
  });

  const reminder = detailQuery.data?.reminder;
  const timeline = detailQuery.data?.timeline ?? [];

  const state = useMemo(() => {
    if (!reminder) return null;
    return computeReminderState(reminder, new Date());
  }, [reminder]);

  const display = useMemo(() => {
    if (!reminder) return null;
    return getReminderDueDisplay(reminder);
  }, [reminder]);

  const invalidateAndRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['reminder-detail', role, params.reminderId] });
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient, role, params.reminderId]);

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!reminder || busy) return;
    setBusy(true);
    try {
      await completeReminderCommand(role, reminder.id, reminder.version);
      await invalidateAndRefresh();
      showBanner('Done', 'mint');
    } finally {
      setBusy(false);
    }
  }, [reminder, role, busy, invalidateAndRefresh, showBanner]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!reminder) return;
    setShowSnoozeSheet(false);
    setBusy(true);
    try {
      await snoozeReminderCommand(role, reminder.id, reminder.version, isoString);
      await invalidateAndRefresh();
      showBanner(`Snoozed until ${new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'sky');
    } finally {
      setBusy(false);
    }
  }, [reminder, role, invalidateAndRefresh, showBanner]);

  const handleCancel = useCallback(async () => {
    if (!reminder || busy) return;
    setShowCancelSheet(false);
    setBusy(true);
    try {
      await cancelReminderCommand(role, reminder.id, reminder.version);
      await invalidateAndRefresh();
    } finally {
      setBusy(false);
    }
  }, [reminder, role, busy, invalidateAndRefresh]);

  const handleEditSave = useCallback(async (change: ReminderUpdateChange) => {
    if (!reminder) return;
    setShowEditSheet(false);
    setBusy(true);
    try {
      await confirmUpdateReminderCommand(role, reminder.id, reminder.version, change);
      await invalidateAndRefresh();
      showBanner('Updated', 'mint');
    } finally {
      setBusy(false);
    }
  }, [reminder, role, invalidateAndRefresh, showBanner]);

  const isSpouse = role === 'spouse';
  const isCompleted = state === 'completed';
  const isCancelled = state === 'cancelled';
  const isDueOrOverdue = state === 'due' || state === 'overdue';
  const isSnoozed = state === 'snoozed';
  const isRecurring = reminder?.recurrenceCadence !== 'none';
  const hasLinkedItem = !!reminder?.linkedInboxItem;

  const missedCount = timeline.filter((e) => e.eventType === 'missed_occurrence_logged').length;

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/reminders' })}
          >
            ← Reminders
          </button>

          {detailQuery.isLoading && (
            <div className="card"><p className="muted">Loading reminder…</p></div>
          )}
          {detailQuery.isError && (
            <div className="card error-card">
              <p>{(detailQuery.error as Error)?.message ?? 'Reminder not found.'}</p>
            </div>
          )}

          {reminder && display && (
            <>
              <div className="rem-detail-label">Reminder</div>
              <div className={`rem-detail-title${isCompleted ? ' done' : ''}`}>
                {reminder.title}
              </div>

              {isCompleted && (
                <div className="rem-status-banner rem-status-banner-mint">
                  <Check size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Completed · {reminder.completedAt ? format(new Date(reminder.completedAt), 'MMM d') : ''} · by {ownerLabel(reminder.owner)}
                </div>
              )}

              {isSnoozed && reminder.snoozedUntil && (
                <div className="rem-status-banner rem-status-banner-sky">
                  <Moon size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Snoozed — will resurface {format(new Date(reminder.snoozedUntil), "MMM d 'at' h:mm a")}
                </div>
              )}

              {hasLinkedItem && reminder.linkedInboxItem && (
                <div
                  className="linked-task-card"
                  onClick={() => void navigate({ to: '/items/$itemId', params: { itemId: reminder.linkedInboxItem!.id } })}
                >
                  <div className="linked-task-card-label"><LinkSimple size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> Linked task</div>
                  <div className="linked-task-card-title">{reminder.linkedInboxItem.title}</div>
                  <div className="linked-task-card-meta">
                    Owner: {ownerLabel(reminder.linkedInboxItem.owner)} · Status: {reminder.linkedInboxItem.status.replace('_', ' ')}
                    {reminder.linkedInboxItem.status === 'open' && state === 'overdue' && ' · Needs attention'}
                  </div>
                </div>
              )}

              {isDueOrOverdue && hasLinkedItem && (
                <OliviaMessage
                  text={`This reminder is due now — and the linked task is still open. Want me to draft a follow-up message for the plumber?`}
                />
              )}

              {isRecurring && missedCount >= 3 && (
                <OliviaMessage
                  text={`This recurring reminder has come up ${missedCount} times without being completed. Is the ${reminder.recurrenceCadence} cadence still right?`}
                />
              )}

              <div className="rem-detail-card">
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Status</span>
                  <span className={`rem-badge ${display.badgeClass}`}>{display.badgeText}</span>
                </div>
                {!isCompleted && !isCancelled && !isSnoozed && (
                  <div className="rem-detail-field">
                    <span className="rem-detail-field-label">
                      {state === 'overdue' ? 'Was due' : 'Scheduled'}
                    </span>
                    <span className="rem-detail-field-value" style={state === 'overdue' ? { color: 'var(--rose)' } : undefined}>
                      {formatScheduledLabel(reminder.scheduledAt)}
                    </span>
                  </div>
                )}
                {isSnoozed && reminder.snoozedUntil && (
                  <div className="rem-detail-field">
                    <span className="rem-detail-field-label">Resurfaces</span>
                    <span className="rem-detail-field-value">
                      {formatScheduledLabel(reminder.snoozedUntil)}
                    </span>
                  </div>
                )}
                {isCompleted && (
                  <div className="rem-detail-field">
                    <span className="rem-detail-field-label">Was scheduled</span>
                    <span className="rem-detail-field-value">
                      {formatScheduledLabel(reminder.scheduledAt)}
                    </span>
                  </div>
                )}
                {isRecurring && !isCompleted && !isCancelled && (() => {
                  const next = scheduleNextOccurrence(reminder.scheduledAt, reminder.recurrenceCadence);
                  if (!next) return null;
                  return (
                    <div className="rem-detail-field">
                      <span className="rem-detail-field-label">Next after done</span>
                      <span className="rem-detail-field-value">
                        {formatScheduledLabel(next)} (auto-scheduled)
                      </span>
                    </div>
                  );
                })()}
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Owner</span>
                  <span className="rem-detail-field-value">
                    {ownerLabel(reminder.owner)}{reminder.owner === role ? ' (stakeholder)' : ''}
                  </span>
                </div>
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Recurrence</span>
                  <span className="rem-detail-field-value">
                    {reminder.recurrenceCadence !== 'none' ? (
                      <span className="rem-badge rem-badge-lavender">
                        {formatRecurrenceLabel(reminder.recurrenceCadence)}
                      </span>
                    ) : 'One-time'}
                  </span>
                </div>
                {reminder.note && (
                  <div className="rem-detail-field">
                    <span className="rem-detail-field-label">Note</span>
                    <span className="rem-detail-field-value">{reminder.note}</span>
                  </div>
                )}
              </div>

              {isSpouse && (
                <div className="rem-status-banner rem-status-banner-sky" style={{ marginBottom: 16 }}>
                  View only — actions are available to Lexi
                </div>
              )}

              {/* Actions — DET-1: upcoming => Edit, Snooze, Cancel */}
              {!isSpouse && state === 'upcoming' && (
                <div className="rem-actions-row" style={{ marginBottom: 20 }}>
                  <button type="button" className="rem-btn rem-btn-ghost" disabled={busy} onClick={() => setShowEditSheet(true)}>
                    <PencilSimple size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Edit
                  </button>
                  <button type="button" className="rem-btn rem-btn-secondary" disabled={busy} onClick={() => setShowSnoozeSheet(true)}>
                    <Moon size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Snooze
                  </button>
                  <button type="button" className="rem-btn rem-btn-danger-text" disabled={busy} onClick={() => setShowCancelSheet(true)}>
                    <X size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Cancel
                  </button>
                </div>
              )}

              {/* Actions — DET-2/DET-3: due or overdue => Done, Snooze, Edit, Cancel */}
              {!isSpouse && isDueOrOverdue && (
                <div style={{ marginBottom: 20 }}>
                  <div className="rem-actions-row" style={{ marginBottom: 10 }}>
                    <button type="button" className="rem-btn rem-btn-done" style={{ flex: 1 }} disabled={busy} onClick={handleComplete}>
                      <Check size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Done
                    </button>
                    <button type="button" className="rem-btn rem-btn-secondary" disabled={busy} onClick={() => setShowSnoozeSheet(true)}>
                      <Moon size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Snooze
                    </button>
                  </div>
                  <div className="rem-actions-row">
                    <button type="button" className="rem-btn rem-btn-ghost" disabled={busy} onClick={() => setShowEditSheet(true)}>
                      <PencilSimple size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> {isRecurring ? 'Edit cadence' : 'Edit'}
                    </button>
                    <button type="button" className="rem-btn rem-btn-danger-text" disabled={busy} onClick={() => setShowCancelSheet(true)}>
                      <X size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> {isRecurring ? 'Cancel series' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions — ACTION-4: snoozed => Change snooze, Un-snooze, Mark done now, Cancel */}
              {!isSpouse && isSnoozed && (
                <div style={{ marginBottom: 20 }}>
                  <div className="rem-actions-row" style={{ marginBottom: 10 }}>
                    <button type="button" className="rem-btn rem-btn-secondary" disabled={busy} onClick={() => setShowSnoozeSheet(true)}>
                      <ArrowsClockwise size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Change snooze
                    </button>
                    <button type="button" className="rem-btn rem-btn-ghost" disabled={busy} onClick={() => {
                      void handleSnoozeSelect(new Date().toISOString());
                    }}>
                      <ArrowCounterClockwise size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Un-snooze
                    </button>
                  </div>
                  <div className="rem-actions-row">
                    <button type="button" className="rem-btn rem-btn-done" style={{ flex: 1 }} disabled={busy} onClick={handleComplete}>
                      <Check size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Mark done now
                    </button>
                    <button type="button" className="rem-btn rem-btn-danger-text" disabled={busy} onClick={() => setShowCancelSheet(true)}>
                      <X size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Actions — DET-4: completed => Undo completion */}
              {!isSpouse && isCompleted && (
                <div className="rem-actions-row" style={{ marginBottom: 20 }}>
                  <button type="button" className="rem-btn rem-btn-ghost" disabled={busy} onClick={() => {
                    void navigate({ to: '/reminders' });
                  }}>
                    ↩ Undo completion
                  </button>
                </div>
              )}

              {/* History */}
              {timeline.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="rem-group-header" style={{ marginTop: 0 }}>History</div>
                  <div className="rem-timeline">
                    {timeline.map((entry, idx) => (
                      <div key={entry.id} className="rem-timeline-item">
                        <div className={`rem-timeline-dot${idx === 0 ? ' active' : ''}`} />
                        <div className="rem-timeline-text">
                          <strong>{formatEventType(entry.eventType)}</strong>
                          {' · '}
                          {format(new Date(entry.createdAt), 'MMM d')}
                          {entry.actorRole === 'stakeholder' && ' · by Lexi'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 24 }} />
            </>
          )}
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      {reminder && !isSpouse && (
        <>
          <EditReminderSheet
            open={showEditSheet}
            onClose={() => setShowEditSheet(false)}
            reminder={reminder}
            onSave={handleEditSave}
          />
          <SnoozeSheet
            open={showSnoozeSheet}
            onClose={() => setShowSnoozeSheet(false)}
            onSelectTime={handleSnoozeSelect}
          />
          <CancelConfirmSheet
            open={showCancelSheet}
            onClose={() => setShowCancelSheet(false)}
            reminderTitle={reminder.title}
            isRecurring={isRecurring}
            onCancelSingle={handleCancel}
            onCancelSeries={handleCancel}
          />
        </>
      )}

      <BottomNav activeTab="home" />
    </div>
  );
}

function formatEventType(eventType: string): string {
  switch (eventType) {
    case 'created': return 'Created';
    case 'rescheduled': return 'Rescheduled';
    case 'snoozed': return 'Snoozed';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'recurrence_advanced': return 'Next occurrence scheduled';
    case 'missed_occurrence_logged': return 'Missed';
    default: return eventType.replace(/_/g, ' ');
  }
}
