import type { MealPlan } from '@olivia/contracts';
import { formatWeekRange } from '@olivia/domain';

type MealPlanCardProps = {
  plan: MealPlan;
  onClick: () => void;
  onOverflow: (e: React.MouseEvent) => void;
  showOverflow?: boolean;
};

export function MealPlanCard({ plan, onClick, onOverflow, showOverflow = true }: MealPlanCardProps) {
  const { title, weekStartDate, mealCount, shoppingItemCount, status, pendingSync } = plan;
  const isArchived = status === 'archived';
  const weekRange = formatWeekRange(weekStartDate);

  const countLabel = mealCount === 0
    ? 'No meals yet'
    : `${mealCount} meal${mealCount !== 1 ? 's' : ''} · ${shoppingItemCount} item${shoppingItemCount !== 1 ? 's' : ''}`;

  return (
    <div
      className={`list-card list-card-stagger${isArchived ? ' archived' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={title}
    >
      <div className="list-card-title-row">
        <div className="list-card-title">{title}</div>
        {showOverflow && !isArchived && (
          <button
            type="button"
            className="list-card-overflow"
            aria-label="Plan options"
            onClick={(e) => { e.stopPropagation(); onOverflow(e); }}
          >
            ···
          </button>
        )}
      </div>

      <div className="list-card-meta-row">
        <span className="list-card-count">{weekRange}</span>
        {pendingSync && <span className="list-pending-dot" title="Waiting to sync" />}
      </div>

      <div className="list-card-updated">{countLabel}</div>
    </div>
  );
}
