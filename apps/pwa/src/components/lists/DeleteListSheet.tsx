import { BottomSheet } from '../reminders/BottomSheet';

type DeleteListSheetProps = {
  open: boolean;
  onClose: () => void;
  listTitle: string;
  itemCount: number;
  onConfirm: () => void;
};

export function DeleteListSheet({ open, onClose, listTitle, itemCount, onConfirm }: DeleteListSheetProps) {
  const itemsLabel = itemCount > 0 ? `all ${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'all items';

  return (
    <BottomSheet open={open} onClose={onClose} title="Permanently delete?">
      <div className="cancel-body">
        This will remove "{listTitle}" and {itemsLabel}. This cannot be undone.
      </div>
      <div className="cancel-actions">
        <button
          type="button"
          className="rem-btn rem-btn-danger"
          style={{ width: '100%' }}
          onClick={onConfirm}
        >
          Delete list
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ width: '100%' }}
          onClick={onClose}
        >
          Keep it
        </button>
      </div>
    </BottomSheet>
  );
}
