import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { computeFlags, computeReminderState, computeRoutineDueState as computeRoutineDueStateHelper, rankRemindersForSurfacing } from '@olivia/domain';
import type { InboxItem, Reminder, DraftReminder } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadInboxView, loadReminderView, loadActiveRoutineIndex, confirmCreateReminderCommand, snoozeReminderCommand } from '../lib/sync';
import { getDisplayName, ownerToDisplay } from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';
import { ReminderRow } from '../components/reminders/ReminderRow';
import { AddReminderButton } from '../components/reminders/AddReminderButton';
import { OliviaMessage } from '../components/reminders/OliviaMessage';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import type { NudgeData, SummaryTask } from '../types/display';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function getDateSubtitle(needsCount: number, reminderDueCount: number): string {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const day = now.getDate();
  const totalUrgent = needsCount + reminderDueCount;

  let suffix: string;
  if (totalUrgent === 0) suffix = 'Nothing urgent today';
  else if (totalUrgent === 1) suffix = '1 thing needs you today';
  else suffix = `${totalUrgent} things need you today`;

  return `${dayName}, ${month} ${day} · ${suffix}`;
}

function inboxItemToSummary(item: InboxItem, userRole: string): SummaryTask {
  const flags = computeFlags(item);
  const isShared = item.owner === 'spouse' && userRole === 'stakeholder';
  const isStakeholderItem = item.owner === 'stakeholder' && userRole === 'spouse';

  let badge = '';
  let badgeClass = '';
  let accent: SummaryTask['accent'] = null;

  if (flags.overdue) {
    badge = 'Overdue'; badgeClass = 'badge-rose'; accent = 'rose';
  } else if (flags.dueSoon) {
    badge = 'Soon'; badgeClass = 'badge-peach'; accent = 'peach';
  } else if (isShared || isStakeholderItem) {
    badge = 'Shared'; badgeClass = 'badge-violet'; accent = 'mint';
  }

  let meta = '';
  if (item.dueText) {
    const ownerName = item.owner !== userRole ? ` · ${ownerToDisplay(item.owner)}` : '';
    meta = `${item.dueText}${ownerName}`;
  } else if (flags.stale) {
    meta = 'Added a while ago · no reply';
  } else {
    meta = item.owner !== 'unassigned' ? ownerToDisplay(item.owner) : 'Open';
  }

  return { id: item.id, title: item.title, meta, badge, badgeClass, accent };
}

