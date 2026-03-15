import type { SharedList } from '@olivia/contracts';
import { formatRelativeTime } from '../../lib/format-helpers';

type ListCardProps = {
  list: SharedList;
  onClick: () => void;
  onOverflow: (e: React.MouseEvent) => void;
  showOverflow?: boolean;
};

export function ListCard({ list, onClick, onOverflow, showOverflow = true }: ListCardProps) {
  const { title, activeItemCount, checkedItemCount, allChecked, updatedAt, pendingSync, status } = list;
  const isArchived = status === 'archived';
  const totalItems = activeItemCount + checkedItemCount;

  const borderClass = allChecked && totalItems > 0 ? 'border-mint' : isArchived ? 'border-archived' : '';
  const archivedClass = isArchived ? 'archived' : '';

  const countLabel = totalItems === 0
    ? 'No items'
    : allChecked
    ? null
    : `${totalItems} item${totalItems !== 1 ? 's' : ''} · ${checkedItemCount} checked`;

  return (
    <div
      className={`list-card list-card-stagger ${borderClass} ${archivedClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={title}
    >
      <div className="list-card-title-row">
        <div className="list-card-title">{title}</div>
        {showOverflow && (
          <button
            type="button"
            className="list-card-overflow"
            aria-label="List options"
            onClick={(e) => { e.stopPropagation(); onOverflow(e); }}
          >
            ···
          </button>
        )}
      </div>

      <div className="list-card-meta-row">
        {allChecked && totalItems > 0 ? (
          <span className="list-all-done-badge">✓ All done</span>
        ) : (
          <span className="list-card-count">{countLabel}</span>
        )}
        {pendingSync && <span className="list-pending-dot" title="Waiting to sync" />}
      </div>

      <div className="list-card-updated">{formatRelativeTime(updatedAt)}</div>
    </div>
  );
}
