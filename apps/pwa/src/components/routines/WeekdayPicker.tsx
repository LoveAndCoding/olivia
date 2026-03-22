type WeekdayPickerProps = {
  selected: number[];
  onChange: (days: number[]) => void;
  mode: 'single' | 'multi';
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WeekdayPicker({ selected, onChange, mode }: WeekdayPickerProps) {
  const handleToggle = (dayIndex: number) => {
    if (mode === 'single') {
      onChange([dayIndex]);
      return;
    }
    // Multi-select
    if (selected.includes(dayIndex)) {
      // Don't deselect the last day
      if (selected.length <= 1) return;
      onChange(selected.filter((d) => d !== dayIndex));
    } else {
      onChange([...selected, dayIndex].sort((a, b) => a - b));
    }
  };

  return (
    <div
      role="group"
      aria-label="Select days of the week"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        padding: '12px 0',
      }}
    >
      {DAY_LABELS.map((label, i) => {
        const isSelected = selected.includes(i);
        return (
          <button
            key={i}
            type="button"
            role={mode === 'multi' ? 'checkbox' : 'radio'}
            aria-checked={isSelected}
            aria-label={DAY_NAMES[i]}
            onClick={() => handleToggle(i)}
            className={`weekday-circle${isSelected ? ' weekday-circle-selected' : ''}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