export function HomePage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<Reminder | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'active'],
    queryFn: () => loadInboxView(role, 'active'),
  });

  const reminderQuery = useQuery({
    queryKey: ['reminder-view', role],
    queryFn: () => loadReminderView(role),
  });

  const routineQuery = useQuery({
    queryKey: ['routine-index-active', role],
    queryFn: () => loadActiveRoutineIndex(role),
  });

  const { summaryTasks, needsCount } = useMemo(() => {
    const allOpen = inboxQuery.data
      ? [...inboxQuery.data.itemsByStatus.open, ...inboxQuery.data.itemsByStatus.in_progress]
      : [];

    if (allOpen.length === 0) return { summaryTasks: [], needsCount: 0 };

    const sorted = [...allOpen].sort((a, b) => {
      const fa = computeFlags(a);
      const fb = computeFlags(b);
      if (fa.overdue && !fb.overdue) return -1;
      if (!fa.overdue && fb.overdue) return 1;
      if (fa.dueSoon && !fb.dueSoon) return -1;
      if (!fa.dueSoon && fb.dueSoon) return 1;
      return 0;
    });

    const top3 = sorted.slice(0, 3).map((item) => inboxItemToSummary(item, role));
    const count = allOpen.filter((item) => {
      const f = computeFlags(item);
      return f.overdue || f.dueSoon;
    }).length;

    return { summaryTasks: top3, needsCount: count };
  }, [inboxQuery.data, role]);

  const { surfacedReminders, totalReminders, snoozedCount, dueReminders, overdueReminders, nudge } = useMemo(() => {
    if (!reminderQuery.data) {
      return { surfacedReminders: [], totalReminders: 0, snoozedCount: 0, dueReminders: [], overdueReminders: [], nudge: null as NudgeData | null };
    }

    const byState = reminderQuery.data.remindersByState;
    const allActive: Reminder[] = [
      ...byState.overdue,
      ...byState.due,
      ...byState.upcoming,
      ...byState.snoozed,
    ];

    const now = new Date();
    const ranked = rankRemindersForSurfacing(allActive, now, 4);
    const activeNonSnoozed = ranked.filter((r) => computeReminderState(r, now) !== 'snoozed').slice(0, 3);
    const snoozed = ranked.filter((r) => computeReminderState(r, now) === 'snoozed').slice(0, 1);
    const surfaced = [...activeNonSnoozed, ...snoozed];

    let nudgeData: NudgeData | null = null;
    const dueWithLinkedTask = byState.due.find((r) => r.linkedInboxItem && r.linkedInboxItem.status === 'open');
    if (dueWithLinkedTask) {
      nudgeData = {
        message: `"The plumber hasn't replied in 3 days. Want me to draft a follow-up for you?"`,
        primaryCta: '✍️ Yes, draft it',
        secondaryCta: 'Later',
      };
    } else if (byState.due.length > 0) {
      const firstDue = byState.due[0];
      nudgeData = {
        message: `You have a reminder due: "${firstDue.title}". Want to take care of it now?`,
        primaryCta: 'View reminder',
        secondaryCta: 'Later',
      };
    }

    return {
      surfacedReminders: surfaced,
      totalReminders: allActive.length,
      snoozedCount: byState.snoozed.length,
      dueReminders: byState.due,
      overdueReminders: byState.overdue,
      nudge: nudgeData,
    };
  }, [reminderQuery.data]);

  const subtitle = getDateSubtitle(needsCount, dueReminders.length + overdueReminders.length);

  const allRemindersLabel = totalReminders > surfacedReminders.length
    ? `All (${totalReminders}) →`
    : 'All →';

  const reminderSectionSubtext = useMemo(() => {
    if (totalReminders === 0) return '0 active';
    const parts: string[] = [];
    const active = totalReminders - snoozedCount;
    if (active > 0) parts.push(`${active} active`);
    if (snoozedCount > 0) parts.push(`${snoozedCount} snoozed`);
    return parts.join(' · ');
  }, [totalReminders, snoozedCount]);

  const handleCreateSave = useCallback(async (draft: DraftReminder) => {
    setShowCreateSheet(false);
    await confirmCreateReminderCommand(role, draft);
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
    setBanner({ message: '✓ Reminder created', variant: 'mint' });
    setTimeout(() => setBanner(null), 5000);
  }, [role, queryClient]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!snoozeTarget) return;
    setSnoozeTarget(null);
    await snoozeReminderCommand(role, snoozeTarget.id, snoozeTarget.version, isoString);
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
    setBanner({ message: `😴 Snoozed until ${new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, variant: 'sky' });
    setTimeout(() => setBanner(null), 5000);
  }, [snoozeTarget, role, queryClient]);

  const routineDueCounts = useMemo(() => {
    if (!routineQuery.data) return { overdue: 0, due: 0, total: 0 };
    const now = new Date();
    let overdue = 0, due = 0;
    for (const r of routineQuery.data.routines) {
      const state = r.dueState ?? computeRoutineDueStateHelper(r, null, now);
      if (state === 'overdue') overdue++;
      else if (state === 'due') due++;
    }
    return { overdue, due, total: routineQuery.data.routines.length };
  }, [routineQuery.data]);

  const isLoading = inboxQuery.isLoading || reminderQuery.isLoading;
  const hasError = inboxQuery.isError || reminderQuery.isError;
  const errorMessage = inboxQuery.isError
    ? (inboxQuery.error as Error).message
    : reminderQuery.isError ? (reminderQuery.error as Error).message : null;

  return (
    <div className="screen">
      <div className="screen-scroll">
        {/* Header */}
        <div className="home-header">
          <div className="home-header-row">
            <div className="wordmark">olivia</div>
            <div className="avatar-stack" aria-label="Household members">
              <div className="av av-l" title="Lexi">L</div>
              <div className="av av-a" title="Christian">C</div>
            </div>
          </div>
          <div className="greeting">
            {getGreeting()}
            <br />
            <em>{getDisplayName(role)}.</em>
          </div>
          <div className="greeting-sub">{subtitle}</div>
        </div>

        {/* Olivia nudge card */}
        {nudge && !nudgeDismissed && (
          <div
            className="nudge"
            role="region"
            aria-label="Olivia's suggestion"
            onClick={() => dueReminders.length > 0 && void navigate({ to: '/reminders/$reminderId', params: { reminderId: dueReminders[0].id } })}
          >
            <div className="nudge-deco nudge-deco-1" aria-hidden="true" />
            <div className="nudge-deco nudge-deco-2" aria-hidden="true" />
            <div className="nudge-deco nudge-deco-3" aria-hidden="true" />
            <div className="nudge-eyebrow">
              <div className="nudge-dot" aria-hidden="true" />
              Olivia noticed
            </div>
            <div className="nudge-msg">{nudge.message}</div>
            <div className="nudge-actions">
              <button
                type="button"
                className="nudge-btn nudge-btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (dueReminders.length > 0) void navigate({ to: '/reminders/$reminderId', params: { reminderId: dueReminders[0].id } });
                }}
              >
                {nudge.primaryCta}
              </button>
              <button
                type="button"
                className="nudge-btn nudge-btn-secondary"
                onClick={(e) => { e.stopPropagation(); setNudgeDismissed(true); }}
              >
                {nudge.secondaryCta}
              </button>
            </div>
          </div>
        )}

        {/* Needs doing */}
        <div className="section-head">
          <div className="section-title">Needs doing</div>
          <button type="button" className="section-link" onClick={() => void navigate({ to: '/tasks' })}>
            All tasks →
          </button>
        </div>

        {isLoading && (
          <div style={{ padding: '16px 22px', color: 'var(--ink-3)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {hasError && !isLoading && (
          <div style={{ padding: '16px 22px', color: 'var(--rose)', fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {!isLoading && !hasError && summaryTasks.length === 0 && (
          <div className="empty-state">
            <p>Nothing needs doing right now — nice work.</p>
          </div>
        )}

        {summaryTasks.length > 0 && (
          <div className="tasks-summary">
            {summaryTasks.map((task) => (
              <div
                key={task.id}
                className={`task${task.accent ? ` ${task.accent}` : ''}`}
                onClick={() => void navigate({ to: '/items/$itemId', params: { itemId: task.id } })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && void navigate({ to: '/items/$itemId', params: { itemId: task.id } })}
              >
                <div
                  className="task-checkbox"
                  role="checkbox"
                  aria-checked="false"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  tabIndex={-1}
                  aria-label={`Mark "${task.title}" complete`}
                />
                <div className="task-info">
                  <div className="task-name">{task.title}</div>
                  <div className="task-meta">{task.meta}</div>
                </div>
                {task.badge && (
                  <div className={`badge ${task.badgeClass}`}>{task.badge}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="divider" />

        {/* Reminders section */}
        <div className="section-head">
          <div className="section-title">Reminders</div>
          <button type="button" className="section-link" onClick={() => void navigate({ to: '/reminders' })}>
            {allRemindersLabel}
          </button>
        </div>
        <div className="greeting-sub" style={{ padding: '0 22px', marginBottom: 12 }}>
          {reminderSectionSubtext}
        </div>

        <div className="home-reminders">
          {!isLoading && surfacedReminders.length === 0 && (
            <>
              <OliviaMessage
                text="No reminders yet. Say something like 'Remind me Friday to check on the quote.'"
              />
              <AddReminderButton
                label="Add a reminder…"
                icon="🔔"
                onClick={() => setShowCreateSheet(true)}
              />
            </>
          )}

          {surfacedReminders.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              onClick={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: reminder.id } })}
            />
          ))}

          {surfacedReminders.length > 0 && (
            <AddReminderButton
              label="Add a reminder…"
              icon="🔔"
              onClick={() => setShowCreateSheet(true)}
            />
          )}
        </div>

        <div className="divider" />

        {/* Routines section */}
        <div className="section-head">
          <div className="section-title">Routines</div>
          <button type="button" className="section-link" onClick={() => void navigate({ to: '/routines' })}>
            {routineQuery.data ? `All (${routineQuery.data.routines.length}) →` : 'All →'}
          </button>
        </div>
        <div className="greeting-sub" style={{ padding: '0 22px', marginBottom: 12 }}>
          {routineQuery.isLoading
            ? 'Loading…'
            : routineDueCounts.total === 0
              ? '0 active'
              : `${routineDueCounts.total} active${routineDueCounts.overdue > 0 ? ` · ${routineDueCounts.overdue} overdue` : routineDueCounts.due > 0 ? ` · ${routineDueCounts.due} due today` : ''}`
          }
        </div>

        <div className="spacer-bottom" />
      </div>

      {banner && <ConfirmBanner message={banner.message} variant={banner.variant} />}

      <CreateReminderSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSave={handleCreateSave}
      />

      <SnoozeSheet
        open={!!snoozeTarget}
        onClose={() => setSnoozeTarget(null)}
        onSelectTime={handleSnoozeSelect}
      />

      <BottomNav activeTab="home" />
    </div>
  );
}
