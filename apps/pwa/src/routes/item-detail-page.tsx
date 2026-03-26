import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateChange, DraftReminder, Reminder, ReminderUpdateChange, User } from '@olivia/contracts';
import { useAuth } from '../lib/auth';
import { getHouseholdMembers } from '../lib/auth-api';
import { resolveUserName } from '../lib/reminder-helpers';
import {
  confirmUpdateCommand,
  loadItemDetail,
  loadReminderView,
  confirmCreateReminderCommand,
  completeReminderCommand,
  snoozeReminderCommand,
  cancelReminderCommand,
  confirmUpdateReminderCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { ReminderBlock } from '../components/reminders/ReminderBlock';
import { AddReminderButton } from '../components/reminders/AddReminderButton';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { EditReminderSheet } from '../components/reminders/EditReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { CancelConfirmSheet } from '../components/reminders/CancelConfirmSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { EditTaskSheet } from '../components/tasks/EditTaskSheet';
import { showErrorToast } from '../lib/error-toast';

export function ItemDetailPage() {
  const params = useParams({ from: '/items/$itemId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, getSessionToken } = useAuth();
  const [members, setMembers] = useState<User[]>(currentUser ? [currentUser] : []);
  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    getHouseholdMembers(token).then(res => setMembers(res.members)).catch(() => {});
  }, [getSessionToken]);
  const [showEditTask, setShowEditTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showCreateReminder, setShowCreateReminder] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [snoozeReminder, setSnoozeReminder] = useState<Reminder | null>(null);
  const [cancelReminder, setCancelReminder] = useState<Reminder | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);

  const itemQuery = useQuery({
    queryKey: ['item-detail', currentUser?.id, params.itemId],
    queryFn: () => loadItemDetail(params.itemId),
  });

  const reminderQuery = useQuery({
    queryKey: ['reminder-view', currentUser?.id],
    queryFn: () => loadReminderView(),
  });

  const linkedReminders = useMemo(() => {
    if (!reminderQuery.data) return [];
    const byState = reminderQuery.data.remindersByState;
    const all: Reminder[] = [
      ...byState.overdue,
      ...byState.due,
      ...byState.upcoming,
      ...byState.snoozed,
    ];
    return all.filter((r) => r.linkedInboxItemId === params.itemId);
  }, [reminderQuery.data, params.itemId]);

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const invalidateReminders = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient]);

  const handleEditTaskSave = useCallback(async (change: UpdateChange) => {
    if (!itemQuery.data) return;
    setShowEditTask(false);
    setBusy(true);
    setError(null);
    try {
      await confirmUpdateCommand(itemQuery.data.item.id, itemQuery.data.item.version, change);
      await queryClient.invalidateQueries({ queryKey: ['item-detail', currentUser?.id, params.itemId] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      showBanner('Updated', 'mint');
    } catch (caughtError) {
      setError((caughtError as Error).message);
      showErrorToast((caughtError as Error).message || 'Could not update task');
    } finally {
      setBusy(false);
    }
  }, [itemQuery.data, currentUser?.id, params.itemId, queryClient, showBanner]);

  const handleCreateReminderSave = useCallback(async (draft: DraftReminder) => {
    setShowCreateReminder(false);
    try {
      await confirmCreateReminderCommand(draft);
      await invalidateReminders();
      showBanner('Reminder created', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not create reminder');
    }
  }, [currentUser?.id, invalidateReminders, showBanner]);

  const handleCompleteReminder = useCallback(async (reminder: Reminder) => {
    try {
      await completeReminderCommand(reminder.id, reminder.version);
      await invalidateReminders();
      showBanner('Done', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not complete reminder');
    }
  }, [currentUser?.id, invalidateReminders, showBanner]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!snoozeReminder) return;
    const target = snoozeReminder;
    setSnoozeReminder(null);
    try {
      await snoozeReminderCommand(target.id, target.version, isoString);
      await invalidateReminders();
      showBanner(`Snoozed until ${new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'sky');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not snooze reminder');
    }
  }, [snoozeReminder, currentUser?.id, invalidateReminders, showBanner]);

  const handleCancelReminder = useCallback(async () => {
    if (!cancelReminder) return;
    const target = cancelReminder;
    setCancelReminder(null);
    try {
      await cancelReminderCommand(target.id, target.version);
      await invalidateReminders();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not cancel reminder');
    }
  }, [cancelReminder, currentUser?.id, invalidateReminders]);

  const handleEditReminderSave = useCallback(async (change: ReminderUpdateChange) => {
    if (!editReminder) return;
    const target = editReminder;
    setEditReminder(null);
    try {
      await confirmUpdateReminderCommand(target.id, target.version, change);
      await invalidateReminders();
      showBanner('Updated', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not update reminder');
    }
  }, [editReminder, currentUser?.id, invalidateReminders, showBanner]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
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
                        Assignee: {resolveUserName(item.assigneeUserId, members)} · Status: {item.status.replace('_', ' ')}
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

                {/* Linked reminders */}
                {linkedReminders.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {linkedReminders.map((rem) => (
                      <ReminderBlock
                        key={rem.id}
                        reminder={rem}
                        onDone={() => void handleCompleteReminder(rem)}
                        onSnooze={() => setSnoozeReminder(rem)}
                        onEdit={() => setEditReminder(rem)}
                        onRemove={() => setCancelReminder(rem)}
                        onNavigate={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: rem.id } })}
                      />
                    ))}
                    <AddReminderButton
                      label="Add another reminder"
                      icon="＋"
                      onClick={() => setShowCreateReminder(true)}
                    />
                  </div>
                )}
                {linkedReminders.length === 0 && (
                  <AddReminderButton
                    label="Add a reminder to this task"
                    icon="⚠️"
                    prominent
                    onClick={() => setShowCreateReminder(true)}
                  />
                )}

                {currentUser?.role === 'admin' ? (
                  <div>
                    <button
                      type="button"
                      className="rem-btn rem-btn-primary"
                      style={{ width: '100%' }}
                      disabled={busy}
                      onClick={() => setShowEditTask(true)}
                    >
                      Edit task
                    </button>
                    {error ? <p className="error-text" style={{ marginTop: 8 }}>{error}</p> : null}
                  </div>
                ) : (
                  <div className="card">
                    <p className="muted">You're viewing as {currentUser?.name ?? 'a household member'}. Updates are made by admins.</p>
                  </div>
                )}

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

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      {itemQuery.data && (
        <EditTaskSheet
          open={showEditTask}
          onClose={() => setShowEditTask(false)}
          item={itemQuery.data.item}
          onSave={(change) => void handleEditTaskSave(change)}
        />
      )}

      <CreateReminderSheet
        open={showCreateReminder}
        onClose={() => setShowCreateReminder(false)}
        onSave={handleCreateReminderSave}
        linkedItemId={params.itemId}
      />

      {editReminder && (
        <EditReminderSheet
          open={!!editReminder}
          onClose={() => setEditReminder(null)}
          reminder={editReminder}
          onSave={handleEditReminderSave}
        />
      )}

      <SnoozeSheet
        open={!!snoozeReminder}
        onClose={() => setSnoozeReminder(null)}
        onSelectTime={handleSnoozeSelect}
      />

      {cancelReminder && (
        <CancelConfirmSheet
          open={!!cancelReminder}
          onClose={() => setCancelReminder(null)}
          reminderTitle={cancelReminder.title}
          isRecurring={cancelReminder.recurrenceCadence !== 'none'}
          onCancelSingle={handleCancelReminder}
          onCancelSeries={handleCancelReminder}
        />
      )}

      <BottomNav activeTab="more" />
    </div>
  );
}
