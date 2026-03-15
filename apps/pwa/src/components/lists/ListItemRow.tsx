import type { ListItem } from '@olivia/contracts';

type ListItemRowProps = {
  item: ListItem;
  onCheck: () => void;
  onUncheck: () => void;
  onOverflow: () => void;
  isSpouse?: boolean;
  disabled?: boolean;
};

export function ListItemRow({ item, onCheck, onUncheck, onOverflow, isSpouse = false, disabled = false }: ListItemRowProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpouse || disabled) return;
    if (item.checked) {
      onUncheck();
    } else {
      onCheck();
    }
  };

  return (
    <div className="list-item-row">
      <button
        type="button"
        className={`list-item-checkbox${item.checked ? ' checked' : ''}${isSpouse ? ' inert' : ''}`}
        onClick={handleCheckboxClick}
        aria-checked={item.checked}
        aria-disabled={isSpouse || undefined}
        aria-label={isSpouse ? 'Read-only' : item.checked ? 'Uncheck item' : 'Check item'}
        role="checkbox"
        tabIndex={isSpouse ? -1 : 0}
      >
        {item.checked && '✓'}
      </button>

      <span className={`list-item-text${item.checked ? ' checked' : ''}`}>
        {item.body}
      </span>

      <div className="list-item-row-actions">
        {item.pendingSync && (
          <span className="list-pending-dot" title="Waiting to sync" />
        )}
        {!isSpouse && (
          <button
            type="button"
            className="list-item-overflow"
            aria-label="Item options"
            onClick={(e) => { e.stopPropagation(); onOverflow(); }}
          >
            ···
          </button>
        )}
      </div>
    </div>
  );
}
