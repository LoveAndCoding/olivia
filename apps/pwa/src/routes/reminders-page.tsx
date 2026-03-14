import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Owner, RecurrenceCadence } from '@olivia/contracts';
import { useRole } from '../lib/role';
import {
  dateTimeLocalToIso,
  describeReminderWhen,
  flattenReminderGroups,
  formatReminderOwner,
  reminderStateLabel,
  reminderToDateTimeLocal
} from '../lib/reminders';
import { confirmCreateReminderCommand, loadReminderView, previewCreateReminderCommand } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';

type ReminderFormState = {
  id: string | null;
  title: string;
  note: string;
  owner: Owner;
  scheduledAt: string;
  recurrenceCadence: RecurrenceCadence;
};

const SECTION_ORDER = [
  ['overdue', 'Overdue'],
  ['due', 'Due now'],
  ['upcoming', 'Upcoming'],
  ['snoozed', 'Snoozed'],
  ['completed', 'Recent completed'],
  ['cancelled', 'Cancelled']
] as const;

function nextHourLocalValue() {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  return reminderToDateTimeLocal(next.toISOString());
}

function initialFormState(): ReminderFormState {
  return {
    id: null,
    title: '',
    note: '',
    owner: 'stakeholder',
    scheduledAt: nextHourLocalValue(),
    recurrenceCadence: 'none'
  };
}

