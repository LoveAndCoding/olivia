import type { Reminder } from '@olivia/contracts';
import { computeReminderState } from '@olivia/domain';
import { getReminderDueDisplay, formatReminderMeta, formatRecurrenceLabel } from '../../lib/reminder-helpers';
import { useAuth } from '../../lib/auth';

type ReminderRowProps = {
  reminder: Reminder;
  onClick?: () => void;
};

export function ReminderRow({ reminder, onClick }: ReminderRowProps) {
  const { user } = useAuth();
  const state = computeReminderState(reminder, new Date());
  const display = getReminderDueDisplay(reminder);
  const meta = formatReminderMeta(reminder, user?.id ?? null);
  const isRecurring = reminder.recurrenceCadence !== 'none';
  const isLinked = !!reminder.linkedInboxItemId;
  const isDone = state === 'completed' || state === 'cancelled';

  return (
    <div
      className={`rem-row ${display.borderClass} ${display.opacityClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`Reminder: ${reminder.title}`}
    >
      <div className={`rem-dot ${display.dotClass}`} aria-hidden="true" />
      <div className="rem-body">
        <div className={`rem-title${isDone ? ' done' : ''}`}>{reminder.title}</div>
        <div className="rem-meta">
          <span>{meta}</span>
          {isRecurring && (
            <span
              className="rem-pill rem-pill-recurrence"
              aria-label={`Recurring ${reminder.recurrenceCadence}`}
            >
              {formatRecurrenceLabel(reminder.recurrenceCadence)}
            </span>
          )}
          {isLinked && (
            <span className="rem-pill rem-pill-linked">🔗 Task</span>
          )}
        </div>
      </div>
      <div className={`rem-badge ${display.badgeClass}`}>{display.badgeText}</div>
    </div>
  );
}
