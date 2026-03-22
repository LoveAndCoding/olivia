import { useState, useCallback, useMemo } from 'react';
import { BottomSheet } from './BottomSheet';
import { OliviaMessage } from './OliviaMessage';
import { DateTimePicker, isPastDateTime } from './DateTimePicker';
import { getSnoozeOptions } from '../../lib/reminder-helpers';
import { format, addDays } from 'date-fns';

type SnoozeSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelectTime: (isoString: string) => void;
};

export function SnoozeSheet({ open, onClose, onSelectTime }: SnoozeSheetProps) {
  const options = getSnoozeOptions(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customTime, setCustomTime] = useState('');

  const handlePickerToggle = useCallback(() => {
    setPickerOpen((prev) => !prev);
  }, []);

  const handleCustomTimeChange = useCallback((isoString: string) => {
    setCustomTime(isoString);
  }, []);

  const handleApplyCustomSnooze = useCallback(() => {
    if (customTime && !isPastDateTime(customTime)) {
      onSelectTime(customTime);
    }
  }, [customTime, onSelectTime]);

  const formattedSnoozeLabel = useMemo(() => {
    if (!customTime) return 'Snooze until…';
    const d = new Date(customTime);
    const now = new Date();
    const tomorrow = addDays(now, 1);
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Snooze until tomorrow at ${format(d, 'h:mm a')}`;
    }
    return `Snooze until ${format(d, 'MMM d, h:mm a')}`;
  }, [customTime]);

  const isCustomValid = customTime.length > 0 && !isPastDateTime(customTime);

  return (
    <BottomSheet open={open} onClose={onClose} title="Snooze until…">
      <OliviaMessage
        text="When would you like me to resurface this?"
      />
      <div className="snooze-options">
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            className="snooze-option"
            onClick={() => onSelectTime(opt.value.toISOString())}
          >
            <span className="snooze-option-label">{opt.label}</span>
            <span className="snooze-option-time">{opt.timeLabel}</span>
          </button>
        ))}
        <button
          type="button"
          className="snooze-option"
          onClick={handlePickerToggle}
          style={{ color: 'var(--violet)' }}
        >
          <span className="snooze-option-label">Choose a time…</span>
          <span className="snooze-option-time">Custom</span>
        </button>
      </div>
      {pickerOpen && (
        <div style={{ marginTop: 12 }}>
          <DateTimePicker
            value={customTime}
            onChange={handleCustomTimeChange}
            mode="snooze"
            open={true}
            onToggle={handlePickerToggle}
          />
          <button
            type="button"
            className="snooze-apply-btn"
            disabled={!isCustomValid}
            onClick={handleApplyCustomSnooze}
          >
            {formattedSnoozeLabel}
          </button>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button type="button" className="rem-btn rem-btn-ghost" style={{ width: '100%' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
