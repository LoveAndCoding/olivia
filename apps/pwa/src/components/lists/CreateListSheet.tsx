import { useState, useEffect, useCallback } from 'react';
import { BottomSheet } from '../reminders/BottomSheet';

type CreateListSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
};

export function CreateListSheet({ open, onClose, onSave }: CreateListSheetProps) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setTitle('');
  }, [open]);

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
    <BottomSheet open={open} onClose={onClose} title="New list">
      <input
        type="text"
        className="list-form-input"
        placeholder="Grocery run, Packing list…"
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
          style={{ flex: 2, opacity: isValid ? 1 : 0.4 }}
          disabled={!isValid || busy}
          onClick={() => void handleSave()}
        >
          Create list
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
