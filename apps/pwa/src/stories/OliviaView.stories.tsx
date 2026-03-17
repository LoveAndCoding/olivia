import type { Meta, StoryObj } from '@storybook/react';
import { OliviaView } from '../components/screens/OliviaView';
import { DEMO_INITIAL_MESSAGE, QUICK_CHIPS } from '../lib/demo-data';
import type { ChatMessage } from '../types/display';

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', background: '#E8E4FF', padding: 24 }}>
      <div style={{ width: 390, minHeight: 844, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 44, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div className="ambient ambient-1" />
        <div className="ambient ambient-2" />
        <div className="ambient ambient-3" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const SEED_MESSAGES: ChatMessage[] = [
  { id: 'initial', role: 'olivia', text: DEMO_INITIAL_MESSAGE },
];

const DRAFT_MESSAGES: ChatMessage[] = [
  { id: 'initial', role: 'olivia', text: DEMO_INITIAL_MESSAGE },
  { id: 'user-1', role: 'user', text: 'Yes please, keep it friendly.' },
  {
    id: 'olivia-1',
    role: 'olivia',
    text: "Done! Here's a draft — feel free to edit before sending:",
    showDraftCard: true,
  },
];

const meta = {
  title: 'Screens/Olivia',
  component: OliviaView,
  decorators: [
    (Story) => (
      <PhoneFrame>
        <Story />
      </PhoneFrame>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    initialMessages: SEED_MESSAGES,
    chips: QUICK_CHIPS,
  },
} satisfies Meta<typeof OliviaView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Initial state — Olivia's opening nudge about the plumber, with suggestion chips. */
export const WithNudge: Story = {};

/** Empty chat — no opening message (production state when no nudge is active). */
export const EmptyChat: Story = {
  args: { initialMessages: [], chips: QUICK_CHIPS },
};

/** Mid-conversation — showing the draft action card ready for user review. */
export const WithDraftCard: Story = {
  args: { initialMessages: DRAFT_MESSAGES, chips: [] },
};
