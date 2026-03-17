import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import {
  fetchStaleItems,
  confirmFreshness,
  archiveFreshnessEntity,
  completeHealthCheck,
  type StaleItem
} from '../lib/api';
import { saveHealthCheckProgress, saveHealthCheckTotalItems, getHealthCheckProgress, clearHealthCheckProgress } from '../lib/client-db';

const TYPE_LABELS: Record<string, string> = {
  inbox: 'Tasks',
  routine: 'Routines',
  reminder: 'Reminders',
  list: 'Lists',
  mealPlan: 'Meal Plans'
};

const TYPE_ICONS: Record<string, string> = {
  inbox: '\uD83D\uDCE5',
  routine: '\u21BB',
  reminder: '\uD83D\uDD14',
  list: '\uD83D\uDCCB',
  mealPlan: '\uD83C\uDF7D\uFE0F'
};

const TYPE_ORDER = ['routine', 'reminder', 'list', 'inbox', 'mealPlan'];

export function HealthCheckPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const isSpouse = role === 'spouse';

  const [items, setItems] = useState<StaleItem[]>([]);
  const [totalStaleCount, setTotalStaleCount] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState<StaleItem | null>(null);
  const [completed, setCompleted] = useState(false);
  const [collapsingIds, setCollapsingIds] = useState<Set<string>>(new Set());
  const [checkedId, setCheckedId] = useState<string | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [result, progress] = await Promise.all([fetchStaleItems(), getHealthCheckProgress()]);
        setItems(result.items);
        setTotalStaleCount(result.totalStaleCount);
        void saveHealthCheckTotalItems(result.items.length);
        if (progress) {
          setReviewedIds(new Set(progress.reviewedItemIds));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    void load();
  }, []);

  const remainingItems = items.filter((item) => !reviewedIds.has(item.entityId) && !collapsingIds.has(item.entityId));
  const allReviewed = items.length > 0 && items.every((item) => reviewedIds.has(item.entityId));

  const collapseAndRemove = useCallback((entityId: string) => {
    setCollapsingIds((prev) => new Set([...prev, entityId]));
    collapseTimerRef.current = setTimeout(() => {
      setReviewedIds((prev) => new Set([...prev, entityId]));
      setCollapsingIds((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }, 250);
  }, []);

  const handleStillActive = useCallback(async (item: StaleItem) => {
    try {
      await confirmFreshness(item.entityType, item.entityId, role, 1);
    } catch {
      // version conflict — proceed anyway, item was updated
    }
    setCheckedId(item.entityId);
    setTimeout(() => {
      setCheckedId(null);
      collapseAndRemove(item.entityId);
    }, 200);
    void saveHealthCheckProgress(item.entityId);
  }, [role, collapseAndRemove]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return;
    try {
      await archiveFreshnessEntity(archiveTarget.entityType, archiveTarget.entityId, role, 1);
    } catch {
      // version conflict — proceed anyway
    }
    void saveHealthCheckProgress(archiveTarget.entityId);
    setArchiveTarget(null);
    collapseAndRemove(archiveTarget.entityId);
  }, [archiveTarget, role, collapseAndRemove]);

  const handleComplete = useCallback(async () => {
    setCompleted(true);
    try {
      await completeHealthCheck();
      await clearHealthCheckProgress();
      void queryClient.invalidateQueries({ queryKey: ['health-check-state'] });
    } catch {
      // ignore
    }
  }, [queryClient]);

  // Auto-complete when all items reviewed
  useEffect(() => {
    if (allReviewed && !completed && !loading) {
      void handleComplete();
    }
  }, [allReviewed, completed, loading, handleComplete]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // Group remaining items by entity type in spec order
  const grouped: [string, StaleItem[]][] = [];
  const itemsByType = remainingItems.reduce<Record<string, StaleItem[]>>((acc, item) => {
    (acc[item.entityType] ??= []).push(item);
    return acc;
  }, {});
  for (const type of TYPE_ORDER) {
    if (itemsByType[type]?.length) {
      grouped.push([type, itemsByType[type]]);
    }
  }

  // Also include collapsing items to show the animation
  const visibleItems = items.filter((item) => !reviewedIds.has(item.entityId));
  const visibleByType = visibleItems.reduce<Record<string, StaleItem[]>>((acc, item) => {
    (acc[item.entityType] ??= []).push(item);
    return acc;
  }, {});
  const visibleGrouped: [string, StaleItem[]][] = [];
  for (const type of TYPE_ORDER) {
    if (visibleByType[type]?.length) {
      visibleGrouped.push([type, visibleByType[type]]);
    }
  }

  const overflowCount = totalStaleCount > items.length ? totalStaleCount - items.length : 0;

  const headerContent = (
    <header className="health-check-page__header">
      <button type="button" className="health-check-page__back" onClick={() => void navigate({ to: '/' })}>
        <ArrowLeft size={20} /> Back
      </button>
      <h1 className="health-check-page__title">Monthly check-up</h1>
    </header>
  );

  if (loading) {
    return (
      <div className="health-check-page">
        {headerContent}
        <div className="health-check-page__loading">Loading...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="health-check-page">
        {headerContent}
        <div className="health-check-page__complete">
          <CheckCircle size={48} weight="fill" className="health-check-page__check-icon" />
          <div className="health-check-page__complete-title">All caught up!</div>
          <div className="health-check-page__complete-body">
            Everything looks good. See you next month for another check.
          </div>
          <button
            type="button"
            className="health-check-page__home-btn"
            onClick={() => void navigate({ to: '/' })}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="health-check-page">
        {headerContent}
        <div className="health-check-page__complete">
          <CheckCircle size={48} weight="fill" className="health-check-page__check-icon" />
          <div className="health-check-page__complete-title">Nothing to review</div>
          <div className="health-check-page__complete-body">
            All your household data looks fresh. Nice work!
          </div>
          <button
            type="button"
            className="health-check-page__home-btn"
            onClick={() => void navigate({ to: '/' })}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="health-check-page">
      {headerContent}
      <div className="health-check-page__subtitle">
        {remainingItems.length} item{remainingItems.length !== 1 ? 's' : ''} to review
      </div>

      <div className="health-check-page__intro">
        Here are a few things that might need a look. Tap to confirm or clean up.
      </div>

      <div className="health-check-page__content">
        {visibleGrouped.map(([type, typeItems]) => (
          <section key={type} className="health-check-section" aria-label={TYPE_LABELS[type] ?? type}>
            <div className="health-check-section__label">{(TYPE_LABELS[type] ?? type).toUpperCase()}</div>
            {typeItems.map((item) => (
              <div
                key={item.entityId}
                className={`health-check-item${collapsingIds.has(item.entityId) ? ' health-check-item--collapsing' : ''}`}
                role="article"
                aria-label={item.entityName}
              >
                <div className="health-check-item__top">
                  <div className={`health-check-item__icon health-check-item__icon--${item.entityType}`}>
                    {TYPE_ICONS[item.entityType] ?? ''}
                  </div>
                  <div className="health-check-item__info">
                    <div className="health-check-item__name">{item.entityName}</div>
                    <div className="health-check-item__activity">{item.lastActivityDescription}</div>
                  </div>
                </div>
                <div className="health-check-item__actions">
                  <button
                    type="button"
                    className={`health-check-item__btn health-check-item__btn--primary${checkedId === item.entityId ? ' health-check-item__btn--checked' : ''}`}
                    disabled={isSpouse || collapsingIds.has(item.entityId)}
                    onClick={() => void handleStillActive(item)}
                  >
                    {checkedId === item.entityId ? '\u2713' : 'Still active'}
                  </button>
                  {item.entityType !== 'mealPlan' && (
                    <button
                      type="button"
                      className="health-check-item__btn health-check-item__btn--secondary"
                      disabled={isSpouse || collapsingIds.has(item.entityId)}
                      onClick={() => setArchiveTarget(item)}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}

        {overflowCount > 0 && (
          <div className="health-check-overflow">
            and {overflowCount} more {'\u2014'} we{'\u2019'}ll catch those next time
          </div>
        )}
      </div>

      {/* Archive confirmation */}
      {archiveTarget && (
        <div className="freshness-archive-confirm" role="alertdialog" aria-label="Archive confirmation">
          <div className="freshness-archive-confirm__backdrop" onClick={() => setArchiveTarget(null)} />
          <div className="freshness-archive-confirm__sheet">
            <div className="freshness-archive-confirm__title">
              Archive {'\u201C'}{archiveTarget.entityName}{'\u201D'}?
            </div>
            <div className="freshness-archive-confirm__body">
              This item will be archived. You can restore it later if needed.
            </div>
            <div className="freshness-archive-confirm__actions">
              <button type="button" className="btn-secondary" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={() => void handleArchiveConfirm()}>Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
