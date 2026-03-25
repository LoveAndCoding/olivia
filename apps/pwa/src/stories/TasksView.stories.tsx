import type { Meta, StoryObj } from '@storybook/react';
import { TasksView } from '../components/screens/TasksView';
import { DEMO_FULL_TASKS, DEMO_COMPLETED_TASKS } from '../lib/demo-data';
import type { CompletedTask, FullTask } from '../types/display';

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', background: '#E8E4FF', padding: 24 }}>
      <div style={{ width: 390, minHeight: 844, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 44, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div className="ambient ambient-1" />
        <div className="ambient ambient-2" />
        <div className="ambient ambient-3" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const OPEN_TASKS: FullTask[] = DEMO_FULL_TASKS.map((t) => ({
  id: t.id,
  title: t.title,
  dueText: t.meta,
  accent: (t.accent ?? '') as FullTask['accent'],
  badge: t.badgeClass ? { label: t.badge ?? '', cls: t.badgeClass } : null,
  assignee: t.assigneeInitial ? { initial: t.assigneeInitial, name: t.assignee, cls: t.assigneeClass } : null,
}));

const DONE_TASKS: CompletedTask[] = DEMO_COMPLETED_TASKS.map((t) => ({
  id: t.id,
  title: t.title,
  meta: t.meta,
}));

const meta = {
  title: 'Screens/Tasks',
  component: TasksView,
  decorators: [
    (Story) => (
      <PhoneFrame>
        <Story />
      </PhoneFrame>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    openTasks: OPEN_TASKS,
    doneTasks: DONE_TASKS,
    summaryLine: '5 open · 2 completed this week',
  },
} satisfies Meta<typeof TasksView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full task list with open and completed tasks. */
export const DefaultView: Story = {};

/** All tasks complete — empty state with celebration copy. */
export const EmptyOpenTasks: Story = {
  args: { openTasks: [], summaryLine: '0 open · 5 completed this week' },
};

/** No tasks at all (new household). */
export const BlankSlate: Story = {
  args: { openTasks: [], doneTasks: [], summaryLine: '0 open · 0 completed' },
};

/** Loading while the API responds. */
export const Loading: Story = {
  args: { openTasks: [], doneTasks: [], isLoading: true },
};

/** API error fallback. */
export const Error: Story = {
  args: { openTasks: [], doneTasks: [], error: 'Could not reach the server. Check your connection.' },
};

/** Only overdue tasks — useful for the Overdue filter view. */
export const OnlyOverdue: Story = {
  args: {
    openTasks: OPEN_TASKS.filter((t) => t.accent === 'rose'),
    doneTasks: [],
    summaryLine: '1 overdue',
  },
};
