import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type {
  ActivityHistoryItem,
  ActivityHistoryDay,
  WeeklyViewResponse,
} from '@olivia/contracts';
import { getReviewWindowsForOccurrence, formatReviewWindowAsDateStrings } from '@olivia/domain';
import { ArrowsClockwise, Bell, ForkKnife, Tray, Check } from '@phosphor-icons/react';
import { useRole } from '../lib/role';
import { loadRoutineDetail, loadActivityHistory, loadWeeklyView, submitRitualCompletion, loadRitualSummaries } from '../lib/sync';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatShortDate(isoDate: string): string {
  return format(new Date(isoDate + 'T00:00:00'), 'MMM d');
}

function formatDateRange(start: string, end: string): string {
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function itemIcon(type: ActivityHistoryItem['type']): ReactNode {
  switch (type) {
    case 'routine': return <ArrowsClockwise size={18} />;
    case 'reminder': return <Bell size={18} />;
    case 'meal': return <ForkKnife size={18} />;
    case 'inbox': return <Tray size={18} />;
    case 'listItem': return <Check size={18} />;
  }
}

function itemAccentColor(type: ActivityHistoryItem['type']): string {
  switch (type) {
    case 'routine': return 'var(--mint)';
    case 'reminder': return 'var(--peach)';
    case 'meal': return 'var(--rose)';
    case 'inbox': return 'var(--sky)';
    case 'listItem': return 'var(--violet)';
  }
}

function itemTitle(item: ActivityHistoryItem): string {
  switch (item.type) {
    case 'routine': return item.routineTitle;
    case 'reminder': return item.title;
    case 'meal': return item.name;
    case 'inbox': return item.title;
    case 'listItem': return item.body;
  }
}

function lastWeekItemMeta(item: ActivityHistoryItem): string {
  switch (item.type) {
    case 'routine':
      return `Completed · ${format(new Date(item.completedAt), 'EEE, MMM d')}`;
    case 'reminder':
      return `${item.resolution === 'completed' ? 'Completed' : 'Dismissed'} · ${format(new Date(item.resolvedAt), 'EEE, MMM d')}`;
    case 'meal':
      return `${item.planTitle} · ${format(new Date(item.date + 'T00:00:00'), 'MMM d')}`;
    case 'inbox':
      return `Closed · ${format(new Date(item.completedAt), 'EEE, MMM d')}`;
    case 'listItem':
      return `${item.listName} · ${format(new Date(item.checkedAt), 'EEE, MMM d')}`;
  }
}

function ReviewItemCard({ item, meta }: { item: ActivityHistoryItem; meta: string }) {
  const accent = itemAccentColor(item.type);
  const icon = itemIcon(item.type);
  const title = itemTitle(item);
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        borderLeft: `3px solid ${accent}`,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 52,
      }}
    >
      <span style={{ fontSize: 16, color: accent, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{meta}</span>
      </span>
    </div>
  );
}

// ─── Section group headers ────────────────────────────────────────────────────

