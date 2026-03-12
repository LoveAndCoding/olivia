import { format } from 'date-fns';

interface GreetingProps {
  name: string;
  date?: Date;
  taskCount?: number;
}

function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function Greeting({ name, date = new Date(), taskCount }: GreetingProps) {
  const timeOfDay = getTimeOfDay(date);
  const formattedDate = format(date, 'EEEE, MMMM d');

  return (
    <div className="greeting">
      <h1 className="greeting-heading">
        Good {timeOfDay},
        <br />
        <span className="greeting-name">{name}.</span>
      </h1>
      <p className="greeting-meta muted">
        {formattedDate}
        {taskCount !== undefined && taskCount > 0 && (
          <> · {taskCount} {taskCount === 1 ? 'thing needs' : 'things need'} you today</>
        )}
      </p>
    </div>
  );
}
