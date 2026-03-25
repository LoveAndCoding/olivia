import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealPlan } from '@olivia/contracts';
import { useAuth } from '../lib/auth';
import { ForkKnife, Plus } from '@phosphor-icons/react';
import {
  loadActiveMealPlanIndex,
  loadArchivedMealPlanIndex,
  createMealPlanCommand,
  archiveMealPlanCommand,
  restoreMealPlanCommand,
  deleteMealPlanCommand,
  updateMealPlanTitleCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { MealPlanCard } from '../components/meals/MealPlanCard';
import { CreatePlanSheet } from '../components/meals/CreatePlanSheet';
import { EditPlanTitleSheet } from '../components/meals/EditPlanTitleSheet';
import { ArchivePlanSheet } from '../components/meals/ArchivePlanSheet';
import { DeletePlanSheet } from '../components/meals/DeletePlanSheet';
import { OverflowMenuSheet } from '../components/lists/OverflowMenuSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { showErrorToast } from '../lib/error-toast';

type MealFilter = 'active' | 'archived';

export function MealsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<MealFilter>('active');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [overflowTarget, setOverflowTarget] = useState<MealPlan | null>(null);
  const [editTitleTarget, setEditTitleTarget] = useState<MealPlan | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<MealPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealPlan | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeQuery = useQuery({
    queryKey: ['meal-plans-active', currentUser?.id],
    queryFn: () => loadActiveMealPlanIndex(),
    enabled: filter === 'active',
  });

  const archivedQuery = useQuery({
    queryKey: ['meal-plans-archived', currentUser?.id],
    queryFn: () => loadArchivedMealPlanIndex(),
    enabled: filter === 'archived',
  });

  const currentQuery = filter === 'active' ? activeQuery : archivedQuery;
  const plans: MealPlan[] = (filter === 'active'
    ? activeQuery.data?.plans
    : archivedQuery.data?.plans) ?? [];

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['meal-plans-active', currentUser?.id] });
    await queryClient.invalidateQueries({ queryKey: ['meal-plans-archived', currentUser?.id] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient, currentUser?.id]);

  const handleCreate = useCallback(async (title: string, weekStartDate: string) => {
    setShowCreateSheet(false);
    setBusy(true);
    try {
      const plan = await createMealPlanCommand(title, weekStartDate);
      await invalidate();
      showBanner('Plan created', 'mint');
      void navigate({ to: '/meals/$planId', params: { planId: plan.id } });
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not create meal plan');
    } finally {
      setBusy(false);
    }
  }, [currentUser?.id, invalidate, showBanner, navigate]);

  const handleEditTitle = useCallback(async (newTitle: string) => {
    if (!editTitleTarget) return;
    setEditTitleTarget(null);
    setBusy(true);
    try {
      await updateMealPlanTitleCommand(editTitleTarget.id, editTitleTarget.version, newTitle);
      await invalidate();
      showBanner('Renamed', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not rename meal plan');
    } finally {
      setBusy(false);
    }
  }, [editTitleTarget, currentUser?.id, invalidate, showBanner]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    setArchiveTarget(null);
    setBusy(true);
    try {
      await archiveMealPlanCommand(archiveTarget.id, archiveTarget.version);
      await invalidate();
      showBanner('Archived', 'sky');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not archive meal plan');
    } finally {
      setBusy(false);
    }
  }, [archiveTarget, currentUser?.id, invalidate, showBanner]);

  const handleRestoreConfirm = useCallback(async (plan: MealPlan) => {
    setBusy(true);
    try {
      await restoreMealPlanCommand(plan.id, plan.version);
      await invalidate();
      showBanner('Restored', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not restore meal plan');
    } finally {
      setBusy(false);
    }
  }, [currentUser?.id, invalidate, showBanner]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteTarget(null);
    setBusy(true);
    try {
      await deleteMealPlanCommand(deleteTarget.id);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not delete meal plan');
    } finally {
      setBusy(false);
    }
  }, [deleteTarget, currentUser?.id, invalidate]);

  const getOverflowActions = useCallback((plan: MealPlan) => {
    if (filter === 'archived') {
      return [
        { label: 'Restore', onClick: () => { setOverflowTarget(null); void handleRestoreConfirm(plan); } },
        { label: 'Delete', danger: true, onClick: () => { setOverflowTarget(null); setDeleteTarget(plan); } }
      ];
    }
    return [
      { label: 'Rename', onClick: () => { setOverflowTarget(null); setEditTitleTarget(plan); } },
      { label: 'Archive', onClick: () => { setOverflowTarget(null); setArchiveTarget(plan); } },
      { label: 'Delete', danger: true, onClick: () => { setOverflowTarget(null); setDeleteTarget(plan); } }
    ];
  }, [filter, handleRestoreConfirm]);

  const isLoading = currentQuery.isLoading;
  const isError = currentQuery.isError;
  const isEmpty = !isLoading && !isError && plans.length === 0;

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px 0' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/daily', search: { segment: 'meals' } })}
          >
            ← Daily
          </button>

          <div className="screen-title">Meal Plans</div>
          <div className="screen-sub" style={{ marginBottom: 16 }}>
            {filter === 'active'
              ? (activeQuery.data ? `${activeQuery.data.plans.length} plan${activeQuery.data.plans.length !== 1 ? 's' : ''}` : 'Weekly meal planning')
              : 'Archived'
            }
          </div>

          <div className="rem-filters">
            <button
              type="button"
              className={`ftab${filter === 'active' ? ' active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`ftab${filter === 'archived' ? ' active' : ''}`}
              onClick={() => setFilter('archived')}
            >
              Archived
            </button>
          </div>

          {filter === 'active' && (
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="add-rem-btn"
                onClick={() => setShowCreateSheet(true)}
                style={{ width: '100%' }}
                disabled={busy}
              >
                <span className="add-icon"><Plus size={20} /></span>
                <span className="add-label">New meal plan…</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '0 16px' }}>
          {isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading meal plans…
            </div>
          )}

          {isError && !isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              {(currentQuery.error as Error).message}
            </div>
          )}

          {isEmpty && filter === 'active' && (
            <div className="rem-empty">
              <div className="rem-empty-icon"><ForkKnife size={48} weight="bold" /></div>
              <div className="rem-empty-title">No meal plans yet</div>
              <div className="rem-empty-sub">Plan your meals for the week and generate grocery lists automatically.</div>
              <div style={{ marginTop: 16, width: '100%' }}>
                <button
                  type="button"
                  className="add-rem-btn add-rem-btn-prominent"
                  onClick={() => setShowCreateSheet(true)}
                  style={{ width: '100%' }}
                >
                  <span className="add-icon"><Plus size={20} /></span>
                  <span className="add-label">New meal plan…</span>
                </button>
              </div>
            </div>
          )}

          {isEmpty && filter === 'archived' && (
            <div className="rem-empty">
              <div className="rem-empty-sub">No archived meal plans.</div>
            </div>
          )}

          {!isEmpty && (
            <div className="rem-list">
              {plans.map((plan) => (
                <MealPlanCard
                  key={plan.id}
                  plan={plan}
                  onClick={() => void navigate({ to: '/meals/$planId', params: { planId: plan.id } })}
                  onOverflow={(e) => { e.stopPropagation(); setOverflowTarget(plan); }}
                  showOverflow
                />
              ))}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      <CreatePlanSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onCreate={(t, w) => void handleCreate(t, w)}
      />

      {editTitleTarget && (
        <EditPlanTitleSheet
          open={!!editTitleTarget}
          onClose={() => setEditTitleTarget(null)}
          currentTitle={editTitleTarget.title}
          onSave={(t) => void handleEditTitle(t)}
        />
      )}

      {archiveTarget && (
        <ArchivePlanSheet
          open={!!archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => void handleArchiveConfirm()}
        />
      )}

      {deleteTarget && (
        <DeletePlanSheet
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          planTitle={deleteTarget.title}
          onConfirm={() => void handleDeleteConfirm()}
        />
      )}

      {overflowTarget && (
        <OverflowMenuSheet
          open={!!overflowTarget}
          onClose={() => setOverflowTarget(null)}
          actions={getOverflowActions(overflowTarget)}
        />
      )}

      <BottomNav activeTab="daily" />
    </div>
  );
}
