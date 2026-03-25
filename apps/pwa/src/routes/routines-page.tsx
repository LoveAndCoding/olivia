import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import type { Routine, RoutineDueState, RoutineRecurrenceRule, User } from '@olivia/contracts';
import { computeRoutineDueState as computeDueState, formatRecurrenceLabel as formatRecurrenceLabelDomain, calculateFirstDueDate } from '@olivia/domain';
import { ArrowsClockwise, Plus } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import { useAuth } from '../lib/auth';
import { getHouseholdMembers } from '../lib/auth-api';
import {
  loadActiveRoutineIndex,
  loadArchivedRoutineIndex,
  completeRoutineOccurrenceCommand,
  createRoutineCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { BottomSheet } from '../components/reminders/BottomSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { showErrorToast } from '../lib/error-toast';
import { WeekdayPicker } from '../components/routines/WeekdayPicker';
import { WeekIntervalStepper } from '../components/routines/WeekIntervalStepper';

type FilterTab = 'active' | 'archived';

function formatDueDate(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function formatLastDone(lastCompletedAt: string | null | undefined): string {
  if (!lastCompletedAt) return 'Not yet done';
  const date = new Date(lastCompletedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    return `Last done: ${format(date, 'MMM d')}`;
  }
  return `Last done: ${formatDistanceToNow(date, { addSuffix: false })} ago`;
}

function dueStateBadge(state: RoutineDueState): { label: string; className: string } {
  switch (state) {
    case 'overdue': return { label: 'Needs attention', className: 'rem-badge rem-badge-rose' };
    case 'due': return { label: 'Due today', className: 'rem-badge rem-badge-peach' };
    case 'upcoming': return { label: 'Upcoming', className: 'rem-badge rem-badge-neutral' };
    case 'completed': return { label: 'Done', className: 'rem-badge rem-badge-mint' };
    case 'paused': return { label: 'Paused', className: 'rem-badge rem-badge-sky' };
  }
}

type RoutineCardProps = {
  routine: Routine;
  dueState: RoutineDueState | null;
  onComplete: () => void;
  onNavigate: () => void;
  isSpouse: boolean;
  busy: boolean;
};

function RitualCard({ routine, dueState, onStartReview, isSpouse }: {
  routine: Routine;
  dueState: RoutineDueState;
  onStartReview: () => void;
  isSpouse: boolean;
}) {
  const badge = dueStateBadge(dueState);
  const canStart = !isSpouse && (dueState === 'due' || dueState === 'overdue');

  return (
    <div
      className="list-card"
      style={{ cursor: canStart ? 'pointer' : 'default' }}
      onClick={canStart ? onStartReview : undefined}
      role={canStart ? 'button' : undefined}
      tabIndex={canStart ? 0 : undefined}
      onKeyDown={canStart ? (e) => e.key === 'Enter' && onStartReview() : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: canStart ? 10 : 0 }}>
        <span style={{ fontSize: 16, color: 'var(--mint)', flexShrink: 0 }}><ArrowsClockwise size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="list-card-title" style={{ fontWeight: 600 }}>{routine.title}</div>
          <div className="list-card-meta" style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>
            {routine.currentDueDate ? formatDueDate(routine.currentDueDate) : ''} · {formatRecurrenceLabelDomain(routine.recurrenceRule, routine.intervalDays, routine.weekdays, routine.intervalWeeks)}
          </div>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </div>

      {canStart && (
        <button
          type="button"
          aria-label={`Start review for "${routine.title}"`}
          onClick={(e) => {
            e.stopPropagation();
            onStartReview();
          }}
          style={{
            width: '100%',
            height: 44,
            background: 'var(--bg)',
            border: '1.5px solid var(--violet)',
            borderRadius: 10,
            color: 'var(--violet)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            transition: 'transform 150ms ease',
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
        >
          Start review →
        </button>
      )}
    </div>
  );
}

function RoutineCard({ routine, dueState, onComplete, onNavigate, isSpouse, busy }: RoutineCardProps) {
  const isAdHoc = routine.recurrenceRule === 'ad_hoc';
  const badge = dueState ? dueStateBadge(dueState) : null;
  const canComplete = !isSpouse && (isAdHoc || (dueState && (dueState === 'due' || dueState === 'overdue')));
  const isOverdue = dueState === 'overdue';

  return (
    <div
      className="list-card"
      style={{
        cursor: 'pointer',
        borderLeft: isOverdue ? '3px solid var(--rose)' : isAdHoc ? undefined : undefined,
        paddingLeft: isOverdue ? 13 : undefined,
      }}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {canComplete && (
          <button
            type="button"
            className="task-checkbox"
            aria-label={`Complete "${routine.title}"`}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            style={{ flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="list-card-title" style={{ fontWeight: 600 }}>{routine.title}</div>
          <div className="list-card-meta" style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>
            {routine.currentDueDate ? formatDueDate(routine.currentDueDate) + ' · ' : ''}
            {formatRecurrenceLabelDomain(routine.recurrenceRule, routine.intervalDays, routine.weekdays, routine.intervalWeeks)}
          </div>
          <div style={{
            fontSize: isAdHoc ? 12 : 11,
            fontWeight: isAdHoc ? 500 : 400,
            color: isAdHoc ? 'var(--ink-2)' : 'var(--ink-3)',
            marginTop: 4,
          }}>
            {formatLastDone(routine.lastCompletedAt)}
          </div>
        </div>
        {badge && <span className={badge.className}>{badge.label}</span>}
      </div>
    </div>
  );
}

type RecurrenceOption = {
  value: RoutineRecurrenceRule;
  label: string;
  description: string;
};

const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { value: 'daily', label: 'Every day', description: 'Daily recurrence' },
  { value: 'every_n_days', label: 'Every N days', description: 'Fixed interval in days' },
  { value: 'weekly', label: 'Weekly', description: 'Every week on a day' },
  { value: 'weekly_on_days', label: 'Weekly on specific days', description: 'Multiple weekdays' },
  { value: 'every_n_weeks', label: 'Every N weeks', description: 'Alternating weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Monthly on a date' },
  { value: 'ad_hoc', label: 'No schedule — track when done', description: 'For recurring tasks without a fixed schedule' },
];


type CreateRoutineFormState = {
  title: string;
  assigneeUserId: string | null;
  recurrenceRule: RoutineRecurrenceRule | '';
  intervalDays: string;
  intervalWeeks: number;
  weekdays: number[];
  firstDueDate: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function RoutinesPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const { user: currentUser, getSessionToken } = useAuth();
  const [members, setMembers] = useState<User[]>(currentUser ? [currentUser] : []);
  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    getHouseholdMembers(token).then(res => setMembers(res.members)).catch(() => {});
  }, [getSessionToken]);

  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateRoutineFormState>({
    title: '',
    assigneeUserId: currentUser?.id ?? null,
    recurrenceRule: '',
    intervalDays: '7',
    intervalWeeks: 2,
    weekdays: [],
    firstDueDate: todayIso(),
  });
  const [formError, setFormError] = useState<string | null>(null);

  const activeQuery = useQuery({
    queryKey: ['routine-index-active', role],
    queryFn: () => loadActiveRoutineIndex(role),
    enabled: activeTab === 'active',
  });

  const archivedQuery = useQuery({
    queryKey: ['routine-index-archived', role],
    queryFn: () => loadArchivedRoutineIndex(role),
    enabled: activeTab === 'archived',
  });

  const currentQuery = activeTab === 'active' ? activeQuery : archivedQuery;

  const getRoutineDueState = useCallback((routine: Routine): RoutineDueState | null => {
    if (routine.recurrenceRule === 'ad_hoc') return null;
    return routine.dueState ?? computeDueState(routine, null);
  }, []);

  const { scheduledGroups, trackedRoutines } = useMemo(() => {
    if (activeTab !== 'active' || !activeQuery.data) return { scheduledGroups: null, trackedRoutines: [] };
    const routines = activeQuery.data.routines;
    const groups: Record<RoutineDueState, Routine[]> = {
      overdue: [], due: [], upcoming: [], completed: [], paused: []
    };
    const tracked: Routine[] = [];

    for (const routine of routines) {
      if (routine.recurrenceRule === 'ad_hoc') {
        tracked.push(routine);
      } else {
        const state = getRoutineDueState(routine);
        if (state) groups[state].push(routine);
      }
    }

    // Sort tracked by staleness: never-completed first, then oldest last-done first
    tracked.sort((a, b) => {
      const aLast = a.lastCompletedAt;
      const bLast = b.lastCompletedAt;
      if (!aLast && !bLast) return 0;
      if (!aLast) return -1;
      if (!bLast) return 1;
      return new Date(aLast).getTime() - new Date(bLast).getTime();
    });

    return { scheduledGroups: groups, trackedRoutines: tracked };
  }, [activeQuery.data, activeTab, getRoutineDueState]);

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const handleComplete = useCallback(async (routine: Routine) => {
    if (busyId) return;
    setBusyId(routine.id);
    try {
      await completeRoutineOccurrenceCommand(role, routine.id, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      showBanner(routine.recurrenceRule === 'ad_hoc' ? 'Marked as done' : 'Marked complete', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not complete routine');
    } finally {
      setBusyId(null);
    }
  }, [busyId, role, queryClient, showBanner]);

  const handleCreateSubmit = useCallback(async () => {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.recurrenceRule) { setFormError('Recurrence is required.'); return; }
    if (form.recurrenceRule === 'every_n_days') {
      const n = parseInt(form.intervalDays, 10);
      if (!n || n <= 0) { setFormError('Interval must be a positive number.'); return; }
    }
    if (form.recurrenceRule === 'weekly_on_days' && form.weekdays.length === 0) {
      setFormError('Select at least one day.'); return;
    }
    if (form.recurrenceRule === 'every_n_weeks' && form.weekdays.length !== 1) {
      setFormError('Select exactly one day for the interval.'); return;
    }
    setFormError(null);
    setShowCreateSheet(false);

    const isAdHoc = form.recurrenceRule === 'ad_hoc';
    const intervalDays = form.recurrenceRule === 'every_n_days' ? parseInt(form.intervalDays, 10) : null;
    const intervalWeeks = form.recurrenceRule === 'every_n_weeks' ? form.intervalWeeks : null;
    const weekdays = (form.recurrenceRule === 'weekly_on_days' || form.recurrenceRule === 'every_n_weeks') ? form.weekdays : null;

    let firstDueDate: string | null;
    if (isAdHoc) {
      firstDueDate = null;
    } else if (form.recurrenceRule === 'weekly_on_days' || form.recurrenceRule === 'every_n_weeks') {
      firstDueDate = calculateFirstDueDate(form.recurrenceRule, weekdays);
    } else {
      firstDueDate = new Date(form.firstDueDate + 'T12:00:00').toISOString();
    }

    try {
      await createRoutineCommand(role, form.title.trim(), form.assigneeUserId, form.recurrenceRule, firstDueDate, intervalDays, weekdays, intervalWeeks);
      await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      setForm({ title: '', assigneeUserId: currentUser?.id ?? null, recurrenceRule: '', intervalDays: '7', intervalWeeks: 2, weekdays: [], firstDueDate: todayIso() });
      showBanner('Routine created', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not create routine');
    }
  }, [form, role, queryClient, showBanner]);

  const isReadOnly = currentUser?.role === 'member' || role === 'spouse';
  const isLoading = currentQuery.isLoading;
  const isError = currentQuery.isError;

  const GROUP_ORDER: RoutineDueState[] = ['overdue', 'due', 'upcoming', 'completed', 'paused'];
  const GROUP_LABELS: Record<RoutineDueState, string> = {
    overdue: 'Needs attention', due: 'Due today', upcoming: 'Upcoming', completed: 'Recently completed', paused: 'Paused'
  };

  const isEmpty = !isLoading && !isError && (
    activeTab === 'active'
      ? (activeQuery.data?.routines.length === 0)
      : (archivedQuery.data?.routines.length === 0)
  );

  // Determine if we need weekday picker or other sub-controls in create sheet
  const needsWeekdayPicker = form.recurrenceRule === 'weekly_on_days' || form.recurrenceRule === 'every_n_weeks' || form.recurrenceRule === 'weekly';
  const weekdayPickerMode = form.recurrenceRule === 'weekly_on_days' ? 'multi' : 'single';
  const needsIntervalStepper = form.recurrenceRule === 'every_n_weeks';
  const needsIntervalDays = form.recurrenceRule === 'every_n_days';
  const needsFirstDueDate = form.recurrenceRule !== '' && form.recurrenceRule !== 'ad_hoc' && form.recurrenceRule !== 'weekly_on_days' && form.recurrenceRule !== 'every_n_weeks';

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px 0' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/daily', search: { segment: 'routines' } })}
          >
            ← Daily
          </button>

          <div className="screen-title">Routines</div>
          <div className="screen-sub" style={{ marginBottom: 16 }}>
            {activeTab === 'active'
              ? (activeQuery.data ? `${activeQuery.data.routines.length} routines` : 'Recurring routines')
              : 'Archived'
            }
          </div>

          {isReadOnly && (
            <div className="list-spouse-banner" role="status" style={{ marginBottom: 16 }}>
              Viewing as household member — read-only access.
            </div>
          )}

          <div className="rem-filters">
            <button
              type="button"
              className={`ftab${activeTab === 'active' ? ' active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`ftab${activeTab === 'archived' ? ' active' : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              Archived
            </button>
          </div>

          {!isReadOnly && activeTab === 'active' && (
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="add-rem-btn"
                onClick={() => setShowCreateSheet(true)}
                style={{ width: '100%' }}
              >
                <span className="add-icon"><Plus size={20} /></span>
                <span className="add-label">New routine…</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '0 16px' }}>
          {isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading routines…
            </div>
          )}

          {isError && !isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              {(currentQuery.error as Error).message}
            </div>
          )}

          {isEmpty && activeTab === 'active' && (
            <div className="rem-empty">
              <div className="rem-empty-icon"><ArrowsClockwise size={48} weight="bold" /></div>
              <div className="rem-empty-title">No routines yet</div>
              <div className="rem-empty-sub">Add a recurring routine to track household tasks on a regular schedule.</div>
              {!isReadOnly && (
                <div style={{ marginTop: 16, width: '100%' }}>
                  <button
                    type="button"
                    className="add-rem-btn add-rem-btn-prominent"
                    onClick={() => setShowCreateSheet(true)}
                    style={{ width: '100%' }}
                  >
                    <span className="add-icon"><Plus size={20} /></span>
                    <span className="add-label">New routine…</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {isEmpty && activeTab === 'archived' && (
            <div className="rem-empty">
              <div className="rem-empty-sub">No archived routines.</div>
            </div>
          )}

          {/* Active routines grouped by due state */}
          {!isEmpty && activeTab === 'active' && scheduledGroups && (
            <div className="rem-list">
              {GROUP_ORDER.map((state) => {
                const items = scheduledGroups[state];
                if (items.length === 0) return null;
                return (
                  <div key={state}>
                    <div className="rem-group-header">{GROUP_LABELS[state]}</div>
                    {items.map((routine) => (
                      routine.ritualType === 'weekly_review' ? (
                        <RitualCard
                          key={routine.id}
                          routine={routine}
                          dueState={state}
                          onStartReview={() => void navigate({
                            to: '/routines/$routineId/review/$occurrenceId',
                            params: { routineId: routine.id, occurrenceId: crypto.randomUUID() },
                          })}
                          isSpouse={isReadOnly}
                        />
                      ) : (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        dueState={state}
                        onComplete={() => void handleComplete(routine)}
                        onNavigate={() => void navigate({ to: '/routines/$routineId', params: { routineId: routine.id } })}
                        isSpouse={isReadOnly}
                        busy={busyId === routine.id}
                      />
                      )
                    ))}
                  </div>
                );
              })}

              {/* Tracked section for ad-hoc routines */}
              {trackedRoutines.length > 0 && (
                <>
                  <div className="tracked-section-divider" />
                  <div className="tracked-section-header" role="heading" aria-level={2}>TRACKED</div>
                  {trackedRoutines.map((routine) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      dueState={null}
                      onComplete={() => void handleComplete(routine)}
                      onNavigate={() => void navigate({ to: '/routines/$routineId', params: { routineId: routine.id } })}
                      isSpouse={isReadOnly}
                      busy={busyId === routine.id}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Archived routines flat list */}
          {!isEmpty && activeTab === 'archived' && archivedQuery.data && (
            <div className="rem-list">
              {archivedQuery.data.routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  dueState="paused"
                  onComplete={() => undefined}
                  onNavigate={() => void navigate({ to: '/routines/$routineId', params: { routineId: routine.id } })}
                  isSpouse={true}
                  busy={false}
                />
              ))}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      {/* Create routine sheet */}
      <BottomSheet
        open={showCreateSheet}
        onClose={() => { setShowCreateSheet(false); setFormError(null); }}
        title="New Routine"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
              Title
            </label>
            <input
              type="text"
              className="rem-form-input"
              placeholder="e.g. Take out the trash"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
              Assignee
            </label>
            <select
              className="rem-form-input"
              value={form.assigneeUserId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, assigneeUserId: e.target.value || null }))}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.id === currentUser?.id ? ' (me)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
              Recurrence
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {RECURRENCE_OPTIONS.map((option) => {
                const isActive = form.recurrenceRule === option.value;
                return (
                  <div key={option.value}>
                    <button
                      type="button"
                      className={`recurrence-option-row${isActive ? ' recurrence-option-row-active' : ''}`}
                      onClick={() => setForm((f) => ({
                        ...f,
                        recurrenceRule: option.value,
                        weekdays: option.value === 'weekly' ? (f.weekdays.length > 0 ? [f.weekdays[0]] : []) : option.value === 'weekly_on_days' || option.value === 'every_n_weeks' ? f.weekdays : [],
                      }))}
                    >
                      <span className={`recurrence-radio${isActive ? ' recurrence-radio-active' : ''}`} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{option.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-3)', marginTop: 2 }}>{option.description}</div>
                      </div>
                    </button>

                    {/* Sub-controls */}
                    {isActive && needsWeekdayPicker && (
                      <div style={{ marginTop: 12 }}>
                        {needsIntervalStepper && (
                          <div style={{ marginBottom: 12 }}>
                            <WeekIntervalStepper
                              value={form.intervalWeeks}
                              onChange={(v) => setForm((f) => ({ ...f, intervalWeeks: v }))}
                            />
                          </div>
                        )}
                        <WeekdayPicker
                          selected={form.weekdays}
                          onChange={(days) => setForm((f) => ({ ...f, weekdays: days }))}
                          mode={weekdayPickerMode}
                        />
                      </div>
                    )}

                    {isActive && needsIntervalDays && (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
                          Every how many days?
                        </label>
                        <input
                          type="number"
                          className="rem-form-input"
                          min={1}
                          value={form.intervalDays}
                          onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
                        />
                      </div>
                    )}

                    {isActive && option.value === 'ad_hoc' && (
                      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 300, fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
                        For recurring household tasks that don't have a fixed schedule. You'll see when it was last done.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {needsFirstDueDate && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
                First due date
              </label>
              <input
                type="date"
                className="rem-form-input"
                value={form.firstDueDate}
                onChange={(e) => setForm((f) => ({ ...f, firstDueDate: e.target.value }))}
              />
            </div>
          )}

          {formError && (
            <div style={{ fontSize: 13, color: 'var(--rose)' }}>{formError}</div>
          )}

          <button
            type="button"
            className="rem-btn rem-btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            onClick={() => void handleCreateSubmit()}
          >
            Create Routine
          </button>
        </div>
      </BottomSheet>

      <BottomNav activeTab="daily" />
    </div>
  );
}
