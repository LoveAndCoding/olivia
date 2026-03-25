/**
 * Seeded demo state for visual QA.
 * Reproduces the exact content from docs/vision/home-screen-reference-state.md.
 * Used as fallback when the API returns no items or is unavailable.
 */

export type DemoTask = {
  id: string;
  title: string;
  meta: string;
  badge: 'Needs attention' | 'Soon' | 'Shared';
  accent: 'rose' | 'peach' | 'mint';
  badgeClass: 'badge-rose' | 'badge-peach' | 'badge-violet';
};

export type DemoEvent = {
  dateNum: string;
  dateMon: string;
  name: string;
  time: string;
};

export type MemoryEntry = {
  id: string;
  icon: string;
  iconColor: 'violet' | 'rose' | 'peach' | 'mint';
  title: string;
  detail: string;
  age: string;
};

export type MemoryCategory = {
  id: string;
  label: string;
  entries: MemoryEntry[];
};

/** The active Olivia nudge for the demo state. */
export const DEMO_NUDGE = {
  message: '"The plumber hasn\'t replied in 3 days. Want me to draft a follow-up for you?"',
  primaryCta: 'Yes, draft it',
  secondaryCta: 'Later',
} as const;

/** Top 3 tasks for the Home screen reference state. */
export const DEMO_TASKS: DemoTask[] = [
  {
    id: 'demo-task-1',
    title: 'Follow up on plumber quote',
    meta: 'Added 3 days ago · no reply',
    badge: 'Needs attention',
    accent: 'rose',
    badgeClass: 'badge-rose',
  },
  {
    id: 'demo-task-2',
    title: 'Pick up dry cleaning',
    meta: 'Due tomorrow, Mar 14',
    badge: 'Soon',
    accent: 'peach',
    badgeClass: 'badge-peach',
  },
  {
    id: 'demo-task-3',
    title: 'Renew car registration',
    meta: 'Mar 31 · Christian',
    badge: 'Shared',
    accent: 'mint',
    badgeClass: 'badge-violet',
  },
];

/** Upcoming events for the Home screen reference state. */
export const DEMO_EVENTS: DemoEvent[] = [
  { dateNum: '14', dateMon: 'Mar', name: 'HVAC service visit',    time: '10:00 – 12:00' },
  { dateNum: '15', dateMon: 'Mar', name: "Jordan's birthday dinner", time: '7:00 PM · River North' },
  { dateNum: '18', dateMon: 'Mar', name: 'Vet — Luna annual',     time: '2:30 PM · Dr. Patel' },
  { dateNum: '31', dateMon: 'Mar', name: 'Car registration due',  time: 'Renew by end of month' },
];

/** Seeded memory categories for the Memory screen. */
export const DEMO_MEMORY: MemoryCategory[] = [
  {
    id: 'decisions',
    label: 'Decisions made',
    entries: [
      {
        id: 'mem-1',
        icon: '🎨',
        iconColor: 'violet',
        title: 'Living room paint color',
        detail: 'Benjamin Moore "Pale Oak" — agreed Feb 28',
        age: '2w',
      },
      {
        id: 'mem-2',
        icon: '🏡',
        iconColor: 'rose',
        title: 'Bathroom reno budget',
        detail: 'Max $8,500 including labor and fixtures',
        age: '1w',
      },
    ],
  },
  {
    id: 'maintenance',
    label: 'Home maintenance',
    entries: [
      {
        id: 'mem-3',
        icon: '🔧',
        iconColor: 'peach',
        title: 'Furnace filter last changed',
        detail: 'Feb 4, 2025 · 3M 1500 MPR filter · next due ~Apr 4',
        age: '5w',
      },
      {
        id: 'mem-4',
        icon: '❄️',
        iconColor: 'mint',
        title: 'AC last serviced',
        detail: 'May 2024 · Johnson HVAC · annual service booked Mar 14',
        age: '10m',
      },
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts & services',
    entries: [
      {
        id: 'mem-5',
        icon: '🔑',
        iconColor: 'violet',
        title: "Mike's Plumbing",
        detail: '(312) 555-0182 · awaiting bathroom quote',
        age: '3d',
      },
    ],
  },
];

/** Full demo tasks for the Tasks screen. */
export const DEMO_FULL_TASKS = [
  {
    id: 'demo-full-1',
    title: 'Follow up on plumber quote for bathroom reno',
    meta: 'Added Mar 9',
    assignee: 'Lexi',
    assigneeInitial: 'L',
    assigneeClass: '',
    badge: 'Needs attention' as const,
    badgeClass: 'badge-rose',
    accent: 'rose' as const,
  },
  {
    id: 'demo-full-2',
    title: 'Pick up dry cleaning before Saturday',
    meta: 'Due Mar 14',
    assignee: 'Lexi',
    assigneeInitial: 'L',
    assigneeClass: '',
    badge: 'Soon' as const,
    badgeClass: 'badge-peach',
    accent: 'peach' as const,
  },
  {
    id: 'demo-full-3',
    title: 'Renew car registration — expires end of month',
    meta: 'Due Mar 31',
    assignee: 'Christian',
    assigneeInitial: 'C',
    assigneeClass: 'rose-av',
    badge: 'Shared' as const,
    badgeClass: 'badge-violet',
    accent: 'mint' as const,
  },
  {
    id: 'demo-full-4',
    title: 'Buy birthday card for Jordan',
    meta: 'Before Mar 15',
    assignee: 'Lexi',
    assigneeInitial: 'L',
    assigneeClass: '',
    badge: null,
    badgeClass: null,
    accent: null,
  },
  {
    id: 'demo-full-5',
    title: 'Replace furnace filter',
    meta: 'Due ~Apr 4 · last changed Feb 4',
    assignee: 'Christian',
    assigneeInitial: 'C',
    assigneeClass: 'rose-av',
    badge: null,
    badgeClass: null,
    accent: null,
  },
];

export const DEMO_COMPLETED_TASKS = [
  { id: 'demo-done-1', title: 'Schedule HVAC annual service', meta: 'Completed Mar 10' },
  { id: 'demo-done-2', title: 'Pay property tax installment', meta: 'Completed Mar 7' },
];

/** Initial Olivia chat message. Pre-loaded with nudge context. */
export const DEMO_INITIAL_MESSAGE =
  "The plumber (Mike's Plumbing) hasn't responded to your quote request from 3 days ago. Want me to draft a follow-up?";

/** Rotational Olivia reply pool. */
export const OLIVIA_REPLIES = [
  "Let me look at what's coming up for you this week.",
  "Based on your household notes, here's what I found:",
  "I'll add that to your memory so you don't have to track it yourself.",
  "Noted — want me to set a reminder for this? I can nudge you at the right time.",
  "Give me a second to check your recent context.",
  "Here's what I found — let me know if you'd like to dig deeper.",
];

export const QUICK_CHIPS = [
  'What\'s this week?',
  'Home maintenance due',
  'What\'s Christian working on?',
  'What should I remember?',
];