function SectionGroup({ label, children, isFirst }: { label: string; children: React.ReactNode; isFirst: boolean }) {
  return (
    <div>
      {!isFirst && <div style={{ height: 1, background: 'var(--ink-4)', margin: '12px 0 0' }} />}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', padding: '12px 0 4px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

// ─── AI Draft Card ────────────────────────────────────────────────────────────

type DraftState =
  | { status: 'loading' }
  | { status: 'available'; text: string }
  | { status: 'accepted'; text: string }
  | { status: 'dismissed' }
  | { status: 'error' }
  | { status: 'offline' };

function DraftLoadingSkeleton({ stepLabel }: { stepLabel: string }) {
  return (
    <div
      style={{
        background: 'var(--lavender-soft)',
        border: '1.5px solid var(--lavender-mid)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 16px 12px',
        minHeight: 88,
      }}
    >
      <div style={{ opacity: 0.5, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--violet)', marginBottom: 10 }}>
        ✦ Drafted by Olivia
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ width: '90%' }, { width: '75%' }, { width: '40%' }].map((line, i) => (
          <div
            key={i}
            style={{
              width: line.width,
              height: 14,
              borderRadius: 8,
              background: 'var(--lavender-mid)',
              animation: 'shimmer 1.4s linear infinite',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8 }}>
        {stepLabel === 'Last week' ? 'Olivia is drafting your recap…' : 'Olivia is drafting your overview…'}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function DraftErrorCard() {
  return (
    <div
      style={{
        background: 'var(--lavender-soft)',
        border: '1.5px solid var(--lavender-mid)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 16px 12px',
        minHeight: 88,
      }}
    >
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--violet)', marginBottom: 10 }}>
        ✦ Drafted by Olivia
      </div>
      <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-2)' }}>
        Olivia couldn&apos;t generate a summary right now.
      </div>
    </div>
  );
}

function DraftAvailableCard({
  text,
  editText,
  isEditing,
  onEditChange,
  onEditFocus,
  onEditBlur,
}: {
  text: string;
  editText: string;
  isEditing: boolean;
  onEditChange: (v: string) => void;
  onEditFocus: () => void;
  onEditBlur: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--lavender-soft)',
        border: `1.5px solid ${isEditing ? 'var(--violet)' : 'var(--lavender-mid)'}`,
        borderRadius: 16,
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 16px 12px',
        minHeight: 88,
        animation: 'draftFadeIn 200ms ease forwards',
        transition: 'border-color 150ms ease',
      }}
    >
      <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--violet)', marginBottom: 10 }}>
        ✦ Drafted by Olivia
      </div>
      {isEditing ? (
        <textarea
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditBlur}
          autoFocus
          style={{
            width: '100%',
            minHeight: 100,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 400,
            color: 'var(--ink)',
            resize: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.6,
          }}
        />
      ) : (
        <div
          onClick={onEditFocus}
          style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink)', lineHeight: 1.6, cursor: 'text' }}
        >
          {editText || text}
        </div>
      )}
      {!isEditing && !editText && (
        <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 6 }}>
          Tap to edit
        </div>
      )}
      <style>{`
        @keyframes draftFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Step 1: Last week recap ──────────────────────────────────────────────────

function filterLastWeekItems(
  days: ActivityHistoryDay[],
  lastWeekStart: string,
  lastWeekEnd: string
): ActivityHistoryItem[] {
  const start = new Date(lastWeekStart + 'T00:00:00');
  const end = new Date(lastWeekEnd + 'T23:59:59');
  const items: ActivityHistoryItem[] = [];
  for (const day of days) {
    const dayDate = new Date(day.date + 'T00:00:00');
    if (dayDate >= start && dayDate <= end) {
      items.push(...day.items);
    }
  }
  return items;
}

type ItemsByType = {
  routines: ActivityHistoryItem[];
  reminders: ActivityHistoryItem[];
  meals: ActivityHistoryItem[];
  inbox: ActivityHistoryItem[];
  lists: ActivityHistoryItem[];
};

function groupByType(items: ActivityHistoryItem[]): ItemsByType {
  const g: ItemsByType = { routines: [], reminders: [], meals: [], inbox: [], lists: [] };
  for (const item of items) {
    if (item.type === 'routine') g.routines.push(item);
    else if (item.type === 'reminder') g.reminders.push(item);
    else if (item.type === 'meal') g.meals.push(item);
    else if (item.type === 'inbox') g.inbox.push(item);
    else if (item.type === 'listItem') g.lists.push(item);
  }
  return g;
}

function Step1Content({ days, lastWeekStart, lastWeekEnd }: {
  days: ActivityHistoryDay[];
  lastWeekStart: string;
  lastWeekEnd: string;
}) {
  const items = filterLastWeekItems(days, lastWeekStart, lastWeekEnd);
  const groups = groupByType(items);
  const isEmpty = items.length === 0;

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
        {formatDateRange(lastWeekStart, lastWeekEnd)}
      </div>

      {isEmpty ? (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 17, fontWeight: 300, color: 'var(--ink-2)' }}>
            Nothing recorded last week.
          </div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, color: 'var(--ink-3)', marginTop: 8, maxWidth: 260, margin: '8px auto 0' }}>
            This is your quiet week — the review is still worth completing.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {groups.routines.length > 0 && (
            <SectionGroup label="Routines" isFirst={true}>
              {groups.routines.map((item, i) => (
                <ReviewItemCard key={i} item={item} meta={lastWeekItemMeta(item)} />
              ))}
            </SectionGroup>
          )}
          {groups.reminders.length > 0 && (
            <SectionGroup label="Reminders" isFirst={groups.routines.length === 0}>
              {groups.reminders.map((item, i) => (
                <ReviewItemCard key={i} item={item} meta={lastWeekItemMeta(item)} />
              ))}
            </SectionGroup>
          )}
          {groups.meals.length > 0 && (
            <SectionGroup label="Meals" isFirst={groups.routines.length === 0 && groups.reminders.length === 0}>
              {groups.meals.map((item, i) => (
                <ReviewItemCard key={i} item={item} meta={lastWeekItemMeta(item)} />
              ))}
            </SectionGroup>
          )}
          {groups.inbox.length > 0 && (
            <SectionGroup label="Inbox" isFirst={groups.routines.length === 0 && groups.reminders.length === 0 && groups.meals.length === 0}>
              {groups.inbox.map((item, i) => (
                <ReviewItemCard key={i} item={item} meta={lastWeekItemMeta(item)} />
              ))}
            </SectionGroup>
          )}
          {groups.lists.length > 0 && (
            <SectionGroup
              label="Lists"
              isFirst={groups.routines.length === 0 && groups.reminders.length === 0 && groups.meals.length === 0 && groups.inbox.length === 0}
            >
              {groups.lists.map((item, i) => (
                <ReviewItemCard key={i} item={item} meta={lastWeekItemMeta(item)} />
              ))}
            </SectionGroup>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Coming week overview ────────────────────────────────────────────

type ComingWeekItemData = {
  type: 'routine' | 'reminder' | 'meal' | 'inbox';
  id: string;
  title: string;
  meta: string;
};

function flattenComingWeekItems(weeklyData: WeeklyViewResponse): {
  routines: ComingWeekItemData[];
  reminders: ComingWeekItemData[];
  meals: ComingWeekItemData[];
  inbox: ComingWeekItemData[];
} {
  const routines: ComingWeekItemData[] = [];
  const reminders: ComingWeekItemData[] = [];
  const meals: ComingWeekItemData[] = [];
  const inbox: ComingWeekItemData[] = [];

  for (const day of weeklyData.days) {
    const dayName = format(new Date(day.date + 'T00:00:00'), 'EEEE');

    for (const r of day.routines) {
      routines.push({ type: 'routine', id: r.routineId, title: r.routineTitle, meta: `Due ${dayName}` });
    }
    for (const rem of day.reminders) {
      reminders.push({
        type: 'reminder',
        id: rem.reminderId,
        title: rem.title,
        meta: `Scheduled ${format(new Date(rem.scheduledAt), 'EEE, h:mm aa')}`,
      });
    }
    for (const meal of day.meals) {
      meals.push({
        type: 'meal',
        id: meal.entryId,
        title: meal.name,
        meta: `${meal.planTitle} · Week of ${formatShortDate(weeklyData.weekStart)}`,
      });
    }
    for (const item of day.inboxItems) {
      inbox.push({
        type: 'inbox',
        id: item.itemId,
        title: item.title,
        meta: `Due ${format(new Date(item.dueAt), 'EEE, MMM d')}`,
      });
    }
  }

  // Deduplicate routines and meals by ID (they appear across days)
  const seen = new Set<string>();
  const dedup = (arr: ComingWeekItemData[]) => arr.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });

  return { routines: dedup(routines), reminders, meals: dedup(meals), inbox };
}

function ComingWeekItemCard({ data }: { data: ComingWeekItemData }) {
  const typeToHistType = (t: ComingWeekItemData['type']): ActivityHistoryItem['type'] => {
    if (t === 'routine') return 'routine';
    if (t === 'reminder') return 'reminder';
    if (t === 'meal') return 'meal';
    return 'inbox';
  };
  const histType = typeToHistType(data.type);
  const accent = itemAccentColor(histType);
  const icon = itemIcon(histType);

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        borderLeft: `3px solid ${accent}`,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 52,
      }}
    >
      <span style={{ fontSize: 16, color: accent, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{data.title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{data.meta}</span>
      </span>
    </div>
  );
}

function Step2Content({ weeklyData, currentWeekStart, currentWeekEnd }: {
  weeklyData: WeeklyViewResponse;
  currentWeekStart: string;
  currentWeekEnd: string;
}) {
  const { routines, reminders, meals, inbox } = flattenComingWeekItems(weeklyData);
  const isEmpty = routines.length === 0 && reminders.length === 0 && meals.length === 0 && inbox.length === 0;

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
        {formatDateRange(currentWeekStart, currentWeekEnd)}
      </div>

      {isEmpty ? (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 17, fontWeight: 300, color: 'var(--ink-2)' }}>
            Nothing scheduled this week.
          </div>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, color: 'var(--ink-3)', marginTop: 8, maxWidth: 260, margin: '8px auto 0' }}>
            A clear week ahead.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {routines.length > 0 && (
            <SectionGroup label="Routines" isFirst={true}>
              {routines.map((d) => <ComingWeekItemCard key={d.id} data={d} />)}
            </SectionGroup>
          )}
          {reminders.length > 0 && (
            <SectionGroup label="Reminders" isFirst={routines.length === 0}>
              {reminders.map((d) => <ComingWeekItemCard key={d.id} data={d} />)}
            </SectionGroup>
          )}
          {meals.length > 0 && (
            <SectionGroup label="Meals" isFirst={routines.length === 0 && reminders.length === 0}>
              {meals.map((d) => <ComingWeekItemCard key={d.id} data={d} />)}
            </SectionGroup>
          )}
          {inbox.length > 0 && (
            <SectionGroup label="Inbox" isFirst={routines.length === 0 && reminders.length === 0 && meals.length === 0}>
              {inbox.map((d) => <ComingWeekItemCard key={d.id} data={d} />)}
            </SectionGroup>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Carry-forward notes ─────────────────────────────────────────────

function Step3Content({ notes, onNotesChange }: {
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const charCount = notes.length;
  const showCounter = charCount > 1500;

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
          Notes, decisions, or items to carry forward
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Optional</span>
      </div>

      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Write anything worth remembering from this week's review..."
        maxLength={2000}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          minHeight: 160,
          background: 'var(--surface)',
          border: `1.5px solid ${focused ? 'var(--violet)' : 'var(--ink-3)'}`,
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 15,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          color: 'var(--ink)',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease',
        }}
      />

      {showCounter && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right', marginTop: 4 }}>
          {charCount} / 2000
        </div>
      )}
    </div>
  );
}

// ─── Review Flow Shell ────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: 'Last week',
  2: 'Coming week',
  3: 'Notes',
};

export function ReviewFlowPage() {
  const params = useParams({ from: '/routines/$routineId/review/$occurrenceId' });
  const { routineId, occurrenceId } = params;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useRole();

  const [step, setStep] = useState<Step>(1);
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // AI draft state per section
  const [recapDraftState, setRecapDraftState] = useState<DraftState>({ status: 'loading' });
  const [overviewDraftState, setOverviewDraftState] = useState<DraftState>({ status: 'loading' });

  // Inline edit state per section
  const [recapEditText, setRecapEditText] = useState('');
  const [overviewEditText, setOverviewEditText] = useState('');
  const [recapIsEditing, setRecapIsEditing] = useState(false);
  const [overviewIsEditing, setOverviewIsEditing] = useState(false);

  const routineQuery = useQuery({
    queryKey: ['routine-detail', routineId, role],
    queryFn: () => loadRoutineDetail(role, routineId),
  });

  const routine = routineQuery.data?.routine;

  // Compute review windows from routine's currentDueDate anchor
  const windows = routine
    ? (() => {
        const anchor = new Date(routine.currentDueDate!);
        const w = getReviewWindowsForOccurrence(anchor);
        return {
          lastWeek: formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }),
          currentWeek: formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }),
        };
      })()
    : null;

  const historyQuery = useQuery({
    queryKey: ['activityHistory'],
    queryFn: () => loadActivityHistory(),
    staleTime: 60_000,
    enabled: !!windows,
  });

  const weeklyQuery = useQuery({
    queryKey: ['weekly-view', windows?.currentWeek.start],
    queryFn: () => loadWeeklyView(windows!.currentWeek.start),
    staleTime: 60_000,
    enabled: !!windows,
  });

  // Initiate AI draft generation when routine is loaded
  useEffect(() => {
    if (!routine) return;

    // Offline: treat as offline state (no loading, no error card — just no draft)
    if (!navigator.onLine) {
      setRecapDraftState({ status: 'offline' });
      setOverviewDraftState({ status: 'offline' });
      return;
    }

    loadRitualSummaries(routineId, occurrenceId).then(({ recapDraft, overviewDraft }) => {
      setRecapDraftState(recapDraft
        ? { status: 'available', text: recapDraft }
        : { status: 'error' }
      );
      setOverviewDraftState(overviewDraft
        ? { status: 'available', text: overviewDraft }
        : { status: 'error' }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine?.id]);

  const handleClose = useCallback(() => {
    void navigate({ to: '/routines' });
  }, [navigate]);

  const handleNext = useCallback(() => {
    if (step < 3) setStep((s) => (s + 1) as Step);
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep((s) => (s - 1) as Step);
    else void navigate({ to: '/routines' });
  }, [step, navigate]);

  // Accept handlers
  const handleAcceptRecap = useCallback(() => {
    const text = recapEditText || (recapDraftState.status === 'available' ? recapDraftState.text : '');
    if (text) setRecapDraftState({ status: 'accepted', text });
  }, [recapEditText, recapDraftState]);

  const handleDismissRecap = useCallback(() => {
    setRecapDraftState({ status: 'dismissed' });
    setRecapIsEditing(false);
    setRecapEditText('');
  }, []);

  const handleAcceptOverview = useCallback(() => {
    const text = overviewEditText || (overviewDraftState.status === 'available' ? overviewDraftState.text : '');
    if (text) setOverviewDraftState({ status: 'accepted', text });
  }, [overviewEditText, overviewDraftState]);

  const handleDismissOverview = useCallback(() => {
    setOverviewDraftState({ status: 'dismissed' });
    setOverviewIsEditing(false);
    setOverviewEditText('');
  }, []);

  const handleComplete = useCallback(async () => {
    if (!routine || completing) return;
    setCompleting(true);
    setCompleteError(null);

    const acceptedRecapNarrative = recapDraftState.status === 'accepted' ? recapDraftState.text : null;
    const acceptedOverviewNarrative = overviewDraftState.status === 'accepted' ? overviewDraftState.text : null;

    try {
      await submitRitualCompletion(
        role, routineId, occurrenceId, routine.version,
        notes.trim() || null,
        acceptedRecapNarrative,
        acceptedOverviewNarrative
      );
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      await queryClient.invalidateQueries({ queryKey: ['routine-detail', role, routineId] });
      await queryClient.invalidateQueries({ queryKey: ['routine-index-active', role] });
      void navigate({ to: '/routines' });
    } catch {
      setCompleteError("Couldn't save your review. Try again.");
      setCompleting(false);
    }
  }, [routine, completing, role, routineId, occurrenceId, notes, recapDraftState, overviewDraftState, navigate, queryClient]);

  if (routineQuery.isLoading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading review…</div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--rose)', fontSize: 14 }}>Routine not found.</div>
      </div>
    );
  }

  const stepLabel = STEP_LABELS[step];
  const subtitle = windows
    ? step === 1
      ? `Step 1 of 3 — Last week · ${formatDateRange(windows.lastWeek.start, windows.lastWeek.end)}`
      : step === 2
        ? `Step 2 of 3 — Coming week · ${formatDateRange(windows.currentWeek.start, windows.currentWeek.end)}`
        : 'Step 3 of 3 — Notes'
    : `Step ${step} of 3 — ${stepLabel}`;

  // Footer state logic
  const recapDraftAvailable = recapDraftState.status === 'available';
  const overviewDraftAvailable = overviewDraftState.status === 'available';
  const recapLoading = recapDraftState.status === 'loading';
  const overviewLoading = overviewDraftState.status === 'loading';

  const footerShowsDraftControls = (step === 1 && recapDraftAvailable) || (step === 2 && overviewDraftAvailable);
  const footerDisabledContinue = (step === 1 && recapLoading) || (step === 2 && overviewLoading);

  return (
    <div
      className="screen"
      style={{ background: 'var(--bg)' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
        if (e.key === 'ArrowLeft') handleBack();
      }}
      tabIndex={-1}
    >
      {/* Header */}
      <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 20, color: 'var(--violet)', fontWeight: 400 }}>
            olivia
          </span>
          <button
            type="button"
            aria-label="Close review"
            onClick={handleClose}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--ink-2)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
            Weekly Household Review
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{subtitle}</div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 4, paddingBottom: 12 }}>
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? 'var(--violet)' : 'var(--ink-4)',
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Scroll content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 100px' }}>
        {step === 1 && (
          <>
            {/* Step label */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Last week recap
            </div>

            {/* AI Draft card (not shown in offline state) */}
            {recapDraftState.status === 'loading' && (
              <div style={{ marginBottom: 16 }}>
                <DraftLoadingSkeleton stepLabel="Last week" />
              </div>
            )}
            {recapDraftState.status === 'error' && (
              <div style={{ marginBottom: 16 }}>
                <DraftErrorCard />
              </div>
            )}
            {recapDraftState.status === 'available' && (
              <div style={{ marginBottom: 16 }}>
                <DraftAvailableCard
                  text={recapDraftState.text}
                  editText={recapEditText}
                  isEditing={recapIsEditing}
                  onEditChange={setRecapEditText}
                  onEditFocus={() => {
                    setRecapEditText(recapEditText || recapDraftState.text);
                    setRecapIsEditing(true);
                  }}
                  onEditBlur={() => setRecapIsEditing(false)}
                />
              </div>
            )}

            {/* Structured item list */}
            {historyQuery.data
              ? <Step1Content
                  days={historyQuery.data.days}
                  lastWeekStart={windows!.lastWeek.start}
                  lastWeekEnd={windows!.lastWeek.end}
                />
              : <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading last week…</div>
            }
          </>
        )}

        {step === 2 && (
          <>
            {/* Step label */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Coming week overview
            </div>

            {/* AI Draft card (not shown in offline state) */}
            {overviewDraftState.status === 'loading' && (
              <div style={{ marginBottom: 16 }}>
                <DraftLoadingSkeleton stepLabel="Coming week" />
              </div>
            )}
            {overviewDraftState.status === 'error' && (
              <div style={{ marginBottom: 16 }}>
                <DraftErrorCard />
              </div>
            )}
            {overviewDraftState.status === 'available' && (
              <div style={{ marginBottom: 16 }}>
                <DraftAvailableCard
                  text={overviewDraftState.text}
                  editText={overviewEditText}
                  isEditing={overviewIsEditing}
                  onEditChange={setOverviewEditText}
                  onEditFocus={() => {
                    setOverviewEditText(overviewEditText || overviewDraftState.text);
                    setOverviewIsEditing(true);
                  }}
                  onEditBlur={() => setOverviewIsEditing(false)}
                />
              </div>
            )}

            {/* Structured item list */}
            {weeklyQuery.data && windows
              ? <Step2Content
                  weeklyData={weeklyQuery.data}
                  currentWeekStart={windows.currentWeek.start}
                  currentWeekEnd={windows.currentWeek.end}
                />
              : <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading coming week…</div>
            }
          </>
        )}

        {step === 3 && (
          <Step3Content notes={notes} onNotesChange={setNotes} />
        )}
      </div>

      {/* Fixed footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px max(env(safe-area-inset-bottom, 0px), 16px)',
          background: 'var(--bg)',
          borderTop: '1px solid var(--ink-4)',
        }}
      >
        {completeError && (
          <div style={{ fontSize: 13, color: 'var(--rose)', textAlign: 'center', marginBottom: 8 }}>
            {completeError}
          </div>
        )}

        {step === 3 ? (
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={completing}
            style={{
              width: '100%',
              height: 56,
              background: 'var(--violet)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              cursor: completing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {completing ? 'Saving…' : 'Complete review'}
          </button>
        ) : footerShowsDraftControls ? (
          // Draft available: show Dismiss + Use this summary pair
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={step === 1 ? handleDismissRecap : handleDismissOverview}
              style={{
                flex: '0 0 auto',
                minWidth: 100,
                height: 48,
                background: 'transparent',
                color: 'var(--ink)',
                border: '1.5px solid var(--ink-4)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                cursor: 'pointer',
                padding: '0 12px',
              }}
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={step === 1 ? handleAcceptRecap : handleAcceptOverview}
              style={{
                flex: 1,
                minWidth: 160,
                height: 48,
                background: 'var(--violet)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                cursor: 'pointer',
                padding: '0 12px',
              }}
            >
              Use this summary →
            </button>
          </div>
        ) : (
          // Loading (disabled) or post-accept/dismiss/error/offline (active) Continue button
          <button
            type="button"
            onClick={handleNext}
            disabled={footerDisabledContinue}
            style={{
              width: '100%',
              height: 56,
              background: footerDisabledContinue ? 'transparent' : 'var(--violet)',
              color: footerDisabledContinue ? 'var(--ink-3)' : '#FFFFFF',
              border: footerDisabledContinue ? '1px solid var(--ink-4)' : 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              cursor: footerDisabledContinue ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}
