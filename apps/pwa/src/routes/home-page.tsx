import { useState } from 'react';
import { Greeting } from '../components/greeting';
import { OliviaNoticedCard } from '../components/olivia-noticed-card';
import { SectionHeader } from '../components/section-header';
import { HomeTaskItem } from '../components/home-task-item';
import { CalendarEventCard } from '../components/calendar-event-card';

const DEMO_TASKS = [
  { id: '1', title: 'Follow up on plumber quote', subtitle: 'Added 3 days ago · no reply', status: 'overdue' as const },
  { id: '2', title: 'Pick up dry cleaning', subtitle: 'Due tomorrow, Mar 14', status: 'soon' as const },
  { id: '3', title: 'Renew car registration', subtitle: 'Mar 31 · Alex', status: 'shared' as const },
];

const DEMO_EVENTS = [
  { date: new Date(2026, 2, 14), title: 'HVAC service visit', time: '10:00–12:00' },
  { date: new Date(2026, 2, 15), title: "Jordan's birthday dinner", time: '7:00 PM', location: 'River North' },
  { date: new Date(2026, 2, 18), title: 'Vet — Luna annual', time: '2:30 PM', location: 'Dr. Pat' },
];

export function HomePage() {
  const [dismissed, setDismissed] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="stack-lg">
      <Greeting name="Jamie" taskCount={3} />

      {!dismissed && (
        <OliviaNoticedCard
          message="The plumber hasn't replied in 3 days. Want me to draft a follow-up for you?"
          onAccept={() => setDismissed(true)}
          onDismiss={() => setDismissed(true)}
        />
      )}

      <div className="stack-md">
        <SectionHeader title="Needs doing" linkLabel="All tasks →" href="/" />
        <div role="list" className="stack-sm">
          {DEMO_TASKS.map((task) => (
            <HomeTaskItem
              key={task.id}
              title={task.title}
              subtitle={task.subtitle}
              status={task.status}
              checked={checkedIds.has(task.id)}
              onToggle={() => toggleCheck(task.id)}
            />
          ))}
        </div>
      </div>

      <div className="stack-md">
        <SectionHeader title="Coming up" />
        <div className="calendar-events-scroll" role="list" aria-label="Upcoming events">
          {DEMO_EVENTS.map((event, i) => (
            <CalendarEventCard
              key={i}
              date={event.date}
              title={event.title}
              time={event.time}
              location={event.location}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
