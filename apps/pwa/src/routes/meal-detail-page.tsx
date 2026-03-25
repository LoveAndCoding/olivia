import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealEntry } from '@olivia/contracts';
import { formatWeekRange } from '@olivia/domain';
import { useAuth } from '../lib/auth';
import {
  loadMealPlanDetail,
  archiveMealPlanCommand,
  deleteMealPlanCommand,
  updateMealPlanTitleCommand,
  addMealEntryCommand,
  updateMealEntryItemsCommand,
  deleteMealEntryCommand,
  generateGroceryListCommand,
} from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { MealEntryCard } from '../components/meals/MealEntryCard';
import { EditPlanTitleSheet } from '../components/meals/EditPlanTitleSheet';
import { ArchivePlanSheet } from '../components/meals/ArchivePlanSheet';
import { DeletePlanSheet } from '../components/meals/DeletePlanSheet';
import { DeleteMealSheet } from '../components/meals/DeleteMealSheet';
import { OverflowMenuSheet } from '../components/lists/OverflowMenuSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { showErrorToast } from '../lib/error-toast';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function MealDetailPage() {
  const params = useParams({ from: '/meals/$planId' });
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isOffline = !window.navigator.onLine;

  const [showEditTitleSheet, setShowEditTitleSheet] = useState(false);
  const [showArchiveSheet, setShowArchiveSheet] = useState(false);
  const [showDeletePlanSheet, setShowDeletePlanSheet] = useState(false);
  const [showListOverflow, setShowListOverflow] = useState(false);
  const [deleteMealTarget, setDeleteMealTarget] = useState<MealEntry | null>(null);
  const [newMealDay, setNewMealDay] = useState<number | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['meal-plan-detail', currentUser?.id, params.planId],
    queryFn: () => loadMealPlanDetail(params.planId),
  });

  const plan = detailQuery.data?.plan;
  const entries: MealEntry[] = detailQuery.data?.entries ?? [];
  const isArchived = plan?.status === 'archived';
  const readOnly = isArchived;

  const hasShoppingItems = entries.some((e) => e.shoppingItems.length > 0);

  const showBanner = useCallback((message: string, variant: 'mint' | 'sky') => {
    setBanner({ message, variant });
    setTimeout(() => setBanner(null), 5000);
  }, []);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['meal-plan-detail', currentUser?.id, params.planId] });
    await queryClient.invalidateQueries({ queryKey: ['meal-plans-active', currentUser?.id] });
    await queryClient.invalidateQueries({ queryKey: ['meal-plans-archived', currentUser?.id] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
  }, [queryClient, currentUser?.id, params.planId]);

  const handleEditTitle = useCallback(async (newTitle: string) => {
    if (!plan) return;
    setShowEditTitleSheet(false);
    setBusy(true);
    try {
      await updateMealPlanTitleCommand(plan.id, plan.version, newTitle);
      await invalidate();
      showBanner('Renamed', 'mint');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not rename meal plan');
    } finally {
      setBusy(false);
    }
  }, [plan, currentUser?.id, invalidate, showBanner]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!plan) return;
    setShowArchiveSheet(false);
    setBusy(true);
    try {
      await archiveMealPlanCommand(plan.id, plan.version);
      await invalidate();
      showBanner('Archived', 'sky');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not archive meal plan');
    } finally {
      setBusy(false);
    }
  }, [plan, currentUser?.id, invalidate, showBanner]);

  const handleDeletePlanConfirm = useCallback(async () => {
    if (!plan) return;
    setShowDeletePlanSheet(false);
    setBusy(true);
    try {
      await deleteMealPlanCommand(plan.id);
      await invalidate();
      void navigate({ to: '/meals' });
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not delete meal plan');
    } finally {
      setBusy(false);
    }
  }, [plan, currentUser?.id, invalidate, navigate]);

  const handleAddMeal = useCallback(async (dayOfWeek: number) => {
    if (!plan || !newMealName.trim()) return;
    setBusy(true);
    try {
      await addMealEntryCommand(plan.id, dayOfWeek, newMealName.trim());
      await invalidate();
      setNewMealDay(null);
      setNewMealName('');
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not add meal');
    } finally {
      setBusy(false);
    }
  }, [plan, currentUser?.id, newMealName, invalidate]);

  const handleUpdateItems = useCallback(async (entry: MealEntry, items: string[]) => {
    if (!plan) return;
    setBusy(true);
    try {
      await updateMealEntryItemsCommand(plan.id, entry.id, entry.version, items);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not update meal items');
    } finally {
      setBusy(false);
    }
  }, [plan, currentUser?.id, invalidate]);

  const handleDeleteMealConfirm = useCallback(async () => {
    if (!plan || !deleteMealTarget) return;
    setDeleteMealTarget(null);
    setBusy(true);
    try {
      await deleteMealEntryCommand(plan.id, deleteMealTarget.id);
      await invalidate();
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not delete meal');
    } finally {
      setBusy(false);
    }
  }, [plan, deleteMealTarget, currentUser?.id, invalidate]);

  const handleGenerateGroceryList = useCallback(async () => {
    if (!plan) return;
    setGenerating(true);
    try {
      const result = await generateGroceryListCommand(plan.id);
      await invalidate();
      void navigate({ to: '/lists/$listId', params: { listId: result.list.id } });
    } catch (err) {
      showErrorToast((err as Error).message || 'Could not generate grocery list');
    } finally {
      setGenerating(false);
    }
  }, [plan, currentUser?.id, invalidate, navigate]);

  const listOverflowActions = useMemo(() => {
    if (!plan) return [];
    const actions = [];
    if (!isArchived) {
      actions.push({ label: 'Rename', onClick: () => setShowEditTitleSheet(true) });
      actions.push({ label: 'Archive', onClick: () => setShowArchiveSheet(true) });
    }
    actions.push({ label: 'Delete', danger: true, onClick: () => setShowDeletePlanSheet(true) });
    return actions;
  }, [plan, isArchived]);

  const entriesByDay = useMemo(() => {
    const byDay: Record<number, MealEntry[]> = {};
    for (let i = 0; i <= 6; i++) {
      byDay[i] = [];
    }
    for (const entry of entries) {
      byDay[entry.dayOfWeek].push(entry);
    }
    return byDay;
  }, [entries]);

  const weekRange = plan ? formatWeekRange(plan.weekStartDate) : '';

  const canGenerate = !readOnly && hasShoppingItems && !isOffline;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="screen-scroll" style={{ flex: 1, paddingBottom: canGenerate ? 80 : 0 }}>
        <div style={{ padding: '22px 16px 0' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/meals' })}
          >
            ← Meals
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="screen-title" style={{ marginBottom: 4 }}>
                {plan?.title ?? '…'}
              </div>
              <div className="screen-sub" style={{ marginBottom: 16 }}>{weekRange}</div>
            </div>
            <button
              type="button"
              className="list-card-overflow"
              aria-label="Plan options"
              style={{ marginTop: 4 }}
              onClick={() => setShowListOverflow(true)}
            >
              ···
            </button>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          {isArchived && (
            <div className="list-offline-banner" style={{ marginBottom: 16 }}>
              This plan is archived. Restore it to make changes.
            </div>
          )}

          {isOffline && (
            <div className="list-offline-banner">
              Offline — your changes will sync when you reconnect.
            </div>
          )}

          {detailQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading plan…
            </div>
          )}

          {detailQuery.isError && !detailQuery.isLoading && (
            <div style={{ padding: '16px 6px', color: 'var(--rose)', fontSize: 13 }}>
              {(detailQuery.error as Error).message}
            </div>
          )}

          {!detailQuery.isLoading && plan && (
            <div>
              {DAY_NAMES.map((dayName, dayIndex) => {
                const dayEntries = entriesByDay[dayIndex] ?? [];
                const isAddingThisDay = newMealDay === dayIndex;
                return (
                  <div key={dayIndex} style={{ marginBottom: 20 }}>
                    <div className="rem-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{dayName}</span>
                      {!readOnly && !isAddingThisDay && (
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                          onClick={() => { setNewMealDay(dayIndex); setNewMealName(''); }}
                          aria-label={`Add meal on ${dayName}`}
                        >
                          +
                        </button>
                      )}
                    </div>

                    {dayEntries.map((entry) => (
                      <MealEntryCard
                        key={entry.id}
                        entry={entry}
                        onUpdateItems={(items) => void handleUpdateItems(entry, items)}
                        onDelete={() => setDeleteMealTarget(entry)}
                        isSpouse={false}
                        isArchived={isArchived}
                      />
                    ))}

                    {isAddingThisDay && (
                      <div className="list-card" style={{ marginBottom: 8 }}>
                        <input
                          type="text"
                          className="rem-form-input"
                          placeholder="Meal name…"
                          value={newMealName}
                          onChange={(e) => setNewMealName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleAddMeal(dayIndex);
                            if (e.key === 'Escape') { setNewMealDay(null); setNewMealName(''); }
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            className="rem-btn rem-btn-primary"
                            disabled={!newMealName.trim() || busy}
                            onClick={() => void handleAddMeal(dayIndex)}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            className="rem-btn"
                            onClick={() => { setNewMealDay(null); setNewMealName(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {dayEntries.length === 0 && !isAddingThisDay && (
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '4px 0' }}>No meals</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {!readOnly && (
        <div style={{
          position: 'fixed', bottom: 56, left: 0, right: 0,
          padding: '12px 16px',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          zIndex: 10
        }}>
          <button
            type="button"
            className="rem-btn rem-btn-primary"
            style={{ width: '100%' }}
            disabled={!canGenerate || generating}
            onClick={() => void handleGenerateGroceryList()}
          >
            {generating ? 'Generating…' : 'Generate Grocery List'}
          </button>
          {!hasShoppingItems && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 4 }}>
              Add shopping items to meals to enable this.
            </div>
          )}
          {isOffline && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 4 }}>
              Requires a connection.
            </div>
          )}
        </div>
      )}

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      {plan && (
        <>
          <EditPlanTitleSheet
            open={showEditTitleSheet}
            onClose={() => setShowEditTitleSheet(false)}
            currentTitle={plan.title}
            onSave={(t) => void handleEditTitle(t)}
          />
          <ArchivePlanSheet
            open={showArchiveSheet}
            onClose={() => setShowArchiveSheet(false)}
            onConfirm={() => void handleArchiveConfirm()}
          />
          <DeletePlanSheet
            open={showDeletePlanSheet}
            onClose={() => setShowDeletePlanSheet(false)}
            planTitle={plan.title}
            onConfirm={() => void handleDeletePlanConfirm()}
          />
          <OverflowMenuSheet
            open={showListOverflow}
            onClose={() => setShowListOverflow(false)}
            actions={listOverflowActions}
          />
        </>
      )}

      {deleteMealTarget && (
        <DeleteMealSheet
          open={!!deleteMealTarget}
          onClose={() => setDeleteMealTarget(null)}
          mealName={deleteMealTarget.name}
          onConfirm={() => void handleDeleteMealConfirm()}
        />
      )}

      <BottomNav activeTab="daily" />
    </div>
  );
}
