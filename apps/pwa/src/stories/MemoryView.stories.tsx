import type { Meta, StoryObj } from '@storybook/react';
import { MemoryView } from '../components/screens/MemoryView';
import { DEMO_MEMORY } from '../lib/demo-data';

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

const meta = {
  title: 'Screens/Memory',
  component: MemoryView,
  decorators: [
    (Story) => (
      <PhoneFrame>
        <Story />
      </PhoneFrame>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    categories: DEMO_MEMORY,
  },
} satisfies Meta<typeof MemoryView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full memory store with all seeded categories. */
export const WithMemory: Story = {};

/** Empty state — Olivia hasn't saved anything yet (production initial state). */
export const EmptyState: Story = {
  args: { categories: [] },
};

/** Only the Decisions Made category. */
export const DecisionsOnly: Story = {
  args: { categories: [DEMO_MEMORY[0]] },
};

/** Only the Contacts & Services category. */
export const ContactsOnly: Story = {
  args: { categories: [DEMO_MEMORY[2]] },
};
