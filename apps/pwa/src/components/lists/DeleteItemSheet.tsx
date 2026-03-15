import { BottomSheet } from '../reminders/BottomSheet';

type DeleteItemSheetProps = {
  open: boolean;
  onClose: () => void;
  itemBody: string;
  onConfirm: () => void;
};

export function DeleteItemSheet({ open, onClose, itemBody, onConfirm }: DeleteItemSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Remove item?">
      <div className="cancel-body">
        "{itemBody}" will be removed from this list.
      </div>
      <div className="cancel-actions">
        <button
          type="button"
          className="rem-btn rem-btn-secondary"
          style={{ width: '100%' }}
          onClick={onConfirm}
        >
          Remove
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ width: '100%' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
