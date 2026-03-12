import type { Meta, StoryObj } from '@storybook/react';
import { HomeView } from '../components/screens/HomeView';
import {
  DEMO_NUDGE,
  DEMO_TASKS,
  DEMO_EVENTS,
} from '../lib/demo-data';

/** Phone-frame wrapper so stories match the 390px mobile design reference. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', background: '#E8E4FF', padding: 24 }}>
      <div style={{ width: 390, minHeight: 844, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 44, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* Ambient blobs */}
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

const meta = {
  title: 'Screens/Home',
  component: HomeView,
  decorators: [
    (Story) => (
      <PhoneFrame>
        <Story />
      </PhoneFrame>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    greeting: 'Good morning,',
    displayName: 'Lexi',
    subtitle: 'Thursday, March 12 · 3 things need you today',
    nudge: DEMO_NUDGE,
    tasks: DEMO_TASKS,
    events: DEMO_EVENTS,
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full reference state — matches home-screen-reference-state.md exactly. */
export const ReferenceState: Story = {};

/** Home screen without a nudge (Olivia has nothing proactive to say). */
export const NoNudge: Story = {
  args: { nudge: null },
};

/** Morning greeting variant. */
export const GoodMorning: Story = {
  args: { greeting: 'Good morning,' },
};

/** Afternoon greeting variant. */
export const GoodAfternoon: Story = {
  args: { greeting: 'Good afternoon,' },
};

/** Empty task list — nothing needs doing. */
export const EmptyTasks: Story = {
  args: { tasks: [], nudge: null, subtitle: 'Thursday, March 12 · all caught up' },
};

/** Loading state while the inbox query is in flight. */
export const Loading: Story = {
  args: { tasks: [], events: [], nudge: null, isLoading: true },
};

/** Error state when the inbox API is unreachable. */
export const Error: Story = {
  args: { tasks: [], events: [], nudge: null, error: 'Could not reach the server. Showing last known state.' },
};

/** Only one urgent overdue task. */
export const SingleOverdueTask: Story = {
  args: {
    tasks: [DEMO_TASKS[0]],
    subtitle: 'Thursday, March 12 · 1 thing needs you today',
    nudge: null,
  },
};

/** Viewing as Alexander (spouse). */
export const SpouseView: Story = {
  args: { displayName: 'Alexander' },
};
