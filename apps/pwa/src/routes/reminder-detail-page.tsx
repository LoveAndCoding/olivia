import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { Owner, RecurrenceCadence, ReminderUpdateChange } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { dateTimeLocalToIso, describeReminderWhen, formatReminderOwner, reminderToDateTimeLocal } from '../lib/reminders';
import {
  cancelReminderCommand,
  completeReminderCommand,
  confirmUpdateReminderCommand,
  loadReminderDetail,
  loadReminderView,
  snoozeReminderCommand
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';

type EditableReminderState = {
  title: string;
  note: string;
  owner: Owner;
  scheduledAt: string;
  recurrenceCadence: RecurrenceCadence;
};

function nextSnoozeLocalValue() {
  return reminderToDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString());
}

export function ReminderDetailPage() {
  const params = useParams({ from: '/reminders/$reminderId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const reminderQuery = useQuery({
    queryKey: ['reminder-detail', role, params.reminderId],
    queryFn: () => loadReminderDetail(role, params.reminderId)
  });
  const [form, setForm] = useState<EditableReminderState | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState(nextSnoozeLocalValue);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reminderQuery.data) {
      return;
    }

    setForm({
      title: reminderQuery.data.reminder.title,
      note: reminderQuery.data.reminder.note ?? '',
      owner: reminderQuery.data.reminder.owner,
      scheduledAt: reminderToDateTimeLocal(reminderQuery.data.reminder.scheduledAt),
      recurrenceCadence: reminderQuery.data.reminder.recurrenceCadence
    });
  }, [reminderQuery.data]);

  const reminder = reminderQuery.data?.reminder;
  const timeline = reminderQuery.data?.timeline ?? [];
  const isReadOnly = role !== 'stakeholder';
  const isTerminal = reminder?.state === 'completed' || reminder?.state === 'cancelled';

  const proposedChange = useMemo<ReminderUpdateChange | null>(() => {
    if (!reminder || !form) {
      return null;
    }

    const next: ReminderUpdateChange = {};
    if (form.title.trim() !== reminder.title) {
      next.title = form.title.trim();
    }
    if ((form.note.trim() || null) !== reminder.note) {
      next.note = form.note.trim() || null;
    }
    if (form.owner !== reminder.owner) {
      next.owner = form.owner;
    }
    const nextScheduledAt = dateTimeLocalToIso(form.scheduledAt);
    if (nextScheduledAt !== reminder.scheduledAt) {
      next.scheduledAt = nextScheduledAt;
    }
    if (form.recurrenceCadence !== reminder.recurrenceCadence) {
      next.recurrenceCadence = form.recurrenceCadence;
    }

    return Object.keys(next).length ? next : null;
  }, [form, reminder]);

  const refreshReminderQueries = async () => {
    const latestReminderView = await loadReminderView(role);
    queryClient.setQueryData(['reminders-view', role], latestReminderView);
    const latestReminderDetail = await loadReminderDetail(role, params.reminderId);
    queryClient.setQueryData(['reminder-detail', role, params.reminderId], latestReminderDetail);
    await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
  };

  const handleSaveEdits = async () => {
    if (!reminder || !proposedChange) {
      setError('No reminder changes are ready to save.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await confirmUpdateReminderCommand(role, reminder.id, reminder.version, proposedChange);
      await refreshReminderQueries();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!reminder) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await completeReminderCommand(role, reminder.id, reminder.version);
      await refreshReminderQueries();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSnooze = async () => {
    if (!reminder) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await snoozeReminderCommand(role, reminder.id, reminder.version, dateTimeLocalToIso(snoozeUntil));
      await refreshReminderQueries();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelReminder = async () => {
    if (!reminder) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await cancelReminderCommand(role, reminder.id, reminder.version);
      await refreshReminderQueries();
      setConfirmCancel(false);
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <button
            type="button"
            onClick={() => void navigate({ to: '/reminders' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--violet)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0'
            }}
          >
            ← Back to reminders
          </button>

          {reminderQuery.isLoading ? <div className="card"><p className="muted">Loading reminder…</p></div> : null}
          {(reminderQuery.isError || (!reminderQuery.isLoading && !reminderQuery.data)) ? (
            <div className="card error-card">
              <p>{(reminderQuery.error as Error)?.message ?? 'Reminder not found.'}</p>
            </div>
          ) : null}

          {reminder && form ? (
            <>
              <div className="card stack-md">
                <div className="section-header">
                  <div className="stack-sm">
                    <span className="eyebrow">Reminder detail</span>
                    <h2 className="card-title">{reminder.title}</h2>
                  </div>
                  {reminder.pendingSync ? <span className="chip pending">Pending sync</span> : null}
                </div>
                <p className="muted">{describeReminderWhen(reminder)}</p>
                <p className="muted">
                  Owner: {formatReminderOwner(reminder.owner)} · State: {reminder.state.replace('_', ' ')}
                  {reminder.recurrenceCadence !== 'none' ? ` · ${reminder.recurrenceCadence}` : ''}
                </p>
                {reminder.note ? <p>{reminder.note}</p> : <p className="muted">No note yet.</p>}
                {reminder.linkedInboxItem ? (
                  <div className="card" style={{ background: 'var(--surface-2)' }}>
                    <p className="muted">Linked inbox item</p>
                    <Link to="/items/$itemId" params={{ itemId: reminder.linkedInboxItem.id }}>
                      <strong>{reminder.linkedInboxItem.title}</strong>
                    </Link>
                    <p className="muted">
                      Status: {reminder.linkedInboxItem.status.replace('_', ' ')} · Owner: {formatReminderOwner(reminder.linkedInboxItem.owner)}
                    </p>
                  </div>
                ) : null}
              </div>

              {isReadOnly ? (
                <div className="card">
                  <p className="muted">Alexander can review reminder state and linked item context here, but reminder records stay read-only in this first slice.</p>
                </div>
              ) : null}

              {!isReadOnly && !isTerminal ? (
                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Actions</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Resolve or defer</h3>
                    </div>
                    <span className="section-note">Direct actions apply immediately</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="primary-button" disabled={busy} onClick={() => void handleComplete()}>
                      {busy ? 'Saving…' : reminder.recurrenceCadence === 'none' ? 'Complete reminder' : 'Complete occurrence'}
                    </button>
                  </div>
                  <div className="stack-sm">
                    <span className="field-label">Snooze until</span>
                    <input type="datetime-local" value={snoozeUntil} onChange={(event) => setSnoozeUntil(event.target.value)} />
                    <button type="button" className="secondary-button" disabled={busy} onClick={() => void handleSnooze()}>
                      Snooze reminder
                    </button>
                  </div>
                </div>
              ) : null}

              {!isReadOnly ? (
                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Edit</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Change reminder details</h3>
                    </div>
                    <span className="section-note">Field edits apply immediately</span>
                  </div>
                  <div className="update-grid">
                    <div className="stack-sm">
                      <span className="field-label">Title</span>
                      <input value={form.title} onChange={(event) => setForm((current) => current ? { ...current, title: event.target.value } : current)} />
                    </div>
                    <div className="stack-sm">
                      <span className="field-label">Owner</span>
                      <select value={form.owner} onChange={(event) => setForm((current) => current ? { ...current, owner: event.target.value as Owner } : current)}>
                        <option value="stakeholder">Lexi</option>
                        <option value="spouse">Alexander</option>
                        <option value="unassigned">Unassigned</option>
                      </select>
                    </div>
                    <div className="stack-sm">
                      <span className="field-label">When</span>
                      <input
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={(event) => setForm((current) => current ? { ...current, scheduledAt: event.target.value } : current)}
                      />
                    </div>
                    <div className="stack-sm">
                      <span className="field-label">Recurrence</span>
                      <select
                        value={form.recurrenceCadence}
                        onChange={(event) => setForm((current) => current ? { ...current, recurrenceCadence: event.target.value as RecurrenceCadence } : current)}
                      >
                        <option value="none">One time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div className="stack-sm" style={{ gridColumn: '1 / -1' }}>
                      <span className="field-label">Note</span>
                      <textarea value={form.note} onChange={(event) => setForm((current) => current ? { ...current, note: event.target.value } : current)} rows={3} />
                    </div>
                  </div>
                  <button type="button" className="secondary-button" disabled={busy || !proposedChange || Boolean(isTerminal)} onClick={() => void handleSaveEdits()}>
                    Save reminder edits
                  </button>
                </div>
              ) : null}

              {!isReadOnly && !isTerminal ? (
                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Cancel</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Dismiss this reminder</h3>
                    </div>
                    <span className="section-note">Cancellation always needs confirmation</span>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={confirmCancel} onChange={(event) => setConfirmCancel(event.target.checked)} />
                    <span className="muted">I want to cancel this reminder.</span>
                  </label>
                  <button type="button" className="secondary-button" disabled={busy || !confirmCancel} onClick={() => void handleCancelReminder()}>
                    Cancel reminder
                  </button>
                </div>
              ) : null}

              {error ? <p className="error-text">{error}</p> : null}

              <div className="card stack-md">
                <div className="section-header">
                  <div className="stack-sm">
                    <span className="eyebrow">Timeline</span>
                    <h3 className="card-title" style={{ fontSize: 18 }}>Reminder history</h3>
                  </div>
                  <span className="section-note">Newest first</span>
                </div>
                {timeline.length === 0 ? <p className="muted">No timeline yet.</p> : null}
                <ul className="history-list">
                  {timeline.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.eventType.replace(/_/g, ' ')}</strong>
                      <span className="muted"> · {new Date(entry.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
