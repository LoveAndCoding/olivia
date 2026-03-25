import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Bell, ArrowsClockwise, CookingPot, CalendarCheck, Plus } from '@phosphor-icons/react';
import { getWeekBounds } from '@olivia/domain';
import type { WeeklyReminder, WeeklyRoutineOccurrence, WeeklyMealEntry, Reminder, DraftReminder } from '@olivia/contracts';
import { useAuth } from '../lib/auth';
import { loadWeeklyView, loadReminderView, confirmCreateReminderCommand, snoozeReminderCommand } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { ReminderRow } from '../components/reminders/ReminderRow';
import { AddReminderButton } from '../components/reminders/AddReminderButton';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { formatSnoozeUntil } from '../lib/reminder-helpers';
import { showErrorToast } from '../lib/error-toast';

type Segment = 'today' | 'reminders' | 'routines' | 'meals';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'routines', label: 'Routines' },
  { id: 'meals', label: 'Meals' },
];

// ── Section header (combined view) ───────────────────────────────────────────

function DailySectionHeader({ type, count, onSeeAll }: { type: 'reminders' | 'routines' | 'meals'; count: number; onSeeAll: () => void }) {
  const config = {
    reminders: { icon: <Bell size={16} />, className: 'daily-section-icon reminders', label: 'Reminders' },
    routines: { icon: <ArrowsClockwise size={16} />, className: 'daily-section-icon routines', label: 'Routines' },
    meals: { icon: <CookingPot size={16} />, className: 'daily-section-icon meals', label: 'Meals' },
  }[type];

  return (
    <div className="daily-section-header">
      <span className={config.className} aria-hidden="true">{config.icon}</span>
      <span className="daily-section-title">{config.label}</span>
      <span className="daily-section-count">{count} today</span>
      <button type="button" className="daily-section-see-all" onClick={onSeeAll} aria-label={`See all ${config.label.toLowerCase()}`}>
        See all →
      </button>
    </div>
  );
}

// ── Reminder row for Daily view ──────────────────────────────────────────────

function DailyReminderItem({ item, onClick }: { item: WeeklyReminder; onClick: () => void }) {
  const isOverdue = item.dueState === 'overdue';
  const isCompleted = item.dueState === 'completed';
  const accentClass = isOverdue ? 'accent-rose' : isCompleted ? 'accent-mint' : item.dueState === 'snoozed' ? 'accent-sky' : item.dueState === 'due' ? 'accent-violet' : 'accent-peach';

  return (
    <button type="button" className={`daily-item ${accentClass}${isCompleted ? ' completed' : ''}`} onClick={onClick}>
      <span className={`daily-item-dot ${accentClass}`} aria-hidden="true" />
      <span className="daily-item-body">
        <span className="daily-item-title">{item.title}</span>
        <span className="daily-item-meta">{format(new Date(item.scheduledAt), 'h:mm a')} · {item.assigneeUserId}</span>
      </span>
      {!isCompleted && (
        <span className={`rem-badge rem-badge-${isOverdue ? 'rose' : item.dueState === 'due' ? 'peach' : item.dueState === 'snoozed' ? 'sky' : 'neutral'}`}>
          {isOverdue ? 'Overdue' : item.dueState === 'due' ? 'Due' : item.dueState === 'snoozed' ? 'Snoozed' : 'Upcoming'}
        </span>
      )}
    </button>
  );
}

// ── Routine row for Daily view ───────────────────────────────────────────────

function DailyRoutineItem({ item, onClick }: { item: WeeklyRoutineOccurrence; onClick: () => void }) {
  const isCompleted = item.completed;
  const isOverdue = item.dueState === 'overdue';
  const accentClass = isCompleted ? 'accent-mint' : isOverdue ? 'accent-rose' : 'accent-mint';
  const recLabel = item.recurrenceRule === 'every_n_days' && item.intervalDays
    ? `Every ${item.intervalDays} days`
    : item.recurrenceRule.charAt(0).toUpperCase() + item.recurrenceRule.slice(1);

  return (
    <button type="button" className={`daily-item ${accentClass}${isCompleted ? ' completed' : ''}`} onClick={onClick}>
      <span className={`daily-item-dot ${accentClass}`} aria-hidden="true" />
      <span className="daily-item-body">
        <span className="daily-item-title">{item.routineTitle}</span>
        <span className="daily-item-meta">{recLabel} · {item.assigneeUserId}</span>
      </span>
      {!isCompleted && (
        <span className={`rem-badge rem-badge-${isOverdue ? 'rose' : item.dueState === 'due' ? 'peach' : 'neutral'}`}>
          {isOverdue ? 'Overdue' : item.dueState === 'due' ? 'Due' : 'Upcoming'}
        </span>
      )}
    </button>
  );
}

