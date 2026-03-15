import { useState, useEffect, useCallback } from 'react';
import { BottomSheet } from '../reminders/BottomSheet';

type EditTitleSheetProps = {
  open: boolean;
  onClose: () => void;
  currentTitle: string;
  onSave: (newTitle: string) => Promise<void>;
};

export function EditTitleSheet({ open, onClose, currentTitle, onSave }: EditTitleSheetProps) {
  const [title, setTitle] = useState(currentTitle);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTitle(currentTitle);
  }, [open, currentTitle]);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSave(trimmed);
    } finally {
      setBusy(false);
    }
  }, [title, busy, onSave]);

  const isValid = title.trim().length > 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Rename list">
      <input
        type="text"
        className="list-form-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
        autoFocus
        disabled={busy}
      />
      <div className="rem-actions-row">
        <button
          type="button"
          className="rem-btn rem-btn-primary"
          style={{ flex: 2 }}
          disabled={!isValid || busy}
          onClick={() => void handleSave()}
        >
          Save
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ flex: 1 }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
