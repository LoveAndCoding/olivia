import { addDays, addMonths, addWeeks, compareAsc, differenceInCalendarDays, isAfter, isBefore } from 'date-fns';
import { parse, parseDate } from 'chrono-node';
import {
  draftReminderSchema,
  draftItemSchema,
  historyEntrySchema,
  inboxItemSchema,
  itemFlagsSchema,
  reminderSchema,
  reminderTimelineEntrySchema,
  remindersByStateSchema,
  type DraftItem,
  type DraftReminder,
  type HistoryEntry,
  type InboxItem,
  type ItemFlags,
  type ItemsByStatus,
  type Owner,
  type ParseConfidence,
  type ParserSource,
  type RecurrenceCadence,
  type Reminder,
  type ReminderState,
  type ReminderTimelineEntry,
  type ReminderUpdateChange,
  type RemindersByState,
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
  parserSource: ParserSource;
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

export type ReminderParseResult = {
  draft: DraftReminder;
  ambiguities: string[];
  parseConfidence: ParseConfidence;
  parserSource: ParserSource;
};

export type ReminderParseInput = {
  inputText?: string;
  structuredInput?: Partial<DraftReminder> & {
    title?: string;
    owner?: Owner;
    note?: string | null;
    scheduledAt?: string;
    recurrenceCadence?: RecurrenceCadence;
    linkedInboxItemId?: string | null;
  };
  now?: Date;
};

export type ReminderMutationResult = {
  reminder: Reminder;
  timelineEntries: ReminderTimelineEntry[];
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

const REMINDER_RECURRENCE_PATTERNS: Array<[RegExp, RecurrenceCadence]> = [
  [/\b(?:repeat|repeats)\s+(?:every day|daily)\b/i, 'daily'],
  [/\b(?:repeat|repeats)\s+(?:every week|weekly)\b/i, 'weekly'],
  [/\b(?:repeat|repeats)\s+(?:every month|monthly)\b/i, 'monthly'],
  [/\b(?:every day|daily)\b/i, 'daily'],
  [/\b(?:every week|weekly)\b/i, 'weekly'],
  [/\b(?:every month|monthly)\b/i, 'monthly']
];

const REMINDER_LINK_PATTERN = /\blinked(?:\s+to)?\s+(?:item|inbox item)\s*[:=]?\s*([0-9a-f-]{36})\b/i;

const stripPrefix = (value: string) => value.replace(/^\s*(add|capture)\s*[:-]?\s*/i, '').trim();
const stripReminderPrefix = (value: string) => value.replace(/^\s*(?:remind me|set(?: a)? reminder|create(?: a)? reminder)\s*(?:to)?\s*[:-]?\s*/i, '').trim();

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

export function createReminderDraft(input: ReminderParseInput): ReminderParseResult {
  const now = input.now ?? new Date();
  const structured = input.structuredInput;

  if (structured?.title && structured.scheduledAt) {
    const draft = draftReminderSchema.parse({
      id: structured.id ?? createId(),
      title: structured.title.trim(),
      note: structured.note?.trim() || null,
      owner: structured.owner ?? 'unassigned',
      scheduledAt: structured.scheduledAt,
      recurrenceCadence: structured.recurrenceCadence ?? 'none',
      linkedInboxItemId: structured.linkedInboxItemId ?? null
    });

    return {
      draft,
      ambiguities: [],
      parseConfidence: 'high',
      parserSource: 'rules'
    };
  }

  let remaining = stripReminderPrefix(input.inputText ?? '');
  const ambiguities: string[] = [];
  let owner: Owner = structured?.owner ?? 'unassigned';
  let note = structured?.note?.trim() || null;
  let recurrenceCadence: RecurrenceCadence = structured?.recurrenceCadence ?? 'none';
  let linkedInboxItemId = structured?.linkedInboxItemId ?? null;

  for (const [pattern, parsedOwner] of OWNER_PATTERNS) {
    if (pattern.test(remaining)) {
      owner = parsedOwner;
      remaining = remaining.replace(pattern, '').trim();
      break;
    }
  }

  for (const [pattern, parsedCadence] of REMINDER_RECURRENCE_PATTERNS) {
    if (pattern.test(remaining)) {
      recurrenceCadence = parsedCadence;
      remaining = remaining.replace(pattern, '').trim();
      break;
    }
  }

  if (!note) {
    const noteMatch = remaining.match(/\bnote\s*[:=]?\s*([^,;]+(?:[,;].+)?)$/i);
    if (noteMatch) {
      note = normalizeWhitespace(noteMatch[1]);
      remaining = remaining.replace(noteMatch[0], '').trim();
    }
  }

  if (!linkedInboxItemId) {
    const linkedMatch = remaining.match(REMINDER_LINK_PATTERN);
    if (linkedMatch) {
      linkedInboxItemId = linkedMatch[1];
      remaining = remaining.replace(linkedMatch[0], '').trim();
    }
  }

  let scheduledAt = structured?.scheduledAt ?? null;
  if (!scheduledAt) {
    const parsedResults = parse(remaining, now, { forwardDate: true });
    const firstDate = parsedResults[0];
    if (firstDate) {
      scheduledAt = firstDate.start.date().toISOString();
      remaining = removeMatchByIndex(remaining, firstDate.index, firstDate.text.length);
    } else {
      scheduledAt = now.toISOString();
      ambiguities.push('Scheduled time needs confirmation.');
    }
  }

  const title = normalizeWhitespace(
    (structured?.title ?? remaining)
      .replace(/^\s*to\b[:\s-]*/i, '')
      .replace(/(^[,:;\s-]+|[,:;\s-]+$)/g, '')
  );

  if (!title) {
    ambiguities.push('Title needs confirmation.');
  }

  const draft = draftReminderSchema.parse({
    id: structured?.id ?? createId(),
    title: title || 'Untitled reminder',
    note,
    owner,
    scheduledAt,
    recurrenceCadence,
    linkedInboxItemId
  });

  return {
    draft,
    ambiguities,
    parseConfidence: ambiguities.length > 0 ? 'low' : 'high',
    parserSource: 'rules'
  };
}

export function computeReminderState(reminder: Reminder, now: Date = new Date()): ReminderState {
  if (reminder.cancelledAt) {
    return 'cancelled';
  }
  if (reminder.completedAt) {
    return 'completed';
  }

  if (reminder.snoozedUntil) {
    const snoozedUntil = new Date(reminder.snoozedUntil);
    if (now.getTime() < snoozedUntil.getTime()) {
      return 'snoozed';
    }

    return now.getTime() === snoozedUntil.getTime() ? 'due' : 'overdue';
  }

  const scheduledAt = new Date(reminder.scheduledAt);
  if (now.getTime() < scheduledAt.getTime()) {
    return 'upcoming';
  }

  return now.getTime() === scheduledAt.getTime() ? 'due' : 'overdue';
}

export function createReminder(draft: DraftReminder, now: Date = new Date()): ReminderMutationResult {
  const timestamp = now.toISOString();
  const reminder = normalizeReminder({
    ...draft,
    state: 'upcoming',
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1
  }, now);

  return {
    reminder,
    timelineEntries: [
      createReminderTimelineEntry(reminder.id, 'stakeholder', 'created', null, draft, timestamp)
    ]
  };
}

export function updateReminder(
  reminder: Reminder,
  change: ReminderUpdateChange,
  now: Date = new Date(),
  existingTimeline: ReminderTimelineEntry[] = []
): ReminderMutationResult {
  const requestedKeys = Object.entries(change).filter(([, value]) => value !== undefined);
  if (requestedKeys.length === 0) {
    throw new Error('At least one reminder change must be provided.');
  }
  if (reminder.completedAt || reminder.cancelledAt) {
    throw new Error('Completed or cancelled reminders cannot be edited.');
  }

  const refreshed = materializeMissedRecurringOccurrences(reminder, existingTimeline, now);
  const nextTimestamp = now.toISOString();
  const fromValue: Record<string, unknown> = {};
  const toValue: Record<string, unknown> = {};

  for (const [key, value] of requestedKeys) {
    fromValue[key] = refreshed.reminder[key as keyof Reminder] ?? null;
    toValue[key] = value ?? null;
  }

  const updatedReminder = normalizeReminder({
    ...refreshed.reminder,
    ...change,
    snoozedUntil: change.scheduledAt ? null : refreshed.reminder.snoozedUntil,
    updatedAt: nextTimestamp,
    version: refreshed.reminder.version + 1
  }, now);

  return {
    reminder: updatedReminder,
    timelineEntries: [
      ...refreshed.timelineEntries,
      createReminderTimelineEntry(reminder.id, 'stakeholder', 'rescheduled', fromValue, toValue, nextTimestamp)
    ]
  };
}

export function completeReminderOccurrence(
  reminder: Reminder,
  now: Date = new Date(),
  existingTimeline: ReminderTimelineEntry[] = []
): ReminderMutationResult {
  if (reminder.completedAt || reminder.cancelledAt) {
    throw new Error('Completed or cancelled reminders cannot be completed again.');
  }

  const refreshed = materializeMissedRecurringOccurrences(reminder, existingTimeline, now);
  const nextTimestamp = now.toISOString();
  const resolvedOccurrenceAt = resolveReminderOccurrenceAt(refreshed.reminder, now);
  const completionEntry = createReminderTimelineEntry(
    reminder.id,
    'stakeholder',
    'completed',
    { occurrenceAt: resolvedOccurrenceAt.toISOString() },
    { completedAt: nextTimestamp },
    nextTimestamp
  );

  if (refreshed.reminder.recurrenceCadence === 'none') {
    const completedReminder = normalizeReminder({
      ...refreshed.reminder,
      completedAt: nextTimestamp,
      snoozedUntil: null,
      updatedAt: nextTimestamp,
      version: refreshed.reminder.version + 1
    }, now);

    return {
      reminder: completedReminder,
      timelineEntries: [...refreshed.timelineEntries, completionEntry]
    };
  }

  const nextScheduledAt = scheduleNextOccurrence(resolvedOccurrenceAt, refreshed.reminder.recurrenceCadence);
  if (!nextScheduledAt) {
    throw new Error('Recurring reminders must produce a next occurrence.');
  }

  const advancedReminder = normalizeReminder({
    ...refreshed.reminder,
    scheduledAt: nextScheduledAt,
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: null,
    updatedAt: nextTimestamp,
    version: refreshed.reminder.version + 1
  }, now);

  return {
    reminder: advancedReminder,
    timelineEntries: [
      ...refreshed.timelineEntries,
      completionEntry,
      createReminderTimelineEntry(
        reminder.id,
        'system_rule',
        'recurrence_advanced',
        { scheduledAt: resolvedOccurrenceAt.toISOString() },
        { scheduledAt: nextScheduledAt, cadence: refreshed.reminder.recurrenceCadence },
        nextTimestamp
      )
    ]
  };
}

export function snoozeReminder(
  reminder: Reminder,
  snoozedUntil: string,
  now: Date = new Date(),
  existingTimeline: ReminderTimelineEntry[] = []
): ReminderMutationResult {
  if (reminder.completedAt || reminder.cancelledAt) {
    throw new Error('Completed or cancelled reminders cannot be snoozed.');
  }
  if (new Date(snoozedUntil).getTime() <= now.getTime()) {
    throw new Error('Snooze time must be in the future.');
  }

  const refreshed = materializeMissedRecurringOccurrences(reminder, existingTimeline, now);
  const nextTimestamp = now.toISOString();
  const updatedReminder = normalizeReminder({
    ...refreshed.reminder,
    snoozedUntil,
    updatedAt: nextTimestamp,
    version: refreshed.reminder.version + 1
  }, now);

  return {
    reminder: updatedReminder,
    timelineEntries: [
      ...refreshed.timelineEntries,
      createReminderTimelineEntry(
        reminder.id,
        'stakeholder',
        'snoozed',
        { snoozedUntil: refreshed.reminder.snoozedUntil, state: refreshed.reminder.state },
        { snoozedUntil },
        nextTimestamp
      )
    ]
  };
}

export function cancelReminder(
  reminder: Reminder,
  now: Date = new Date(),
  existingTimeline: ReminderTimelineEntry[] = []
): ReminderMutationResult {
  if (reminder.completedAt || reminder.cancelledAt) {
    throw new Error('Completed or cancelled reminders cannot be cancelled.');
  }

  const refreshed = materializeMissedRecurringOccurrences(reminder, existingTimeline, now);
  const nextTimestamp = now.toISOString();
  const cancelledReminder = normalizeReminder({
    ...refreshed.reminder,
    cancelledAt: nextTimestamp,
    snoozedUntil: null,
    updatedAt: nextTimestamp,
    version: refreshed.reminder.version + 1
  }, now);

  return {
    reminder: cancelledReminder,
    timelineEntries: [
      ...refreshed.timelineEntries,
      createReminderTimelineEntry(reminder.id, 'stakeholder', 'cancelled', null, { cancelledAt: nextTimestamp }, nextTimestamp)
    ]
  };
}

export function scheduleNextOccurrence(
  occurrenceAt: string | Date,
  cadence: RecurrenceCadence
): string | null {
  const occurrenceDate = typeof occurrenceAt === 'string' ? new Date(occurrenceAt) : occurrenceAt;

  switch (cadence) {
    case 'none':
      return null;
    case 'daily':
      return addDays(occurrenceDate, 1).toISOString();
    case 'weekly':
      return addWeeks(occurrenceDate, 1).toISOString();
    case 'monthly':
      return addMonths(occurrenceDate, 1).toISOString();
    default:
      return null;
  }
}

export function groupReminders(reminders: Reminder[], now: Date = new Date()): RemindersByState {
  const grouped: RemindersByState = {
    upcoming: [],
    due: [],
    overdue: [],
    snoozed: [],
    completed: [],
    cancelled: []
  };

  for (const reminder of reminders) {
    const normalized = normalizeReminder(reminder, now);
    grouped[normalized.state].push(normalized);
  }

  for (const state of Object.keys(grouped) as ReminderState[]) {
    grouped[state].sort((left, right) => compareReminders(left, right));
  }

  return remindersByStateSchema.parse(grouped);
}

export function rankRemindersForSurfacing(reminders: Reminder[], now: Date = new Date(), limit = 3): Reminder[] {
  return reminders
    .map((reminder) => normalizeReminder(reminder, now))
    .filter((reminder) => reminder.state !== 'completed' && reminder.state !== 'cancelled')
    .sort((left, right) => {
      const priorityDelta = reminderPriority(left.state) - reminderPriority(right.state);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return compareReminders(left, right);
    })
    .slice(0, limit);
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

function materializeMissedRecurringOccurrences(
  reminder: Reminder,
  existingTimeline: ReminderTimelineEntry[],
  now: Date
): ReminderMutationResult {
  const normalizedReminder = normalizeReminder(reminder, now);

  if (
    normalizedReminder.recurrenceCadence === 'none' ||
    normalizedReminder.completedAt ||
    normalizedReminder.cancelledAt
  ) {
    return { reminder: normalizedReminder, timelineEntries: [] };
  }

  const resolvedOccurrenceAt = resolveReminderOccurrenceAt(normalizedReminder, now);
  if (resolvedOccurrenceAt.getTime() <= new Date(normalizedReminder.scheduledAt).getTime()) {
    return { reminder: normalizedReminder, timelineEntries: [] };
  }

  const loggedOccurrences = new Set(
    existingTimeline
      .filter((entry) => entry.eventType === 'missed_occurrence_logged')
      .map((entry) => {
        const occurrenceAt = entry.metadata && typeof entry.metadata.occurrenceAt === 'string'
          ? entry.metadata.occurrenceAt
          : null;
        return occurrenceAt;
      })
      .filter((value): value is string => Boolean(value))
  );

  const timelineEntries: ReminderTimelineEntry[] = [];
  let cursor = scheduleNextOccurrence(normalizedReminder.scheduledAt, normalizedReminder.recurrenceCadence);

  while (cursor && new Date(cursor).getTime() < resolvedOccurrenceAt.getTime()) {
    if (!loggedOccurrences.has(cursor)) {
      timelineEntries.push(
        createReminderTimelineEntry(
          normalizedReminder.id,
          'system_rule',
          'missed_occurrence_logged',
          null,
          { occurrenceAt: cursor, cadence: normalizedReminder.recurrenceCadence },
          now.toISOString(),
          { occurrenceAt: cursor, cadence: normalizedReminder.recurrenceCadence }
        )
      );
    }

    cursor = scheduleNextOccurrence(cursor, normalizedReminder.recurrenceCadence);
  }

  return {
    reminder: normalizedReminder,
    timelineEntries
  };
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

function createReminderTimelineEntry(
  reminderId: string,
  actorRole: ReminderTimelineEntry['actorRole'],
  eventType: ReminderTimelineEntry['eventType'],
  fromValue: unknown,
  toValue: unknown,
  createdAt: string,
  metadata: Record<string, unknown> | null = null
): ReminderTimelineEntry {
  return reminderTimelineEntrySchema.parse({
    id: createId(),
    reminderId,
    actorRole,
    eventType,
    fromValue,
    toValue,
    metadata,
    createdAt
  });
}

function normalizeReminder(reminder: Reminder, now: Date): Reminder {
  return reminderSchema.parse({
    ...reminder,
    state: computeReminderState(reminder, now)
  });
}

function resolveReminderOccurrenceAt(reminder: Reminder, now: Date): Date {
  const scheduledAt = new Date(reminder.scheduledAt);
  if (reminder.recurrenceCadence === 'none' || now.getTime() <= scheduledAt.getTime()) {
    return scheduledAt;
  }

  let occurrence = scheduledAt;
  let guard = 0;

  while (guard < 1024) {
    const nextOccurrence = scheduleNextOccurrence(occurrence, reminder.recurrenceCadence);
    if (!nextOccurrence) {
      return occurrence;
    }

    const nextOccurrenceDate = new Date(nextOccurrence);
    if (nextOccurrenceDate.getTime() > now.getTime()) {
      return occurrence;
    }

    occurrence = nextOccurrenceDate;
    guard += 1;
  }

  throw new Error('Exceeded recurrence resolution guard while computing reminder occurrence.');
}

function compareReminders(left: Reminder, right: Reminder): number {
  const leftTime = reminderSortTimestamp(left);
  const rightTime = reminderSortTimestamp(right);
  const timeDelta = compareAsc(new Date(leftTime), new Date(rightTime));
  if (timeDelta !== 0) {
    return timeDelta;
  }

  return compareAsc(new Date(left.updatedAt), new Date(right.updatedAt));
}

function reminderSortTimestamp(reminder: Reminder): string {
  if (reminder.state === 'snoozed' && reminder.snoozedUntil) {
    return reminder.snoozedUntil;
  }
  if (reminder.state === 'completed' && reminder.completedAt) {
    return reminder.completedAt;
  }
  if (reminder.state === 'cancelled' && reminder.cancelledAt) {
    return reminder.cancelledAt;
  }

  return reminder.scheduledAt;
}

function reminderPriority(state: ReminderState): number {
  switch (state) {
    case 'overdue':
      return 0;
    case 'due':
      return 1;
    case 'upcoming':
      return 2;
    case 'snoozed':
      return 3;
    case 'completed':
      return 4;
    case 'cancelled':
      return 5;
    default:
      return 99;
  }
}

function removeMatchByIndex(value: string, index: number, length: number): string {
  return `${value.slice(0, index)} ${value.slice(index + length)}`.trim();
}
