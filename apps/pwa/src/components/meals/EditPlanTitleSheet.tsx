import { useState, useCallback } from 'react';
import { BottomSheet } from '../reminders/BottomSheet';

type EditPlanTitleSheetProps = {
  open: boolean;
  onClose: () => void;
  currentTitle: string;
  onSave: (title: string) => void;
};

export function EditPlanTitleSheet({ open, onClose, currentTitle, onSave }: EditPlanTitleSheetProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setError(null);
    onSave(title.trim());
  }, [title, onSave]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Rename Plan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
            Title
          </label>
          <input
            type="text"
            className="rem-form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        {error && <div style={{ fontSize: 13, color: 'var(--rose)' }}>{error}</div>}
        <button
          type="button"
          className="rem-btn rem-btn-primary"
          style={{ width: '100%', marginTop: 4 }}
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </BottomSheet>
  );
}
