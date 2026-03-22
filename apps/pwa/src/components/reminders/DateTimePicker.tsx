import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { format, addDays, setHours, setMinutes, setSeconds } from 'date-fns';

type DateTimePickerProps = {
  /** ISO string of current value, or empty */
  value: string;
  /** Called with ISO string when user selects a valid date/time */
  onChange: (isoString: string) => void;
  /** 'create' defaults to tomorrow 9 AM; 'snooze' defaults to next whole hour */
  mode: 'create' | 'snooze' | 'edit';
  /** Whether to show the picker expanded */
  open: boolean;
  /** Called when picker visibility should toggle */
  onToggle: () => void;
};

function getDefaultValue(mode: 'create' | 'snooze' | 'edit', currentValue: string): string {
  if (mode === 'edit' && currentValue) {
    return toLocalInputValue(currentValue);
  }
  const now = new Date();
  if (mode === 'snooze') {
    // Next whole hour
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return toLocalInputValue(next.toISOString());
  }
  // create: tomorrow 9 AM
  const tomorrow = setSeconds(setMinutes(setHours(addDays(now, 1), 9), 0), 0);
  return toLocalInputValue(tomorrow.toISOString());
}

function toLocalInputValue(isoString: string): string {
  const d = new Date(isoString);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function getMinValue(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

export function DateTimePicker({ value, onChange, mode, open, onToggle }: DateTimePickerProps) {
  const [localValue, setLocalValue] = useState(() =>
    value ? toLocalInputValue(value) : getDefaultValue(mode, value)
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when value changes externally
  useEffect(() => {
    if (value) {
      setLocalValue(toLocalInputValue(value));
      setValidationError(null);
    }
  }, [value]);

  // Reset default when opening
  useEffect(() => {
    if (open && !value) {
      setLocalValue(getDefaultValue(mode, value));
      setValidationError(null);
    }
  }, [open, mode, value]);

  const isPastDate = useCallback((inputValue: string): boolean => {
    const selected = new Date(inputValue);
    return selected.getTime() < Date.now();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (!newValue) {
      setValidationError(null);
      return;
    }

    if (isPastDate(newValue)) {
      setValidationError('Pick a time in the future');
      return;
    }

    setValidationError(null);
    const date = new Date(newValue);
    onChange(date.toISOString());
  }, [onChange, isPastDate]);

  const formattedDisplay = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    const now = new Date();
    const tomorrow = addDays(now, 1);

    if (d.toDateString() === now.toDateString()) {
      return `Today, ${format(d, 'h:mm a')}`;
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${format(d, 'h:mm a')}`;
    }
    return format(d, 'MMM d, h:mm a');
  }, [value]);

  const hasError = validationError !== null;

  if (!open) {
    return (
      <button
        type="button"
        className={`rem-chip${value ? ' datetime-chip-active' : ''}`}
        onClick={onToggle}
      >
        {value ? `📅 ${formattedDisplay}` : '+ Custom date'}
      </button>
    );
  }

  return (
    <div className="datetime-picker-wrapper">
      <div className={`datetime-picker-container${hasError ? ' datetime-picker-error' : ''}`}>
        <label className="datetime-picker-label">DATE & TIME</label>
        <input
          ref={inputRef}
          type="datetime-local"
          className="datetime-picker-input"
          value={localValue}
          min={getMinValue()}
          onChange={handleChange}
          aria-label="Select date and time"
        />
        {formattedDisplay && !hasError && (
          <div className="datetime-picker-display">{formattedDisplay}</div>
        )}
      </div>
      {hasError && (
        <div className="datetime-picker-validation" role="alert">
          {validationError}
        </div>
      )}
    </div>
  );
}

export { isPastDateTime };

function isPastDateTime(isoString: string): boolean {
  return new Date(isoString).getTime() < Date.now();
}
