import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Owner, RecurrenceCadence, UpdateChange } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { dateTimeLocalToIso, describeReminderWhen, flattenReminderGroups, formatReminderOwner, reminderStateLabel, reminderToDateTimeLocal } from '../lib/reminders';
import { confirmCreateReminderCommand, confirmUpdateCommand, loadItemDetail, loadReminderView, previewCreateReminderCommand } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';

export function ItemDetailPage() {
  const params = useParams({ from: '/items/$itemId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [statusValue, setStatusValue] = useState<'open' | 'in_progress' | 'done' | 'deferred'>('in_progress');
  const [ownerValue, setOwnerValue] = useState<Owner>('stakeholder');
  const [dueText, setDueText] = useState('');
  const [note, setNote] = useState('');
  const [linkedReminderTitle, setLinkedReminderTitle] = useState('');
  const [linkedReminderNote, setLinkedReminderNote] = useState('');
  const [linkedReminderOwner, setLinkedReminderOwner] = useState<Owner>('stakeholder');
  const [linkedReminderScheduledAt, setLinkedReminderScheduledAt] = useState(reminderToDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000).toISOString()));
  const [linkedReminderCadence, setLinkedReminderCadence] = useState<RecurrenceCadence>('none');
  const [linkedReminderDraftId, setLinkedReminderDraftId] = useState<string | null>(null);
  const [linkedReminderDraftRecordId, setLinkedReminderDraftRecordId] = useState<string | null>(null);
  const [showLinkedReminderForm, setShowLinkedReminderForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const itemQuery = useQuery({ queryKey: ['item-detail', role, params.itemId], queryFn: () => loadItemDetail(role, params.itemId) });
  const linkedReminderQuery = useQuery({ queryKey: ['reminders-view', role], queryFn: () => loadReminderView(role) });

  useEffect(() => {
    if (!itemQuery.data) {
      return;
    }

    setLinkedReminderTitle(itemQuery.data.item.title);
    setLinkedReminderOwner(itemQuery.data.item.owner === 'unassigned' ? 'stakeholder' : itemQuery.data.item.owner);
  }, [itemQuery.data]);

  const linkedReminders = useMemo(() => {
    if (!linkedReminderQuery.data || !itemQuery.data) {
      return [];
    }

    return flattenReminderGroups(linkedReminderQuery.data).filter((reminder) => reminder.linkedInboxItemId === itemQuery.data?.item.id);
  }, [itemQuery.data, linkedReminderQuery.data]);

  const applyChange = async (proposedChange: UpdateChange) => {
    if (!itemQuery.data) return;
    setBusy(true);
    setError(null);
    try {
      await confirmUpdateCommand(role, itemQuery.data.item.id, itemQuery.data.item.version, proposedChange);
      setNote('');
      setDueText('');
      await queryClient.invalidateQueries({ queryKey: ['item-detail', role, params.itemId] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resetLinkedReminderDraft = () => {
    setShowLinkedReminderForm(false);
    setLinkedReminderDraftId(null);
    setLinkedReminderDraftRecordId(null);
    setLinkedReminderNote('');
    if (itemQuery.data) {
      setLinkedReminderTitle(itemQuery.data.item.title);
      setLinkedReminderOwner(itemQuery.data.item.owner === 'unassigned' ? 'stakeholder' : itemQuery.data.item.owner);
    }
    setLinkedReminderCadence('none');
    setLinkedReminderScheduledAt(reminderToDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000).toISOString()));
  };

  const handlePreviewLinkedReminder = async () => {
    if (!itemQuery.data) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const preview = await previewCreateReminderCommand(role, undefined, {
        title: linkedReminderTitle,
        note: linkedReminderNote.trim() || null,
        owner: linkedReminderOwner,
        scheduledAt: dateTimeLocalToIso(linkedReminderScheduledAt),
        recurrenceCadence: linkedReminderCadence,
        linkedInboxItemId: itemQuery.data.item.id
      });
      setLinkedReminderDraftId(preview.draftId);
      setLinkedReminderDraftRecordId(preview.parsedReminder.id);
      setLinkedReminderTitle(preview.parsedReminder.title);
      setLinkedReminderNote(preview.parsedReminder.note ?? '');
      setLinkedReminderOwner(preview.parsedReminder.owner);
      setLinkedReminderScheduledAt(reminderToDateTimeLocal(preview.parsedReminder.scheduledAt));
      setLinkedReminderCadence(preview.parsedReminder.recurrenceCadence);
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmLinkedReminder = async () => {
    if (!itemQuery.data || !linkedReminderDraftRecordId) {
      setError('Preview the linked reminder before saving it.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await confirmCreateReminderCommand(role, {
        id: linkedReminderDraftRecordId,
        title: linkedReminderTitle.trim(),
        note: linkedReminderNote.trim() || null,
        owner: linkedReminderOwner,
        scheduledAt: dateTimeLocalToIso(linkedReminderScheduledAt),
        recurrenceCadence: linkedReminderCadence,
        linkedInboxItemId: itemQuery.data.item.id
      }, linkedReminderDraftId ?? undefined);
      await queryClient.invalidateQueries({ queryKey: ['reminders-view'] });
      await queryClient.invalidateQueries({ queryKey: ['item-detail', role, params.itemId] });
      resetLinkedReminderDraft();
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
          {/* Back button */}
          <button
            type="button"
            onClick={() => void navigate({ to: '/tasks' })}
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
              padding: '6px 0',
            }}
          >
            ← Back to Tasks
          </button>

          {itemQuery.isLoading && (
            <div className="card"><p className="muted">Loading item…</p></div>
          )}
          {(itemQuery.isError || (!itemQuery.isLoading && !itemQuery.data)) && (
            <div className="card error-card">
              <p>{(itemQuery.error as Error)?.message ?? 'Item not found.'}</p>
            </div>
          )}

          {itemQuery.data && (() => {
            const { item, history, flags } = itemQuery.data;
            return (
              <>
                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Item detail</span>
                      <h2 className="card-title">{item.title}</h2>
                      <p className="muted">
                        Owner: {item.owner === 'spouse' ? 'Alexander' : item.owner === 'stakeholder' ? 'Lexi' : 'Unassigned'} · Status: {item.status.replace('_', ' ')}
                      </p>
                    </div>
                    {item.pendingSync ? <span className="chip info">Pending sync</span> : null}
                  </div>
                  {item.description ? <p>{item.description}</p> : <p className="muted">No description yet.</p>}
                  <div className="chip-row">
                    {flags.overdue   ? <span className="chip danger">Overdue</span>  : null}
                    {flags.dueSoon   ? <span className="chip info">Due soon</span>   : null}
                    {flags.stale     ? <span className="chip warning">Stale</span>   : null}
                    {flags.unassigned? <span className="chip neutral">Unassigned</span> : null}
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>Due: {item.dueText ?? 'No due date'} · v{item.version}</p>
                </div>

                {role === 'stakeholder' ? (
                  <div className="card stack-md">
                    <div className="section-header">
                      <div className="stack-sm">
                        <span className="eyebrow">Update</span>
                        <h3 className="card-title" style={{ fontSize: 18 }}>Update item</h3>
                      </div>
                      <span className="section-note">Changes apply immediately and can be reversed</span>
                    </div>
                    <div className="update-grid">
                      <div className="stack-sm">
                        <span className="field-label">Status</span>
                        <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as typeof statusValue)}>
                          <option value="open">open</option>
                          <option value="in_progress">in progress</option>
                          <option value="done">done</option>
                          <option value="deferred">deferred</option>
                        </select>
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ status: statusValue })}>
                          Set status
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Owner</span>
                        <select value={ownerValue} onChange={(e) => setOwnerValue(e.target.value as Owner)}>
                          <option value="stakeholder">Lexi (stakeholder)</option>
                          <option value="spouse">Alexander (spouse)</option>
                          <option value="unassigned">unassigned</option>
                        </select>
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ owner: ownerValue })}>
                          Set owner
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Due text</span>
                        <input value={dueText} onChange={(e) => setDueText(e.target.value)} placeholder="next Friday" />
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ dueText })}>
                          Update due date
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Add note</span>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Call the preferred vendor first" />
                        <button type="button" className="secondary-button" disabled={busy} onClick={() => void applyChange({ note })}>
                          Save note
                        </button>
                      </div>
                    </div>
                    {error ? <p className="error-text">{error}</p> : null}
                  </div>
                ) : (
                  <div className="card">
                    <p className="muted">You're viewing as Alexander. Updates are made by Lexi.</p>
                  </div>
                )}

                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Linked reminders</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Reminder follow-through</h3>
                    </div>
                    <span className="section-note">{linkedReminders.length} linked reminders</span>
                  </div>
                  <p className="muted">Linked reminders surface this work later without changing the inbox item's status or owner automatically.</p>

                  {linkedReminderQuery.isLoading ? <p className="muted">Loading reminders…</p> : null}
                  {linkedReminderQuery.isError ? <p className="error-text">{(linkedReminderQuery.error as Error).message}</p> : null}
                  {linkedReminders.length === 0 && !linkedReminderQuery.isLoading ? <p className="muted">No reminders are linked to this item yet.</p> : null}

                  <div className="item-grid">
                    {linkedReminders.map((reminder) => (
                      <button
                        key={reminder.id}
                        type="button"
                        className="item-card"
                        onClick={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: reminder.id } })}
                      >
                        <div className="item-card-header">
                          <div className="stack-sm">
                            <span className="eyebrow">Reminder</span>
                            <strong>{reminder.title}</strong>
                          </div>
                          {reminder.pendingSync ? <span className="chip pending">Pending sync</span> : null}
                        </div>
                        <p className="muted">{describeReminderWhen(reminder)}</p>
                        <p className="muted">Owner: {formatReminderOwner(reminder.owner)}</p>
                        <div className="chip-row">
                          <span className={`chip ${reminder.state === 'overdue' ? 'danger' : reminder.state === 'due' ? 'warning' : 'info'}`}>{reminderStateLabel(reminder.state)}</span>
                          {reminder.recurrenceCadence !== 'none' ? <span className="chip neutral">{reminder.recurrenceCadence}</span> : null}
                        </div>
                      </button>
                    ))}
                  </div>

                  {role === 'stakeholder' ? (
                    <>
                      {!showLinkedReminderForm ? (
                        <button type="button" className="primary-button" disabled={busy} onClick={() => setShowLinkedReminderForm(true)}>
                          Add reminder from this item
                        </button>
                      ) : (
                        <div className="stack-md">
                          <div className="update-grid">
                            <div className="stack-sm">
                              <span className="field-label">Reminder title</span>
                              <input value={linkedReminderTitle} onChange={(event) => setLinkedReminderTitle(event.target.value)} />
                            </div>
                            <div className="stack-sm">
                              <span className="field-label">Owner</span>
                              <select value={linkedReminderOwner} onChange={(event) => setLinkedReminderOwner(event.target.value as Owner)}>
                                <option value="stakeholder">Lexi</option>
                                <option value="spouse">Alexander</option>
                                <option value="unassigned">Unassigned</option>
                              </select>
                            </div>
                            <div className="stack-sm">
                              <span className="field-label">Surface at</span>
                              <input type="datetime-local" value={linkedReminderScheduledAt} onChange={(event) => setLinkedReminderScheduledAt(event.target.value)} />
                            </div>
                            <div className="stack-sm">
                              <span className="field-label">Recurrence</span>
                              <select value={linkedReminderCadence} onChange={(event) => setLinkedReminderCadence(event.target.value as RecurrenceCadence)}>
                                <option value="none">One time</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                            <div className="stack-sm" style={{ gridColumn: '1 / -1' }}>
                              <span className="field-label">Note</span>
                              <textarea value={linkedReminderNote} onChange={(event) => setLinkedReminderNote(event.target.value)} rows={3} placeholder="Optional reminder context" />
                            </div>
                          </div>
                          <p className="muted">{linkedReminderDraftId ? 'Review the linked reminder draft, make corrections if needed, then save it.' : 'Preview the linked reminder before saving it.'}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {!linkedReminderDraftId ? (
                              <button
                                type="button"
                                className="primary-button"
                                disabled={busy || !linkedReminderTitle.trim() || !linkedReminderScheduledAt}
                                onClick={() => void handlePreviewLinkedReminder()}
                              >
                                Preview linked reminder
                              </button>
                            ) : (
                              <button type="button" className="primary-button" disabled={busy} onClick={() => void handleConfirmLinkedReminder()}>
                                Confirm linked reminder
                              </button>
                            )}
                            <button type="button" className="secondary-button" disabled={busy} onClick={resetLinkedReminderDraft}>
                              {linkedReminderDraftId ? 'Start over' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="muted">Alexander can see linked reminder context here, but only Lexi can create or change reminder records in this first slice.</p>
                  )}
                </div>

                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">History</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Recent changes</h3>
                    </div>
                    <span className="section-note">Newest first</span>
                  </div>
                  {history.length === 0 ? <p className="muted">No history yet.</p> : null}
                  <ul className="history-list">
                    {history.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.eventType.replace('_', ' ')}</strong>
                        <span className="muted"> · {new Date(entry.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      <BottomNav activeTab="tasks" />
    </div>
  );
}
