import { useState, useEffect, useCallback } from 'react';
import { BottomSheet } from '../reminders/BottomSheet';

type EditItemSheetProps = {
  open: boolean;
  onClose: () => void;
  currentBody: string;
  onSave: (newBody: string) => Promise<void>;
};

export function EditItemSheet({ open, onClose, currentBody, onSave }: EditItemSheetProps) {
  const [body, setBody] = useState(currentBody);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setBody(currentBody);
  }, [open, currentBody]);

  const handleSave = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSave(trimmed);
    } finally {
      setBusy(false);
    }
  }, [body, busy, onSave]);

  const isValid = body.trim().length > 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit item">
      <input
        type="text"
        className="list-form-input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
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