// ── Meal row for Daily view ──────────────────────────────────────────────────

function DailyMealItem({ item, onClick }: { item: WeeklyMealEntry; onClick: () => void }) {
  return (
    <button type="button" className="daily-item accent-peach" onClick={onClick}>
      <span className="daily-item-dot accent-peach" aria-hidden="true" />
      <span className="daily-item-body">
        <span className="daily-item-title">{item.name}</span>
        <span className="daily-item-meta">{item.planTitle}</span>
      </span>
    </button>
  );
}

// ── Max items in combined view per section ────────────────────────────────────

const MAX_COMBINED_ITEMS = 5;

// ── Main component ───────────────────────────────────────────────────────────

export function DailyPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Read segment from URL search params
  const search = useSearch({ strict: false }) as { segment?: string };
  const initialSegment = (['today', 'reminders', 'routines', 'meals'].includes(search.segment ?? '') ? search.segment as Segment : null);

  const [activeSegment, setActiveSegment] = useState<Segment>(initialSegment ?? 'today');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<Reminder | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);

  // Sync segment from URL on navigation (e.g. Home → "All Reminders →")
  useEffect(() => {
    if (initialSegment && initialSegment !== activeSegment) {
      setActiveSegment(initialSegment);
    }
    // Only react to URL changes, not internal segment switches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSegment]);

  // Weekly view data
  const { weekStart } = useMemo(() => getWeekBounds(new Date()), []);
  const weekStartString = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);
  const weeklyQuery = useQuery({
    queryKey: ['weekly-view', weekStartString],
    queryFn: () => loadWeeklyView(weekStartString),
  });

  // Full reminder data (for segment view with filters)
  const reminderQuery = useQuery({
    queryKey: ['reminder-view', currentUser?.id],
    queryFn: () => loadReminderView(),
    enabled: activeSegment === 'reminders',
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayData = useMemo(() => {
    if (!weeklyQuery.data) return null;
    return weeklyQuery.data.days.find(d => d.date === todayStr) ?? null;
  }, [weeklyQuery.data, todayStr]);

  const dateLabel = useMemo(() => format(new Date(), 'EEEE, MMMM d'), []);

  const screenTitle = activeSegment === 'today' ? 'Today'
    : activeSegment === 'reminders' ? 'Reminders'
    : activeSegment === 'routines' ? 'Routines'
    : 'Meals';

  const subtitle = useMemo(() => {
    if (activeSegment === 'today') return dateLabel;
    if (!todayData) return '';
    if (activeSegment === 'reminders') {
      if (reminderQuery.data) {
        const byState = reminderQuery.data.remindersByState;
        const active = byState.overdue.length + byState.due.length + byState.upcoming.length + byState.snoozed.length;
        const snoozed = byState.snoozed.length;
        const parts: string[] = [];
        if (active > 0) parts.push(`${active} active`);
        if (snoozed > 0) parts.push(`${snoozed} snoozed`);
        return parts.join(' · ') || 'No reminders';
      }
      return `${todayData.reminders.length} today`;
    }
    if (activeSegment === 'routines') return `${todayData.routines.length} today`;
    if (activeSegment === 'meals') return `${todayData.meals.length} today`;
    return '';
  }, [activeSegment, dateLabel, todayData, reminderQuery.data]);

  // Check if combined view is completely empty
  const combinedEmpty = useMemo(() => {
    if (!todayData) return true;
    return todayData.reminders.length === 0 && todayData.routines.length === 0 && todayData.meals.length === 0;
  }, [todayData]);

  // Check if combined view has all items done
  const allDone = useMemo(() => {
    if (!todayData || combinedEmpty) return false;
    const remindersDone = todayData.reminders.every(r => r.dueState === 'completed');
    const routinesDone = todayData.routines.every(r => r.completed);
    // Meals don't have a "done" state
    return remindersDone && routinesDone;
  }, [todayData, combinedEmpty]);

  // Reminder create/snooze handlers
  const handleCreateSave = useCallback(async (draft: DraftReminder) => {
    setShowCreateSheet(false);
    try {
      await confirmCreateReminderCommand(draft);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      setBanner({ message: 'Reminder created', variant: 'mint' });
      setTimeout(() => setBanner(null), 5000);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not create reminder');
    }
  }, [currentUser?.id, queryClient]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!snoozeTarget) return;
    setSnoozeTarget(null);
    try {
      await snoozeReminderCommand(snoozeTarget.id, snoozeTarget.version, isoString);
      await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      setBanner({ message: `😴 Snoozed until ${formatSnoozeUntil(isoString)}`, variant: 'sky' });
      setTimeout(() => setBanner(null), 5000);
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not snooze reminder');
    }
  }, [snoozeTarget, currentUser?.id, queryClient]);

  // ── Reminders segment: full list with grouping ────────────────────────────

  const reminderGroups = useMemo(() => {
    if (activeSegment !== 'reminders' || !reminderQuery.data) return null;
    const byState = reminderQuery.data.remindersByState;
    const groups: { label: string; reminders: Reminder[] }[] = [];
    if (byState.overdue.length > 0) groups.push({ label: 'OVERDUE', reminders: byState.overdue });
    if (byState.due.length > 0) groups.push({ label: 'DUE TODAY', reminders: byState.due });
    if (byState.upcoming.length > 0) groups.push({ label: 'UPCOMING', reminders: byState.upcoming });
    if (byState.snoozed.length > 0) groups.push({ label: 'SNOOZED', reminders: byState.snoozed });
    return groups;
  }, [activeSegment, reminderQuery.data]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '12px 16px 0' }}>
          <div className="screen-title">{screenTitle}</div>
          <div className="screen-sub" style={{ marginBottom: 16 }}>{subtitle}</div>

          {/* Segment control */}
          <div className="segment-control" role="tablist" aria-label="Daily view segments">
            {SEGMENTS.map((seg) => (
              <button
                key={seg.id}
                type="button"
                role="tab"
                aria-selected={activeSegment === seg.id}
                className={`segment-item${activeSegment === seg.id ? ' active' : ''}`}
                onClick={() => setActiveSegment(seg.id)}
              >
                {seg.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 16px 0' }} role="tabpanel" aria-labelledby={`segment-${activeSegment}`}>
          {/* Loading */}
          {weeklyQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          )}

          {/* Error */}
          {weeklyQuery.isError && !weeklyQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              Unable to load daily view.
              <button type="button" style={{ marginLeft: 8, color: 'var(--violet)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => void weeklyQuery.refetch()}>
                Retry
              </button>
            </div>
          )}

          {/* ── Combined "Today" view ── */}
          {activeSegment === 'today' && weeklyQuery.data && (
            <>
              {/* All done message */}
              {allDone && !combinedEmpty && (
                <div className="daily-olivia-message">
                  <em>Everything's done for today — well done.</em>
                </div>
              )}

              {/* Empty state */}
              {combinedEmpty && (
                <div className="daily-empty">
                  <CalendarCheck size={48} weight="light" style={{ color: 'var(--ink-3)', marginBottom: 16 }} />
                  <div className="daily-olivia-message">
                    <em>Nothing planned for today. Your day is wide open.</em>
                  </div>
                  <div className="daily-empty-actions">
                    <button type="button" className="add-rem-btn" onClick={() => { setActiveSegment('reminders'); setShowCreateSheet(true); }}>
                      <span className="add-icon"><Plus size={18} /></span>
                      <span className="add-label">Add Reminder</span>
                    </button>
                    <button type="button" className="add-rem-btn" onClick={() => void navigate({ to: '/routines' })}>
                      <span className="add-icon"><Plus size={18} /></span>
                      <span className="add-label">Add Routine</span>
                    </button>
                    <button type="button" className="add-rem-btn" onClick={() => void navigate({ to: '/meals' })}>
                      <span className="add-icon"><Plus size={18} /></span>
                      <span className="add-label">Plan Meal</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Reminders section */}
              {todayData && todayData.reminders.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <DailySectionHeader
                    type="reminders"
                    count={todayData.reminders.length}
                    onSeeAll={() => setActiveSegment('reminders')}
                  />
                  {todayData.reminders.slice(0, MAX_COMBINED_ITEMS).map((r) => (
                    <div key={r.reminderId} style={{ marginBottom: 8 }}>
                      <DailyReminderItem
                        item={r}
                        onClick={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: r.reminderId } })}
                      />
                    </div>
                  ))}
                  {todayData.reminders.length > MAX_COMBINED_ITEMS && (
                    <button type="button" className="daily-show-more" onClick={() => setActiveSegment('reminders')}>
                      Show {todayData.reminders.length - MAX_COMBINED_ITEMS} more
                    </button>
                  )}
                </div>
              )}

              {/* Routines section */}
              {todayData && todayData.routines.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <DailySectionHeader
                    type="routines"
                    count={todayData.routines.length}
                    onSeeAll={() => setActiveSegment('routines')}
                  />
                  {todayData.routines.slice(0, MAX_COMBINED_ITEMS).map((r, i) => (
                    <div key={`${r.routineId}-${i}`} style={{ marginBottom: 8 }}>
                      <DailyRoutineItem
                        item={r}
                        onClick={() => void navigate({ to: '/routines/$routineId', params: { routineId: r.routineId } })}
                      />
                    </div>
                  ))}
                  {todayData.routines.length > MAX_COMBINED_ITEMS && (
                    <button type="button" className="daily-show-more" onClick={() => setActiveSegment('routines')}>
                      Show {todayData.routines.length - MAX_COMBINED_ITEMS} more
                    </button>
                  )}
                </div>
              )}

              {/* Meals section */}
              {todayData && todayData.meals.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <DailySectionHeader
                    type="meals"
                    count={todayData.meals.length}
                    onSeeAll={() => setActiveSegment('meals')}
                  />
                  {todayData.meals.slice(0, MAX_COMBINED_ITEMS).map((m) => (
                    <div key={m.entryId} style={{ marginBottom: 8 }}>
                      <DailyMealItem
                        item={m}
                        onClick={() => void navigate({ to: '/meals/$planId', params: { planId: m.planId } })}
                      />
                    </div>
                  ))}
                  {todayData.meals.length > MAX_COMBINED_ITEMS && (
                    <button type="button" className="daily-show-more" onClick={() => setActiveSegment('meals')}>
                      Show {todayData.meals.length - MAX_COMBINED_ITEMS} more
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Reminders segment ── */}
          {activeSegment === 'reminders' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <AddReminderButton
                  label="Add a reminder…"
                  icon={<Plus size={20} />}
                  onClick={() => setShowCreateSheet(true)}
                />
              </div>

              {reminderQuery.isLoading && (
                <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>Loading reminders…</div>
              )}

              {reminderQuery.data && reminderGroups && reminderGroups.length > 0 && (
                <div className="rem-list">
                  {reminderGroups.map((group) => (
                    <div key={group.label}>
                      <div className="daily-group-header">{group.label}</div>
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

              {reminderQuery.data && (!reminderGroups || reminderGroups.length === 0) && (
                <div className="daily-empty">
                  <Bell size={48} weight="light" style={{ color: 'var(--ink-3)', marginBottom: 16 }} />
                  <div className="daily-olivia-message">
                    <em>No reminders yet. Tap + to set one up.</em>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Routines segment ── */}
          {activeSegment === 'routines' && weeklyQuery.data && (
            <>
              <div style={{ marginBottom: 16 }}>
                <button type="button" className="add-rem-btn" onClick={() => void navigate({ to: '/routines' })} style={{ width: '100%' }}>
                  <span className="add-icon"><Plus size={20} /></span>
                  <span className="add-label">Manage routines…</span>
                </button>
              </div>

              {todayData && todayData.routines.length > 0 ? (
                <div className="rem-list">
                  {todayData.routines.map((r, i) => (
                    <div key={`${r.routineId}-${i}`} style={{ marginBottom: 8 }}>
                      <DailyRoutineItem
                        item={r}
                        onClick={() => void navigate({ to: '/routines/$routineId', params: { routineId: r.routineId } })}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="daily-empty">
                  <ArrowsClockwise size={48} weight="light" style={{ color: 'var(--ink-3)', marginBottom: 16 }} />
                  <div className="daily-olivia-message">
                    <em>No routines today.</em>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Meals segment ── */}
          {activeSegment === 'meals' && weeklyQuery.data && (
            <>
              <div style={{ marginBottom: 16 }}>
                <button type="button" className="add-rem-btn" onClick={() => void navigate({ to: '/meals' })} style={{ width: '100%' }}>
                  <span className="add-icon"><Plus size={20} /></span>
                  <span className="add-label">Manage meal plans…</span>
                </button>
              </div>

              {todayData && todayData.meals.length > 0 ? (
                <div className="rem-list">
                  {todayData.meals.map((m) => (
                    <div key={m.entryId} style={{ marginBottom: 8 }}>
                      <DailyMealItem
                        item={m}
                        onClick={() => void navigate({ to: '/meals/$planId', params: { planId: m.planId } })}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="daily-empty">
                  <CookingPot size={48} weight="light" style={{ color: 'var(--ink-3)', marginBottom: 16 }} />
                  <div className="daily-olivia-message">
                    <em>No meals planned for today.</em>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="spacer-bottom" />
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

      <BottomNav activeTab="daily" />
    </div>
  );
}
