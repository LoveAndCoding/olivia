import { BottomSheet } from '../reminders/BottomSheet';

type DeleteMealSheetProps = {
  open: boolean;
  onClose: () => void;
  mealName: string;
  onConfirm: () => void;
};

export function DeleteMealSheet({ open, onClose, mealName, onConfirm }: DeleteMealSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Delete Meal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 24px' }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
          Delete <strong>{mealName}</strong>? This cannot be undone.
        </p>
        <button
          type="button"
          className="rem-btn"
          style={{ width: '100%', color: 'var(--rose)', borderColor: 'var(--rose)' }}
          onClick={onConfirm}
        >
          Delete Meal
        </button>
        <button
          type="button"
          className="rem-btn"
          style={{ width: '100%' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
