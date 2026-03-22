type WeekIntervalStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function WeekIntervalStepper({ value, onChange, min = 2, max = 12 }: WeekIntervalStepperProps) {
  return (
    <div
      role="spinbutton"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Week interval"
      className="week-interval-stepper"
    >
      <button
        type="button"
        className="week-interval-stepper-btn"
        aria-label="Decrease interval"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="week-interval-stepper-value">{value}</span>
      <button
        type="button"
        className="week-interval-stepper-btn"
        aria-label="Increase interval"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
      <span className="week-interval-stepper-label">weeks</span>
    </div>
  );
}
