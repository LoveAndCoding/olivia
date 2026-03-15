import { BottomSheet } from '../reminders/BottomSheet';

type OverflowAction = {
  label: string;
  danger?: boolean;
  onClick: () => void;
};

type OverflowMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  actions: OverflowAction[];
};

export function OverflowMenuSheet({ open, onClose, actions }: OverflowMenuSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="list-overflow-actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`list-overflow-item${action.danger ? ' danger' : ''}`}
            onClick={() => { action.onClick(); onClose(); }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
