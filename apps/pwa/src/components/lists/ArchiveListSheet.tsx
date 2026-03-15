import { BottomSheet } from '../reminders/BottomSheet';

type ArchiveListSheetProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ArchiveListSheet({ open, onClose, onConfirm }: ArchiveListSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Archive this list?">
      <div className="cancel-body">
        It will be hidden from your active view but not deleted. You can restore it from the Archived filter.
      </div>
      <div className="cancel-actions">
        <button
          type="button"
          className="rem-btn rem-btn-secondary"
          style={{ width: '100%' }}
          onClick={onConfirm}
        >
          Archive
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
