import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow } from 'date-fns';
import type { Owner, Routine, RoutineDueState, RoutineRecurrenceRule } from '@olivia/contracts';
import { computeRoutineDueState as computeDueState } from '@olivia/domain';
import { useRole } from '../lib/role';
import {
  loadActiveRoutineIndex,
  loadArchivedRoutineIndex,
  completeRoutineOccurrenceCommand,
  createRoutineCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { BottomSheet } from '../components/reminders/BottomSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';

type FilterTab = 'active' | 'archived';

function formatRecurrenceLabel(rule: RoutineRecurrenceRule, intervalDays?: number | null): string {
  switch (rule) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'every_n_days': return `Every ${intervalDays ?? '?'} days`;
  }
}

function formatDueDate(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function dueStateBadge(state: RoutineDueState): { label: string; className: string } {
  switch (state) {
    case 'overdue': return { label: 'Overdue', className: 'rem-badge rem-badge-rose' };
    case 'due': return { label: 'Due today', className: 'rem-badge rem-badge-peach' };
    case 'upcoming': return { label: 'Upcoming', className: 'rem-badge rem-badge-neutral' };
    case 'completed': return { label: 'Done', className: 'rem-badge rem-badge-mint' };
    case 'paused': return { label: 'Paused', className: 'rem-badge rem-badge-sky' };
  }
}

type RoutineCardProps = {
  routine: Routine;
  dueState: RoutineDueState;
  onComplete: () => void;
  onNavigate: () => void;
  isSpouse: boolean;
  busy: boolean;
};

function RoutineCard({ routine, dueState, onComplete, onNavigate, isSpouse, busy }: RoutineCardProps) {
  const badge = dueStateBadge(dueState);
  const canComplete = !isSpouse && (dueState === 'due' || dueState === 'overdue');
  const isOverdue = dueState === 'overdue';

  return (
    <div
      className="list-card"
      style={{
        cursor: 'pointer',
        borderLeft: isOverdue ? '3px solid var(--rose)' : undefined,
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
            {formatDueDate(routine.currentDueDate)} · {formatRecurrenceLabel(routine.recurrenceRule, routine.intervalDays)}
          </div>
        </div>
        <span className={badge.className}>{badge.label}</span>
      </div>
    </div>
  );
}

const RECURRENCE_OPTIONS: { value: RoutineRecurrenceRule; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'every_n_days', label: 'Every N days' },
];

const OWNER_OPTIONS: { value: Owner; label: string }[] = [
  { value: 'stakeholder', label: 'Me (Lexi)' },
  { value: 'spouse', label: 'Spouse (Christian)' },
  { value: 'unassigned', label: 'Unassigned' },
];

type CreateRoutineFormState = {
  title: string;
  owner: Owner;
  recurrenceRule: RoutineRecurrenceRule | '';
  intervalDays: string;
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

  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateRoutineFormState>({
    title: '',
    owner: 'stakeholder',
    recurrenceRule: '',
    intervalDays: '7',
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

  const getRoutineDueState = useCallback((routine: Routine): RoutineDueState => {
    return routine.dueState ?? computeDueState(routine, null);
  }, []);

  const groupedRoutines = useMemo(() => {
    if (activeTab !== 'active' || !activeQuery.data) return null;
    const routines = activeQuery.data.routines;
    const groups: Record<RoutineDueState, Routine[]> = {
      overdue: [], due: [], upcoming: [], completed: [], paused: []
    };
    for (const routine of routines) {
      const state = getRoutineDueState(routine);
      groups[state].push(routine);
    }
    return groups;
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
      showBanner('✓ Marked complete', 'mint');
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
    setFormError(null);
    setShowCreateSheet(false);

    const firstDueDateIso = new Date(form.firstDueDate + 'T12:00:00').toISOString();
    const intervalDays = form.recurrenceRule === 'every_n_days' ? parseInt(form.intervalDays, 10) : null;

    await createRoutineCommand(role, form.title.trim(), form.owner, form.recurrenceRule, firstDueDateIso, intervalDays);
    await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
    setForm({ title: '', owner: 'stakeholder', recurrenceRule: '', intervalDays: '7', firstDueDate: todayIso() });
    showBanner('✓ Routine created', 'mint');
  }, [form, role, queryClient, showBanner]);

  const isSpouse = role === 'spouse';
  const isLoading = currentQuery.isLoading;
  const isError = currentQuery.isError;

  const GROUP_ORDER: RoutineDueState[] = ['overdue', 'due', 'upcoming', 'completed', 'paused'];
  const GROUP_LABELS: Record<RoutineDueState, string> = {
    overdue: 'Overdue', due: 'Due today', upcoming: 'Upcoming', completed: 'Recently completed', paused: 'Paused'
  };

  const isEmpty = !isLoading && !isError && (
    activeTab === 'active'
      ? (activeQuery.data?.routines.length === 0)
      : (archivedQuery.data?.routines.length === 0)
  );

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

          <div className="screen-title">Routines</div>
          <div className="screen-sub" style={{ marginBottom: 16 }}>
            {activeTab === 'active'
              ? (activeQuery.data ? `${activeQuery.data.routines.length} routines` : 'Recurring routines')
              : 'Archived'
            }
          </div>

          {isSpouse && (
            <div className="list-spouse-banner" role="status" style={{ marginBottom: 16 }}>
              Viewing as household member — Lexi manages these routines.
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

          {!isSpouse && activeTab === 'active' && (
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="add-rem-btn"
                onClick={() => setShowCreateSheet(true)}
                style={{ width: '100%' }}
              >
                <span className="add-icon">＋</span>
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
              <div className="rem-empty-icon">🔁</div>
              <div className="rem-empty-title">No routines yet</div>
              <div className="rem-empty-sub">Add a recurring routine to track household tasks on a regular schedule.</div>
              {!isSpouse && (
                <div style={{ marginTop: 16, width: '100%' }}>
                  <button
                    type="button"
                    className="add-rem-btn add-rem-btn-prominent"
                    onClick={() => setShowCreateSheet(true)}
                    style={{ width: '100%' }}
                  >
                    <span className="add-icon">＋</span>
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
          {!isEmpty && activeTab === 'active' && groupedRoutines && (
            <div className="rem-list">
              {GROUP_ORDER.map((state) => {
                const items = groupedRoutines[state];
                if (items.length === 0) return null;
                return (
                  <div key={state}>
                    <div className="rem-group-header">{GROUP_LABELS[state]}</div>
                    {items.map((routine) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        dueState={state}
                        onComplete={() => void handleComplete(routine)}
                        onNavigate={() => void navigate({ to: '/routines/$routineId', params: { routineId: routine.id } })}
                        isSpouse={isSpouse}
                        busy={busyId === routine.id}
                      />
                    ))}
                  </div>
                );
              })}
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
              Owner
            </label>
            <select
              className="rem-form-input"
              value={form.owner}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value as Owner }))}
            >
              {OWNER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
              Recurrence
            </label>
            <select
              className="rem-form-input"
              value={form.recurrenceRule}
              onChange={(e) => setForm((f) => ({ ...f, recurrenceRule: e.target.value as RoutineRecurrenceRule | '' }))}
            >
              <option value="">Select recurrence…</option>
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {form.recurrenceRule === 'every_n_days' && (
            <div>
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

      <BottomNav activeTab="home" />
    </div>
  );
}
