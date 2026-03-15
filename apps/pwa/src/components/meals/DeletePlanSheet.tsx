import { BottomSheet } from '../reminders/BottomSheet';

type DeletePlanSheetProps = {
  open: boolean;
  onClose: () => void;
  planTitle: string;
  onConfirm: () => void;
};

export function DeletePlanSheet({ open, onClose, planTitle, onConfirm }: DeletePlanSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Delete Plan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 24px' }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
          Permanently delete <strong>{planTitle}</strong>? This cannot be undone.
        </p>
        <button
          type="button"
          className="rem-btn"
          style={{ width: '100%', color: 'var(--rose)', borderColor: 'var(--rose)' }}
          onClick={onConfirm}
        >
          Delete Plan
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
