import { addDays, differenceInCalendarDays, isAfter, isBefore } from 'date-fns';
import { parseDate } from 'chrono-node';
import {
  draftItemSchema,
  historyEntrySchema,
  inboxItemSchema,
  itemFlagsSchema,
  type DraftItem,
  type HistoryEntry,
  type InboxItem,
  type ItemFlags,
  type ItemsByStatus,
  type Owner,
  type ParseConfidence,
  type Suggestion,
  type UpdateChange
} from '@olivia/contracts';

export const DEFAULT_STALE_THRESHOLD_DAYS = 14;
export const DEFAULT_DUE_SOON_DAYS = 7;

const createId = () => globalThis.crypto.randomUUID();

type ParseResult = {
  draft: DraftItem;
  ambiguities: string[];
  parseConfidence: ParseConfidence;
  parserSource: 'ai' | 'rules';
};

type ParseInput = {
  inputText?: string;
  structuredInput?: Partial<DraftItem> & {
    title?: string;
    owner?: Owner;
  };
  now?: Date;
};

type Thresholds = {
  staleThresholdDays?: number;
  dueSoonDays?: number;
};

type ApplyUpdateResult = {
  updatedItem: InboxItem;
  historyEntry: HistoryEntry;
};

const OWNER_PATTERNS: Array<[RegExp, Owner]> = [
  [/\bowner\s*[:=]?\s*(?:me|stakeholder)\b/i, 'stakeholder'],
  [/\bowner\s*[:=]?\s*spouse\b/i, 'spouse'],
  [/\bowner\s*[:=]?\s*unassigned\b/i, 'unassigned']
];

const STATUS_PATTERNS = [
  [/\bstatus\s*[:=]?\s*in[- ]?progress\b/i, 'in_progress'],
  [/\bstatus\s*[:=]?\s*open\b/i, 'open'],
  [/\bstatus\s*[:=]?\s*done\b/i, 'done'],
  [/\bstatus\s*[:=]?\s*deferred\b/i, 'deferred']
] as const;

const stripPrefix = (value: string) => value.replace(/^\s*(add|capture)\s*[:-]?\s*/i, '').trim();

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();

export function createDraft(input: ParseInput): ParseResult {
  const now = input.now ?? new Date();
  const structured = input.structuredInput;

  if (structured?.title) {
    const draft = draftItemSchema.parse({
      id: structured.id ?? createId(),
      title: structured.title.trim(),
      description: structured.description?.trim() || null,
      owner: structured.owner ?? 'unassigned',
      status: structured.status ?? 'open',
      dueText: structured.dueText?.trim() || null,
      dueAt: structured.dueAt ?? normalizeDueText(structured.dueText ?? null, now)
    });

    return {
      draft,
      ambiguities: [],
      parseConfidence: 'high',
      parserSource: 'rules'
    };
  }

  const rawInput = stripPrefix(input.inputText ?? '');
  let remaining = rawInput;
  let owner: Owner = 'unassigned';
  let status: InboxItem['status'] = 'open';
  let dueText: string | null = null;
  let dueAt: string | null = null;
  const ambiguities: string[] = [];

  for (const [pattern, parsedOwner] of OWNER_PATTERNS) {
    if (pattern.test(remaining)) {
      owner = parsedOwner;
      remaining = remaining.replace(pattern, '').trim();
      break;
    }
  }

  for (const [pattern, parsedStatus] of STATUS_PATTERNS) {
    if (pattern.test(remaining)) {
      status = parsedStatus;
      remaining = remaining.replace(pattern, '').trim();
      break;
    }
  }

  const dueMatch = remaining.match(/\bdue\s*[:=]?\s*([^,;]+)(?:[,;]|$)/i);
  if (dueMatch) {
    dueText = normalizeWhitespace(dueMatch[1]);
    dueAt = normalizeDueText(dueText, now);
    if (!dueAt) {
      ambiguities.push(`Could not confidently resolve due date from "${dueText}".`);
    }
    remaining = remaining.replace(dueMatch[0], '').trim();
  }

  const title = normalizeWhitespace(remaining.replace(/(^[,:;\s-]+|[,:;\s-]+$)/g, ''));
  if (!title) {
    ambiguities.push('Title needs confirmation.');
  }

  const draft = draftItemSchema.parse({
    id: structured?.id ?? createId(),
    title: title || 'Untitled household item',
    description: structured?.description?.trim() || null,
    owner,
    status,
    dueText,
    dueAt
  });

  const parseConfidence: ParseConfidence = ambiguities.length > 0 ? 'low' : dueText && !dueAt ? 'medium' : 'high';

  return {
    draft,
    ambiguities,
    parseConfidence,
    parserSource: 'rules'
  };
}

export function createInboxItem(draft: DraftItem, now: Date = new Date()): { item: InboxItem; historyEntry: HistoryEntry } {
  const timestamp = now.toISOString();
  const item = inboxItemSchema.parse({
    ...draft,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    lastStatusChangedAt: timestamp,
    lastNoteAt: null,
    archivedAt: null
  });

  const historyEntry = historyEntrySchema.parse({
    id: createId(),
    itemId: item.id,
    actorRole: 'stakeholder',
    eventType: 'created',
    fromValue: null,
    toValue: item,
    createdAt: timestamp
  });

  return { item, historyEntry };
}

