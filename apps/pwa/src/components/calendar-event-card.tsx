import { format } from 'date-fns';

interface CalendarEventCardProps {
  date: Date;
  title: string;
  time?: string;
  location?: string;
}

export function CalendarEventCard({ date, title, time, location }: CalendarEventCardProps) {
  const dayNum = format(date, 'd');
  const monthAbbr = format(date, 'MMM').toUpperCase();

  return (
    <div className="calendar-event-card">
      <div className="calendar-date-block" aria-label={format(date, 'MMMM d')}>
        <span className="calendar-date-day">{dayNum}</span>
        <span className="calendar-date-month">{monthAbbr}</span>
      </div>
      <div className="calendar-event-body">
        <span className="calendar-event-title">{title}</span>
        {(time || location) && (
          <span className="calendar-event-meta muted">
            {[time, location].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
    </div>
  );
}