export function RemindersPage() {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const reminderQuery = useQuery({
    queryKey: ['reminders-view', role],
    queryFn: () => loadReminderView(role)
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [entryMode, setEntryMode] = useState<'natural' | 'structured'>('natural');
  const [inputText, setInputText] = useState('');
  const [form, setForm] = useState<ReminderFormState>(initialFormState);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => {
    if (!reminderQuery.data) {
      return 0;
    }

    return flattenReminderGroups(reminderQuery.data).filter((reminder) => reminder.state !== 'completed' && reminder.state !== 'cancelled').length;
  }, [reminderQuery.data]);

  const resetCreateState = () => {
    setShowCreateForm(false);
    setEntryMode('natural');
    setInputText('');
    setForm(initialFormState());
    setDraftId(null);
    setError(null);
  };

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const preview = entryMode === 'natural'
        ? await previewCreateReminderCommand(role, inputText)
        : await previewCreateReminderCommand(role, undefined, {
            title: form.title,
            note: form.note.trim() || null,
            owner: form.owner,
            scheduledAt: dateTimeLocalToIso(form.scheduledAt),
            recurrenceCadence: form.recurrenceCadence,
            linkedInboxItemId: null
          });

      setDraftId(preview.draftId);
      setForm({
        id: preview.parsedReminder.id,
        title: preview.parsedReminder.title,
        note: preview.parsedReminder.note ?? '',
        owner: preview.parsedReminder.owner,
        scheduledAt: reminderToDateTimeLocal(preview.parsedReminder.scheduledAt),
        recurrenceCadence: preview.parsedReminder.recurrenceCadence
      });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!form.id) {
      setError('Preview the reminder before saving it.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await confirmCreateReminderCommand(role, {
        id: form.id,
        title: form.title.trim(),
        note: form.note.trim() || null,
        owner: form.owner,
        scheduledAt: dateTimeLocalToIso(form.scheduledAt),
        recurrenceCadence: form.recurrenceCadence,
        linkedInboxItemId: null
      }, draftId ?? undefined);
      const latestReminderView = await loadReminderView(role);
      queryClient.setQueryData(['reminders-view', role], latestReminderView);
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      resetCreateState();
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
          <div className="screen-header" style={{ paddingBottom: 8 }}>
            <div className="screen-title">Reminders</div>
            <div className="screen-sub">{activeCount} active reminders across the household.</div>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <div className="stack-sm">
                <span className="eyebrow">Review</span>
                <h2 className="card-title">Timing layer for follow-through</h2>
              </div>
              <span className="section-note">{role === 'stakeholder' ? 'Stakeholder can edit' : 'Read-only for spouse'}</span>
            </div>
            <p className="muted">
              Reminders can stand alone or stay linked to inbox work. Completing or snoozing a reminder never changes inbox status automatically.
            </p>
          </div>

          {role === 'stakeholder' ? (
            <div className="card stack-md">
              <div className="section-header">
                <div className="stack-sm">
                  <span className="eyebrow">Create</span>
                  <h3 className="card-title" style={{ fontSize: 18 }}>Add reminder</h3>
                </div>
                {!showCreateForm ? (
                  <button type="button" className="primary-button" onClick={() => setShowCreateForm(true)}>
                    New reminder
                  </button>
                ) : null}
              </div>

              {!showCreateForm ? (
                <p className="muted">Use quick natural language or switch to structured fields if parsing is unavailable.</p>
              ) : (
                <div className="stack-md">
                  <div className="filter-tabs">
                    <button
                      type="button"
                      className={`filter-tab${entryMode === 'natural' ? ' active' : ''}`}
                      onClick={() => setEntryMode('natural')}
                    >
                      Natural language
                    </button>
                    <button
                      type="button"
                      className={`filter-tab${entryMode === 'structured' ? ' active' : ''}`}
                      onClick={() => setEntryMode('structured')}
                    >
                      Structured fallback
                    </button>
                  </div>

                  {entryMode === 'natural' ? (
                    <div className="stack-sm">
                      <span className="field-label">What should Olivia surface later?</span>
                      <textarea
                        value={inputText}
                        onChange={(event) => setInputText(event.target.value)}
                        rows={3}
                        placeholder="Remind me next Thursday to bring the vet records."
                        aria-label="Reminder request"
                      />
                    </div>
                  ) : null}

                  {(entryMode === 'structured' || draftId) ? (
                    <div className="update-grid">
                      <div className="stack-sm">
                        <span className="field-label">Title</span>
                        <input aria-label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Owner</span>
                        <select aria-label="Owner" value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value as Owner }))}>
                          <option value="stakeholder">Lexi</option>
                          <option value="spouse">Alexander</option>
                          <option value="unassigned">Unassigned</option>
                        </select>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">When</span>
                        <input
                          type="datetime-local"
                          aria-label="When"
                          value={form.scheduledAt}
                          onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                        />
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Recurrence</span>
                        <select
                          aria-label="Recurrence"
                          value={form.recurrenceCadence}
                          onChange={(event) => setForm((current) => ({ ...current, recurrenceCadence: event.target.value as RecurrenceCadence }))}
                        >
                          <option value="none">One time</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div className="stack-sm" style={{ gridColumn: '1 / -1' }}>
                        <span className="field-label">Note</span>
                        <textarea
                          aria-label="Note"
                          value={form.note}
                          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                          rows={3}
                          placeholder="Optional context"
                        />
                      </div>
                    </div>
                  ) : null}

                  {draftId ? <p className="muted">Review the parsed draft, make any corrections, then save.</p> : null}
                  {error ? <p className="error-text">{error}</p> : null}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!draftId ? (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busy || (entryMode === 'natural' ? !inputText.trim() : !form.title.trim() || !form.scheduledAt)}
                        onClick={() => void handlePreview()}
                      >
                        {busy ? 'Previewing…' : 'Preview reminder'}
                      </button>
                    ) : (
                      <button type="button" className="primary-button" disabled={busy} onClick={() => void handleConfirm()}>
                        {busy ? 'Saving…' : 'Confirm and save'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={resetCreateState}
                    >
                      {draftId ? 'Start over' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <p className="muted">Alexander can review reminders and linked item context here, but only Lexi can create or change reminders in this first slice.</p>
            </div>
          )}

          {reminderQuery.isLoading ? <div className="card"><p className="muted">Loading reminders…</p></div> : null}
          {reminderQuery.isError ? <div className="card error-card"><p>{(reminderQuery.error as Error).message}</p></div> : null}

          {reminderQuery.data ? SECTION_ORDER.map(([state, label]) => {
            const reminders = reminderQuery.data.remindersByState[state].slice(0, state === 'completed' ? 5 : undefined);
            return (
              <section key={state} className="card stack-md">
                <div className="section-header">
                  <div className="stack-sm">
                    <span className="eyebrow">State</span>
                    <h3 className="card-title" style={{ fontSize: 18 }}>{label}</h3>
                  </div>
                  <span className="section-note">{reminders.length} reminders</span>
                </div>

                {reminders.length === 0 ? <p className="muted">Nothing here right now.</p> : null}
                <div className="item-grid">
                  {reminders.map((reminder) => (
                    <Link key={reminder.id} to="/reminders/$reminderId" params={{ reminderId: reminder.id }} className="item-card">
                      <div className="item-card-header">
                        <div className="stack-sm">
                          <span className="eyebrow">Reminder</span>
                          <strong>{reminder.title}</strong>
                        </div>
                        {reminder.pendingSync ? <span className="chip pending">Pending sync</span> : null}
                      </div>
                      <p className="muted">{describeReminderWhen(reminder)}</p>
                      <p className="muted">Owner: {formatReminderOwner(reminder.owner)}{reminder.recurrenceCadence !== 'none' ? ` · ${reminder.recurrenceCadence}` : ''}</p>
                      {reminder.linkedInboxItem ? (
                        <p className="muted">Linked item: {reminder.linkedInboxItem.title}</p>
                      ) : null}
                      <div className="chip-row">
                        <span className={`chip ${state === 'overdue' ? 'danger' : state === 'due' ? 'warning' : 'info'}`}>{reminderStateLabel(reminder.state)}</span>
                        {reminder.linkedInboxItem ? <span className="chip neutral">Linked</span> : <span className="chip neutral">Standalone</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }) : null}
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