export function applyUpdate(item: InboxItem, change: UpdateChange, now: Date = new Date()): ApplyUpdateResult {
  const nextTimestamp = now.toISOString();
  const requestedKeys = Object.entries(change).filter(([, value]) => value !== undefined);
  if (requestedKeys.length !== 1) {
    throw new Error('Exactly one change must be proposed at a time.');
  }

  const [field, rawValue] = requestedKeys[0];
  let updatedItem = { ...item, updatedAt: nextTimestamp, version: item.version + 1 };
  let historyEntry: HistoryEntry;

  switch (field) {
    case 'status': {
      const nextStatus = rawValue as InboxItem['status'];
      if (nextStatus === item.status) {
        throw new Error('Status is already set to the requested value.');
      }
      updatedItem = {
        ...updatedItem,
        status: nextStatus,
        lastStatusChangedAt: nextTimestamp
      };
      historyEntry = createHistoryEntry(item.id, 'status_changed', item.status, nextStatus, nextTimestamp);
      break;
    }
    case 'owner': {
      const nextOwner = rawValue as Owner;
      if (nextOwner === item.owner) {
        throw new Error('Owner is already set to the requested value.');
      }
      updatedItem = {
        ...updatedItem,
        owner: nextOwner
      };
      historyEntry = createHistoryEntry(item.id, 'owner_changed', item.owner, nextOwner, nextTimestamp);
      break;
    }
    case 'dueText':
    case 'dueAt': {
      const nextDueText = change.dueText ?? item.dueText;
      const nextDueAt = change.dueAt ?? normalizeDueText(nextDueText ?? null, now);
      updatedItem = {
        ...updatedItem,
        dueText: nextDueText ?? null,
        dueAt: nextDueAt ?? null
      };
      historyEntry = createHistoryEntry(item.id, 'due_changed', { dueText: item.dueText, dueAt: item.dueAt }, { dueText: updatedItem.dueText, dueAt: updatedItem.dueAt }, nextTimestamp);
      break;
    }
    case 'description': {
      const nextDescription = (rawValue as string | null) ?? null;
      updatedItem = {
        ...updatedItem,
        description: nextDescription
      };
      historyEntry = createHistoryEntry(item.id, 'description_changed', item.description, nextDescription, nextTimestamp);
      break;
    }
    case 'note': {
      const note = rawValue as string;
      const description = item.description ? `${item.description}
- ${note}` : note;
      updatedItem = {
        ...updatedItem,
        description,
        lastNoteAt: nextTimestamp
      };
      historyEntry = createHistoryEntry(item.id, 'note_added', null, note, nextTimestamp);
      break;
    }
    default:
      throw new Error('Unsupported change.');
  }

  return {
    updatedItem: inboxItemSchema.parse(updatedItem),
    historyEntry
  };
}

export function groupItems(items: InboxItem[]): ItemsByStatus {
  return {
    open: items.filter((item) => item.status === 'open'),
    in_progress: items.filter((item) => item.status === 'in_progress'),
    deferred: items.filter((item) => item.status === 'deferred'),
    done: items.filter((item) => item.status === 'done')
  };
}

export function computeFlags(item: InboxItem, now: Date = new Date(), thresholds: Thresholds = {}): ItemFlags {
  const staleThresholdDays = thresholds.staleThresholdDays ?? DEFAULT_STALE_THRESHOLD_DAYS;
  const dueSoonDays = thresholds.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;
  const active = item.status === 'open' || item.status === 'in_progress';
  const dueDate = item.dueAt ? new Date(item.dueAt) : null;
  const overdue = Boolean(active && dueDate && isBefore(dueDate, now));
  const dueSoon = Boolean(
    active &&
      dueDate &&
      !overdue &&
      (isAfter(dueDate, now) || dueDate.getTime() === now.getTime()) &&
      !isAfter(dueDate, addDays(now, dueSoonDays))
  );
  const stale = active && differenceInCalendarDays(now, new Date(item.lastStatusChangedAt)) >= staleThresholdDays;
  const unassigned = active && item.owner === 'unassigned';

  return itemFlagsSchema.parse({ overdue, stale, dueSoon, unassigned });
}

export function buildSuggestions(items: InboxItem[], now: Date = new Date(), thresholds: Thresholds = {}): Suggestion[] {
  const ranked: Suggestion[] = [];

  for (const item of items) {
    if (item.status !== 'open' && item.status !== 'in_progress') {
      continue;
    }

    const flags = computeFlags(item, now, thresholds);
    if (flags.overdue) {
      ranked.push({ type: 'overdue', itemId: item.id, title: item.title, message: `${item.title} is overdue. Review it now?` });
      continue;
    }
    if (flags.stale) {
      ranked.push({ type: 'stale', itemId: item.id, title: item.title, message: `${item.title} has been stale for 14+ days. Is it still active?` });
      continue;
    }
    if (flags.unassigned) {
      ranked.push({ type: 'unassigned', itemId: item.id, title: item.title, message: `${item.title} is unassigned. Would you like to pick an owner?` });
      continue;
    }
    if (flags.dueSoon) {
      ranked.push({ type: 'due_soon', itemId: item.id, title: item.title, message: `${item.title} is due within the next week.` });
    }
  }

  return ranked.slice(0, 2);
}

export function normalizeDueText(dueText: string | null, now: Date = new Date()): string | null {
  if (!dueText) {
    return null;
  }

  const parsed = parseDate(dueText, now, { forwardDate: true });
  return parsed ? parsed.toISOString() : null;
}

function createHistoryEntry(
  itemId: string,
  eventType: HistoryEntry['eventType'],
  fromValue: unknown,
  toValue: unknown,
  createdAt: string
): HistoryEntry {
  return historyEntrySchema.parse({
    id: createId(),
    itemId,
    actorRole: 'stakeholder',
    eventType,
    fromValue,
    toValue,
    createdAt
  });
}
