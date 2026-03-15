import { useState, useCallback } from 'react';
import { getMondayOfWeek } from '@olivia/domain';
import { BottomSheet } from '../reminders/BottomSheet';

type CreatePlanSheetProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, weekStartDate: string) => void;
};

function todayMonday(): string {
  const monday = getMondayOfWeek(new Date());
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CreatePlanSheet({ open, onClose, onCreate }: CreatePlanSheetProps) {
  const [title, setTitle] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(todayMonday);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) { setError('Title is required.'); return; }
    const date = new Date(weekStartDate + 'T00:00:00');
    if (date.getDay() !== 1) { setError('Week start date must be a Monday.'); return; }
    setError(null);
    onCreate(title.trim(), weekStartDate);
    setTitle('');
    setWeekStartDate(todayMonday());
  }, [title, weekStartDate, onCreate]);

  return (
    <BottomSheet open={open} onClose={onClose} title="New Meal Plan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
            Title
          </label>
          <input
            type="text"
            className="rem-form-input"
            placeholder="e.g. Week of March 10"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
            Week starts (Monday)
          </label>
          <input
            type="date"
            className="rem-form-input"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
          />
        </div>
        {error && <div style={{ fontSize: 13, color: 'var(--rose)' }}>{error}</div>}
        <button
          type="button"
          className="rem-btn rem-btn-primary"
          style={{ width: '100%', marginTop: 4 }}
          onClick={handleSubmit}
        >
          Create Plan
        </button>
      </div>
    </BottomSheet>
  );
}
