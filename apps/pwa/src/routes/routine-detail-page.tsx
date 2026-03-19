import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { RoutineDueState, RoutineRecurrenceRule } from '@olivia/contracts';
import { computeRoutineDueState as computeDueState } from '@olivia/domain';
import { Check } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import {
  loadRoutineDetail,
  completeRoutineOccurrenceCommand,
  pauseRoutineCommand,
  resumeRoutineCommand,
  archiveRoutineCommand,
  restoreRoutineCommand,
  deleteRoutineCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { BottomSheet } from '../components/reminders/BottomSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';

function formatRecurrenceLabel(rule: RoutineRecurrenceRule, intervalDays?: number | null): string {
  switch (rule) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'every_n_days': return `Every ${intervalDays ?? '?'} days`;
  }
}

function formatOwnerLabel(owner: string): string {
  switch (owner) {
    case 'stakeholder': return 'Lexi';
    case 'spouse': return 'Christian';
    default: return 'Unassigned';
  }
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

export function RoutineDetailPage() {
  const params = useParams({ from: '/routines/$routineId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();

  const [showPauseSheet, setShowPauseSheet] = useState(false);
  const [showArchiveSheet, setShowArchiveSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busy, setBusy] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['routine-detail', role, params.routineId],
    queryFn: () => loadRoutineDetail(role, params.routineId),
  });

  const routine = detailQuery.data?.routine;
  const occurrences = detailQuery.data?.occurrences ?? [];

  const dueState = useMemo<RoutineDueState | null>(() => {
    if (!routine) return null;
    return routine.dueState ?? computeDueState(routine, null);
  }, [routine]);

  const invalidateAndRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['routine-detail', role, params.routineId] });
    await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient, role, params.routineId]);

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!routine || busy) return;
    setBusy(true);
    try {
      await completeRoutineOccurrenceCommand(role, routine.id, routine.version);
      await invalidateAndRefresh();
      showBanner('Marked complete', 'mint');
    } finally {
      setBusy(false);
    }
  }, [routine, role, busy, invalidateAndRefresh, showBanner]);

  const handlePause = useCallback(async () => {
    if (!routine || busy) return;
    setShowPauseSheet(false);
    setBusy(true);
    try {
      await pauseRoutineCommand(role, routine.id, routine.version);
      await invalidateAndRefresh();
      showBanner('Routine paused', 'sky');
    } finally {
      setBusy(false);
    }
  }, [routine, role, busy, invalidateAndRefresh, showBanner]);

  const handleResume = useCallback(async () => {
    if (!routine || busy) return;
    setBusy(true);
    try {
      await resumeRoutineCommand(role, routine.id, routine.version);
      await invalidateAndRefresh();
      showBanner('Routine resumed', 'mint');
    } finally {
      setBusy(false);
    }
  }, [routine, role, busy, invalidateAndRefresh, showBanner]);

  const handleArchive = useCallback(async () => {
    if (!routine || busy) return;
    setShowArchiveSheet(false);
    setBusy(true);
    try {
      await archiveRoutineCommand(role, routine.id, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
      await queryClient.invalidateQueries({ queryKey: ['routine-index-archived', role] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      showBanner('Routine archived', 'sky');
      void navigate({ to: '/routines' });
    } finally {
      setBusy(false);
    }
  }, [routine, role, busy, queryClient, navigate, showBanner]);

  const handleRestore = useCallback(async () => {
    if (!routine || busy) return;
    setBusy(true);
    try {
      await restoreRoutineCommand(role, routine.id, routine.version);
      await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
      await queryClient.invalidateQueries({ queryKey: ['routine-index-archived', role] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      showBanner('Routine restored', 'mint');
      void navigate({ to: '/routines' });
    } finally {
      setBusy(false);
    }
  }, [routine, role, busy, queryClient, navigate, showBanner]);

  const handleDelete = useCallback(async () => {
    if (!routine || busy) return;
    setShowDeleteSheet(false);
    setBusy(true);
    try {
      await deleteRoutineCommand(role, routine.id);
      await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
      await queryClient.invalidateQueries({ queryKey: ['routine-index-archived', role] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      void navigate({ to: '/routines' });
    } finally {
      setBusy(false);
    }
  }, [routine, role, busy, queryClient, navigate]);

  const isSpouse = role === 'spouse';
  const isPaused = routine?.status === 'paused';
  const isArchived = routine?.status === 'archived';
  const canComplete = !isSpouse && dueState && (dueState === 'due' || dueState === 'overdue');

  const recentOccurrences = occurrences.slice(0, 30);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/routines' })}
          >
            ← Routines
          </button>

          {detailQuery.isLoading && (
            <div className="card"><p className="muted">Loading routine…</p></div>
          )}
          {detailQuery.isError && (
            <div className="card error-card">
              <p>{(detailQuery.error as Error)?.message ?? 'Routine not found.'}</p>
            </div>
          )}

          {routine && dueState && (
            <>
              <div className="rem-detail-label">Routine</div>
              <div className="rem-detail-title">{routine.title}</div>

              {isSpouse && (
                <div className="rem-status-banner rem-status-banner-sky" style={{ marginBottom: 16 }}>
                  👁 View only — actions are available to Lexi
                </div>
              )}

              {routine.pendingSync && (
                <div className="rem-status-banner rem-status-banner-sky" style={{ marginBottom: 16 }}>
                  ⏳ Pending sync
                </div>
              )}

              <div className="rem-detail-card">
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Status</span>
                  <span className={dueStateBadge(dueState).className}>{dueStateBadge(dueState).label}</span>
                </div>
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Next due</span>
                  <span
                    className="rem-detail-field-value"
                    style={dueState === 'overdue' ? { color: 'var(--rose)' } : undefined}
                  >
                    {format(new Date(routine.currentDueDate), 'EEEE, MMM d')}
                  </span>
                </div>
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Recurrence</span>
                  <span className="rem-detail-field-value">
                    <span className="rem-badge rem-badge-lavender">
                      {formatRecurrenceLabel(routine.recurrenceRule, routine.intervalDays)}
                    </span>
                  </span>
                </div>
                <div className="rem-detail-field">
                  <span className="rem-detail-field-label">Owner</span>
                  <span className="rem-detail-field-value">{formatOwnerLabel(routine.owner)}</span>
                </div>
              </div>

              {/* Actions */}
              {!isSpouse && !isArchived && (
                <div style={{ marginBottom: 20 }}>
                  {canComplete && (
                    <div className="rem-actions-row" style={{ marginBottom: 10 }}>
                      <button
                        type="button"
                        className="rem-btn rem-btn-done"
                        style={{ flex: 1 }}
                        disabled={busy}
                        onClick={() => void handleComplete()}
                      >
                        <Check size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Mark complete
                      </button>
                    </div>
                  )}

                  {dueState === 'completed' && (
                    <div className="rem-status-banner rem-status-banner-mint" style={{ marginBottom: 16 }}>
                      <Check size={16} style={{ marginRight: 4, verticalAlign: -2 }} /> Completed this cycle — next due {format(new Date(routine.currentDueDate), 'MMM d')}
                    </div>
                  )}

                  <div className="rem-actions-row">
                    {!isPaused ? (
                      <button
                        type="button"
                        className="rem-btn rem-btn-ghost"
                        disabled={busy}
                        onClick={() => setShowPauseSheet(true)}
                      >
                        ⏸ Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rem-btn rem-btn-secondary"
                        disabled={busy}
                        onClick={() => void handleResume()}
                      >
                        ▶ Resume
                      </button>
                    )}
                    <button
                      type="button"
                      className="rem-btn rem-btn-ghost"
                      disabled={busy}
                      onClick={() => setShowArchiveSheet(true)}
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      className="rem-btn rem-btn-danger-text"
                      disabled={busy}
                      onClick={() => setShowDeleteSheet(true)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {!isSpouse && isArchived && (
                <div style={{ marginBottom: 20 }}>
                  <div className="rem-status-banner rem-status-banner-sky" style={{ marginBottom: 12 }}>
                    Archived — {routine.archivedAt ? format(new Date(routine.archivedAt), 'MMM d, yyyy') : ''}
                  </div>
                  <div className="rem-actions-row">
                    <button
                      type="button"
                      className="rem-btn rem-btn-secondary"
                      disabled={busy}
                      onClick={() => void handleRestore()}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="rem-btn rem-btn-danger-text"
                      disabled={busy}
                      onClick={() => setShowDeleteSheet(true)}
                    >
                      Delete permanently
                    </button>
                  </div>
                </div>
              )}

              {/* Completion history */}
              {recentOccurrences.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="rem-group-header" style={{ marginTop: 0 }}>Completion history</div>
                  <div className="rem-timeline">
                    {recentOccurrences.map((occ, idx) => (
                      <div key={occ.id} className="rem-timeline-item">
                        <div className={`rem-timeline-dot${idx === 0 ? ' active' : ''}`} />
                        <div className="rem-timeline-text">
                          {occ.completedAt ? (
                            <>
                              <strong>Completed</strong>
                              {' · '}
                              {format(new Date(occ.completedAt), 'MMM d')}
                              {occ.completedBy && occ.completedBy !== 'unassigned' && ` · by ${formatOwnerLabel(occ.completedBy)}`}
                              <span style={{ color: 'var(--ink-4)', marginLeft: 4, fontSize: 11 }}>
                                (cycle: {format(new Date(occ.dueDate), 'MMM d')})
                              </span>
                            </>
                          ) : (
                            <>
                              <strong style={{ color: 'var(--ink-3)' }}>Missed</strong>
                              {' · '}
                              <span style={{ color: 'var(--ink-3)' }}>
                                {format(new Date(occ.dueDate), 'MMM d')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentOccurrences.length === 0 && !isArchived && (
                <div style={{ padding: '12px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
                  No completions recorded yet.
                </div>
              )}

              <div style={{ height: 24 }} />
            </>
          )}
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      {/* Pause confirmation */}
      <BottomSheet
        open={showPauseSheet}
        onClose={() => setShowPauseSheet(false)}
        title="Pause routine?"
      >
        <div style={{ padding: '0 0 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
            Pause this routine? It will stop appearing as due until you resume it.
          </p>
          <div className="rem-actions-row">
            <button
              type="button"
              className="rem-btn rem-btn-primary"
              style={{ flex: 1 }}
              onClick={() => void handlePause()}
            >
              Pause
            </button>
            <button
              type="button"
              className="rem-btn rem-btn-ghost"
              onClick={() => setShowPauseSheet(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Archive confirmation */}
      <BottomSheet
        open={showArchiveSheet}
        onClose={() => setShowArchiveSheet(false)}
        title="Archive routine?"
      >
        <div style={{ padding: '0 0 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
            Archive this routine? It will be hidden but not deleted, and its history will be preserved.
          </p>
          <div className="rem-actions-row">
            <button
              type="button"
              className="rem-btn rem-btn-primary"
              style={{ flex: 1 }}
              onClick={() => void handleArchive()}
            >
              Archive
            </button>
            <button
              type="button"
              className="rem-btn rem-btn-ghost"
              onClick={() => setShowArchiveSheet(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete confirmation */}
      <BottomSheet
        open={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        title="Delete routine?"
      >
        <div style={{ padding: '0 0 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 8 }}>
            <strong>Permanently delete {routine?.title ?? 'this routine'}?</strong>
          </p>
          <p style={{ fontSize: 13, color: 'var(--rose)', marginBottom: 20 }}>
            This will remove the routine and all its completion history. This cannot be undone.
          </p>
          <div className="rem-actions-row">
            <button
              type="button"
              className="rem-btn rem-btn-danger"
              style={{ flex: 1 }}
              onClick={() => void handleDelete()}
            >
              Delete permanently
            </button>
            <button
              type="button"
              className="rem-btn rem-btn-ghost"
              onClick={() => setShowDeleteSheet(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomNav activeTab="home" />
    </div>
  );
}
