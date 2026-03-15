import { BottomSheet } from '../reminders/BottomSheet';

type ArchivePlanSheetProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ArchivePlanSheet({ open, onClose, onConfirm }: ArchivePlanSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Archive Plan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 24px' }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
          This plan will be moved to the archive. You can restore it at any time.
        </p>
        <button
          type="button"
          className="rem-btn rem-btn-primary"
          style={{ width: '100%' }}
          onClick={onConfirm}
        >
          Archive Plan
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
