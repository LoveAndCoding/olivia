/**
 * Pure display types used by view components and Storybook stories.
 * These represent already-transformed, ready-to-render data — no domain logic.
 */

export type AccentColor = 'rose' | 'peach' | 'mint';

export type NudgeData = {
  message: string;
  primaryCta: string;
  secondaryCta: string;
};

export type SummaryTask = {
  id: string;
  title: string;
  meta: string;
  badge: string;
  badgeClass: string;
  accent: AccentColor | null;
};

export type EventItem = {
  dateNum: string;
  dateMon: string;
  name: string;
  time: string;
};

export type FullTask = {
  id: string;
  title: string;
  dueText: string | null;
  accent: AccentColor | '';
  badge: { label: string; cls: string } | null;
  assignee: { initial: string; name: string; cls: string } | null;
  pendingSync?: boolean;
};

export type CompletedTask = {
  id: string;
  title: string;
  meta?: string;
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

export type ChatToolCall = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'dismissed';
};

export type ChatMessage = {
  id: string;
  role: 'olivia' | 'user';
  text: string;
  toolCalls?: ChatToolCall[] | null;
  isStreaming?: boolean;
  isError?: boolean;
  showDraftCard?: boolean;
};

export type QuickChip = string;

export type AddTaskPreview = {
  title: string;
  ownerDisplay: string;
  dueText: string | null;
  draftId: string;
};
