import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DraftReminder, Reminder, ReminderState } from '@olivia/contracts';
import { computeReminderState } from '@olivia/domain';
import { Bell, Plus } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import {
  loadReminderView,
  confirmCreateReminderCommand,
  snoozeReminderCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { ReminderRow } from '../components/reminders/ReminderRow';
import { AddReminderButton } from '../components/reminders/AddReminderButton';
import { OliviaMessage } from '../components/reminders/OliviaMessage';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { formatSnoozeUntil } from '../lib/reminder-helpers';
import { showErrorToast } from '../lib/error-toast';

type FilterTab = 'all' | 'due' | 'upcoming' | 'snoozed' | 'done';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'snoozed', label: 'Snoozed' },
  { id: 'done', label: 'Done' },
];

function stateMatchesFilter(state: ReminderState, filter: FilterTab): boolean {
  switch (filter) {
    case 'all': return state !== 'completed' && state !== 'cancelled';
    case 'due': return state === 'due' || state === 'overdue';
    case 'upcoming': return state === 'upcoming';
    case 'snoozed': return state === 'snoozed';
    case 'done': return state === 'completed' || state === 'cancelled';
  }
}

export function RemindersPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<Reminder | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);

  const reminderQuery = useQuery({
    queryKey: ['reminder-view', role],
    queryFn: () => loadReminderView(role),
  });

  const { filteredReminders, counts } = useMemo(() => {
    if (!reminderQuery.data) {
      return { filteredReminders: [], counts: { all: 0, due: 0, upcoming: 0, snoozed: 0, done: 0 } };
    }

    const byState = reminderQuery.data.remindersByState;
    const all: Reminder[] = [
      ...byState.overdue,
      ...byState.due,
      ...byState.upcoming,
      ...byState.snoozed,
      ...byState.completed,
      ...byState.cancelled,
    ];

    const now = new Date();
    const filtered = all.filter((r) => {
      const state = computeReminderState(r, now);
      return stateMatchesFilter(state, activeFilter);
    });

    return {
      filteredReminders: filtered,
      counts: {
        all: byState.overdue.length + byState.due.length + byState.upcoming.length + byState.snoozed.length,
        due: byState.overdue.length + byState.due.length,
        upcoming: byState.upcoming.length,
        snoozed: byState.snoozed.length,
        done: byState.completed.length + byState.cancelled.length,
      },
    };
  }, [reminderQuery.data, activeFilter]);

  const groupedForAll = useMemo(() => {
    if (activeFilter !== 'all') return null;
    if (!reminderQuery.data) return null;
    const byState = reminderQuery.data.remindersByState;
    const groups: { label: string; reminders: Reminder[] }[] = [];
    if (byState.overdue.length > 0) groups.push({ label: 'Needs attention', reminders: byState.overdue });
    if (byState.due.length > 0) groups.push({ label: 'Due today', reminders: byState.due });
    if (byState.upcoming.length > 0) groups.push({ label: 'Upcoming', reminders: byState.upcoming });
    if (byState.snoozed.length > 0) groups.push({ label: 'Snoozed', reminders: byState.snoozed });
    return groups;
  }, [reminderQuery.data, activeFilter]);

  const subtitle = useMemo(() => {
    const active = counts.all;
    const snoozed = counts.snoozed;
    const parts: string[] = [];
    if (active > 0) parts.push(`${active} active`);
    if (snoozed > 0) parts.push(`${snoozed} snoozed`);
    if (activeFilter === 'done') return `${counts.done} completed`;
    return parts.join(' · ') || 'No reminders yet';
  }, [counts, activeFilter]);

  const handleCreateSave = useCallback(async (draft: DraftReminder) => {
    setShowCreateSheet(false);
    try {
      await confirmCreateReminderCommand(role, draft);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      setBanner({ message: 'Reminder created', variant: 'mint' });
      setTimeout(() => setBanner(null), 5000);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not create reminder');
    }
  }, [role, queryClient]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!snoozeTarget) return;
    setSnoozeTarget(null);
    try {
      await snoozeReminderCommand(role, snoozeTarget.id, snoozeTarget.version, isoString);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      setBanner({ message: `😴 Snoozed until ${formatSnoozeUntil(isoString)}`, variant: 'sky' });
      setTimeout(() => setBanner(null), 5000);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not snooze reminder');
    }
  }, [snoozeTarget, role, queryClient]);

  const isEmpty = !reminderQuery.isLoading && filteredReminders.length === 0;
  const isSpouse = role === 'spouse';
  const showAddButton = activeFilter !== 'done' && !isSpouse;

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px 0' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/' })}
          >
            ← Home
          </button>

          <div className="screen-title">Reminders</div>
          <div className="screen-sub" style={{ marginBottom: 16 }}>{subtitle}</div>

          <div className="rem-filters">
            {FILTER_TABS.map((tab) => {
              const count = counts[tab.id];
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`ftab${isActive ? ' active' : ''}`}
                  onClick={() => setActiveFilter(tab.id)}
                >
                  {tab.label}
                  {!isActive && count > 0 && tab.id !== 'all' && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {showAddButton && (
            <div style={{ marginBottom: 20 }}>
              <AddReminderButton
                label="Add a reminder…"
                icon={<Plus size={20} />}
                onClick={() => setShowCreateSheet(true)}
              />
            </div>
          )}
        </div>

        <div style={{ padding: '0 16px' }}>
          {reminderQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading reminders…
            </div>
          )}

          {reminderQuery.isError && !reminderQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              {(reminderQuery.error as Error).message}
            </div>
          )}

          {isEmpty && activeFilter === 'all' && (
            <div className="rem-empty">
              <div className="rem-empty-icon"><Bell size={48} weight="bold" /></div>
              <div className="rem-empty-title">Reminders</div>
              <div className="rem-empty-sub">No reminders yet</div>
              <OliviaMessage
                text="No reminders yet. You can say something like 'Remind me next Thursday to call the vet' and I'll take care of it."
              />
              {!isSpouse && (
                <div style={{ marginTop: 16, width: '100%' }}>
                  <AddReminderButton
                    label="Add a reminder…"
                    icon={<Plus size={20} />}
                    onClick={() => setShowCreateSheet(true)}
                  />
                </div>
              )}
            </div>
          )}

          {isEmpty && activeFilter === 'done' && (
            <div className="rem-empty">
              <OliviaMessage
                text="That's all your completed reminders. More will appear here as you finish them."
              />
            </div>
          )}

          {isEmpty && activeFilter !== 'all' && activeFilter !== 'done' && (
            <div className="rem-empty">
              <div className="rem-empty-sub">No {activeFilter} reminders right now.</div>
            </div>
          )}

          {!isEmpty && groupedForAll && (
            <div className="rem-list">
              {groupedForAll.map((group) => (
                <div key={group.label}>
                  <div className="rem-group-header">{group.label}</div>
                  {group.reminders.map((r) => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      onClick={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: r.id } })}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {!isEmpty && !groupedForAll && (
            <div className="rem-list">
              {activeFilter === 'done' && (
                <div className="rem-group-header">Completed</div>
              )}
              {filteredReminders.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  onClick={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: r.id } })}
                />
              ))}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      <CreateReminderSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleCreateSave}
      />

      <SnoozeSheet
        open={!!snoozeTarget}
        onClose={() => setSnoozeTarget(null)}
        onSelectTime={handleSnoozeSelect}
      />

      <BottomNav activeTab="home" />
    </div>
  );
}
