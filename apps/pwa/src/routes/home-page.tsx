import { useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { computeReminderState, rankRemindersForSurfacing } from '@olivia/domain';
import { getWeekBounds, formatWeekLabel, formatDayLabel } from '@olivia/domain';
import type { Reminder, DraftReminder, WeeklyDayView, WeeklyRoutineOccurrence, WeeklyReminder, WeeklyMealEntry, WeeklyInboxItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadWeeklyView, confirmCreateReminderCommand, snoozeReminderCommand, loadReminderView } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { NudgeTray, useNudges } from './nudge-tray';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { SpouseBanner } from '../components/lists/SpouseBanner';
import type { NudgeData } from '../types/display';

// ─── Status badge helpers ─────────────────────────────────────────────────────

type BadgeVariant = 'upcoming' | 'due' | 'due-today' | 'overdue' | 'done' | 'snoozed' | 'paused';

function StatusBadge({ variant }: { variant: BadgeVariant }) {
  const labels: Record<BadgeVariant, string> = {
    upcoming: 'UPCOMING',
    due: 'DUE',
    'due-today': 'DUE TODAY',
    overdue: 'OVERDUE',
    done: 'DONE',
    snoozed: 'SNOOZED',
    paused: 'PAUSED'
  };
  const variantClass: Record<BadgeVariant, string> = {
    upcoming: 'wv-badge wv-badge-upcoming',
    due: 'wv-badge wv-badge-due',
    'due-today': 'wv-badge wv-badge-due',
    overdue: 'wv-badge wv-badge-overdue',
    done: 'wv-badge wv-badge-done',
    snoozed: 'wv-badge wv-badge-snoozed',
    paused: 'wv-badge wv-badge-paused'
  };
  return <span className={variantClass[variant]}>{labels[variant]}</span>;
}

// ─── Item card ────────────────────────────────────────────────────────────────

interface WeekItemCardProps {
  icon: string;
  accentColor: 'mint' | 'peach' | 'rose' | 'sky';
  title: string;
  completed?: boolean;
  overdue?: boolean;
  statusBadge?: BadgeVariant;
  metadata?: string;
  onClick: () => void;
}

function WeekItemCard({ icon, accentColor, title, completed, overdue, statusBadge, metadata, onClick }: WeekItemCardProps) {
  const borderColor = overdue ? 'rose' : accentColor;
  return (
    <button
      type="button"
      className={`wv-item-card wv-item-card--${borderColor}`}
      onClick={onClick}
    >
      <span className={`wv-item-icon wv-item-icon--${borderColor}`}>{icon}</span>
      <span className="wv-item-body">
        <span className={`wv-item-title${completed ? ' wv-item-title--completed' : ''}`}>{title}</span>
        {metadata && <span className="wv-item-meta">{metadata}</span>}
      </span>
      {statusBadge && <StatusBadge variant={statusBadge} />}
    </button>
  );
}

// ─── Routine card ─────────────────────────────────────────────────────────────

function RoutineCard({ item, onClick }: { item: WeeklyRoutineOccurrence; onClick: () => void }) {
  const isOverdue = item.dueState === 'overdue';
  const isCompleted = item.completed;
  let badge: BadgeVariant | undefined;
  if (isCompleted) badge = 'done';
  else if (isOverdue) badge = 'overdue';
  else if (item.dueState === 'due') badge = 'due-today';
  else if (item.dueState === 'upcoming') badge = 'upcoming';
  return (
    <WeekItemCard
      icon="↻"
      accentColor="mint"
      title={item.routineTitle}
      completed={isCompleted}
      overdue={isOverdue}
      statusBadge={badge}
      metadata={item.recurrenceRule === 'every_n_days' && item.intervalDays ? `Every ${item.intervalDays} days` : item.recurrenceRule.charAt(0).toUpperCase() + item.recurrenceRule.slice(1)}
      onClick={onClick}
    />
  );
}

// ─── Reminder card ────────────────────────────────────────────────────────────

function ReminderCard({ item, onClick }: { item: WeeklyReminder; onClick: () => void }) {
  const isOverdue = item.dueState === 'overdue';
  const isCompleted = item.dueState === 'completed';
  let badge: BadgeVariant | undefined;
  if (isCompleted) badge = 'done';
  else if (isOverdue) badge = 'overdue';
  else if (item.dueState === 'due') badge = 'due-today';
  else if (item.dueState === 'snoozed') badge = 'snoozed';
  else badge = 'upcoming';
  return (
    <WeekItemCard
      icon="🔔"
      accentColor="peach"
      title={item.title}
      overdue={isOverdue}
      completed={isCompleted}
      statusBadge={badge}
      metadata={format(new Date(item.scheduledAt), 'h:mm a')}
      onClick={onClick}
    />
  );
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ item, onClick }: { item: WeeklyMealEntry; onClick: () => void }) {
  return (
    <WeekItemCard
      icon="◆"
      accentColor="rose"
      title={item.name}
      metadata={item.planTitle}
      onClick={onClick}
    />
  );
}

// ─── Inbox item card ──────────────────────────────────────────────────────────

function InboxItemCard({ item, onClick }: { item: WeeklyInboxItem; onClick: () => void }) {
  const isDone = item.status === 'done';
  return (
    <WeekItemCard
      icon="▷"
      accentColor="sky"
      title={item.title}
      completed={isDone}
      statusBadge={isDone ? 'done' : undefined}
      metadata={format(new Date(item.dueAt), 'h:mm a')}
      onClick={onClick}
    />
  );
}

// ─── Empty meal slot ──────────────────────────────────────────────────────────

function EmptyMealSlot({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="wv-empty-meal-slot" onClick={onClick}>
      <span className="wv-empty-meal-slot-icon">◆</span>
      <em className="wv-empty-meal-text">No meal planned yet — add in Meals →</em>
    </button>
  );
}

// ─── Day section ──────────────────────────────────────────────────────────────

interface DaySectionProps {
  day: WeeklyDayView;
  dayIndex: number;
  isToday: boolean;
  onRoutineClick: (routineId: string) => void;
  onReminderClick: (reminderId: string) => void;
  onMealClick: (planId: string) => void;
  onInboxClick: (itemId: string) => void;
  onEmptyMealClick: () => void;
}

function DaySection({ day, dayIndex, isToday, onRoutineClick, onReminderClick, onMealClick, onInboxClick, onEmptyMealClick }: DaySectionProps) {
  const date = new Date(day.date + 'T12:00:00');
  const dayLabel = formatDayLabel(date, isToday);
  const isEmpty = day.routines.length === 0 && day.reminders.length === 0 && day.meals.length === 0 && day.inboxItems.length === 0;
  const showMealsSection = day.meals.length > 0;

  return (
    <section
      className={`wv-day-section${isToday ? ' wv-day-section--today' : ''}`}
      id={isToday ? 'today-section' : undefined}
      aria-label={dayLabel}
    >
      <div className={`wv-day-header${isToday ? ' wv-day-header--today' : ''}`}>
        {isToday && <span className="wv-today-badge">TODAY</span>}
        <span className="wv-day-label">{isToday ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : dayLabel}</span>
      </div>

      {isEmpty ? (
        <div className="wv-empty-day">
          <em className="wv-empty-day-text">Nothing scheduled</em>
        </div>
      ) : (
        <div className="wv-day-content">
          {day.routines.length > 0 && (
            <div className="wv-workflow-section">
              <div className="wv-workflow-label">ROUTINES</div>
              {day.routines.map((r, i) => (
                <RoutineCard key={`${r.routineId}-${dayIndex}-${i}`} item={r} onClick={() => onRoutineClick(r.routineId)} />
              ))}
            </div>
          )}

          {day.reminders.length > 0 && (
            <div className="wv-workflow-section">
              <div className="wv-workflow-label">REMINDERS</div>
              {day.reminders.map((r) => (
                <ReminderCard key={r.reminderId} item={r} onClick={() => onReminderClick(r.reminderId)} />
              ))}
            </div>
          )}

          <div className="wv-workflow-section">
            <div className="wv-workflow-label">MEALS</div>
            {showMealsSection
              ? day.meals.map((m) => (
                  <MealCard key={m.entryId} item={m} onClick={() => onMealClick(m.planId)} />
                ))
              : <EmptyMealSlot onClick={onEmptyMealClick} />
            }
          </div>

          {day.inboxItems.length > 0 && (
            <div className="wv-workflow-section">
              <div className="wv-workflow-label">INBOX</div>
              {day.inboxItems.map((item) => (
                <InboxItemCard key={item.itemId} item={item} onClick={() => onInboxClick(item.itemId)} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<Reminder | null>(null);
  const [banner, setBanner] = useState<{ message: string; variant: 'mint' | 'sky' } | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const { nudges, dismiss: dismissNudge, removeNudge } = useNudges(role);

  const { weekStart, weekEnd } = useMemo(() => getWeekBounds(new Date()), []);
  const weekStartString = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart, weekEnd), [weekStart, weekEnd]);

  const weeklyQuery = useQuery({
    queryKey: ['weekly-view', weekStartString],
    queryFn: () => loadWeeklyView(weekStartString)
  });

  const reminderQuery = useQuery({
    queryKey: ['reminder-view', role],
    queryFn: () => loadReminderView(role)
  });

  // Scroll to today's section after initial data load
  useEffect(() => {
    if (weeklyQuery.data) {
      document.getElementById('today-section')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [weeklyQuery.data]);

  // Nudge card logic (inherited from MVP home screen)
  const { nudge, dueReminders } = useMemo(() => {
    if (!reminderQuery.data) {
      return { nudge: null as NudgeData | null, dueReminders: [] as Reminder[] };
    }
    const byState = reminderQuery.data.remindersByState;
    const now = new Date();
    const allActive: Reminder[] = [...byState.overdue, ...byState.due, ...byState.upcoming, ...byState.snoozed];
    const ranked = rankRemindersForSurfacing(allActive, now, 4);
    const surfaced = ranked.filter((r) => computeReminderState(r, now) !== 'snoozed').slice(0, 3);

    let nudgeData: NudgeData | null = null;
    const dueWithLinkedTask = byState.due.find((r) => r.linkedInboxItem && r.linkedInboxItem.status === 'open');
    if (dueWithLinkedTask) {
      nudgeData = {
        message: `"The plumber hasn't replied in 3 days. Want me to draft a follow-up for you?"`,
        primaryCta: '✍️ Yes, draft it',
        secondaryCta: 'Later'
      };
    } else if (byState.due.length > 0) {
      const firstDue = byState.due[0];
      nudgeData = {
        message: `You have a reminder due: "${firstDue.title}". Want to take care of it now?`,
        primaryCta: 'View reminder',
        secondaryCta: 'Later'
      };
    }

    return { nudge: nudgeData, surfacedReminders: surfaced, dueReminders: byState.due };
  }, [reminderQuery.data]);

  const todayStr = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

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

  const allEmpty = weeklyQuery.data?.days.every(
    (d) => d.routines.length === 0 && d.reminders.length === 0 && d.meals.length === 0 && d.inboxItems.length === 0
  ) ?? false;

  return (
    <div className="screen">
      {/* Sticky header */}
      <div className="home-header">
        <div className="home-header-row">
          <div className="wordmark">olivia</div>
          <div className="home-header-actions">
            <div className="avatar-stack" aria-label="Household members">
              <div className="av av-l" title="Lexi">L</div>
              <div className="av av-a" title="Christian">C</div>
            </div>
            <button
              type="button"
              className="settings-btn"
              aria-label="Settings"
              onClick={() => void navigate({ to: '/settings' })}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.2 10c0-.4 0-.8-.1-1.2l1.7-1.3a.4.4 0 0 0 .1-.5l-1.6-2.8a.4.4 0 0 0-.5-.2l-2 .8a6 6 0 0 0-1-.6L13.5 2a.4.4 0 0 0-.4-.3h-3.2a.4.4 0 0 0-.4.3l-.3 2.2a6 6 0 0 0-1 .6l-2-.8a.4.4 0 0 0-.5.2L4.1 6.9a.4.4 0 0 0 .1.5l1.7 1.3A6.4 6.4 0 0 0 5.8 10c0 .4 0 .8.1 1.2L4.2 12.5a.4.4 0 0 0-.1.5l1.6 2.8c.1.2.3.2.5.2l2-.8c.3.2.6.4 1 .6l.3 2.2c.1.2.2.3.4.3h3.2c.2 0 .4-.1.4-.3l.3-2.2c.4-.2.7-.4 1-.6l2 .8c.2.1.4 0 .5-.2l1.6-2.8a.4.4 0 0 0-.1-.5l-1.7-1.3c.1-.4.1-.8.1-1.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="wv-title">This week</div>
        <div className="greeting-sub">{weekLabel}</div>

        {role === 'spouse' && (
          <div style={{ marginTop: 12 }}>
            <SpouseBanner />
          </div>
        )}
      </div>

      <div className="screen-scroll" ref={scrollAreaRef}>
        {/* Proactive nudge tray */}
        <NudgeTray
          role={role}
          nudges={nudges}
          onDismiss={dismissNudge}
          onRemove={removeNudge}
        />

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

        {/* Loading state */}
        {weeklyQuery.isLoading && (
          <div className="wv-loading" aria-live="polite">
            <div className="wv-loading-bar" />
            <div className="wv-loading-bar wv-loading-bar--short" />
            <div className="wv-loading-bar" />
          </div>
        )}

        {/* Error state */}
        {weeklyQuery.isError && !weeklyQuery.isLoading && (
          <div className="wv-error" role="alert">
            <p>Unable to load weekly view.</p>
            <button
              type="button"
              className="wv-retry-btn"
              onClick={() => void weeklyQuery.refetch()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty week state (WEEK-2) */}
        {weeklyQuery.data && allEmpty && (
          <div className="wv-empty-week" role="status">
            <div className="wv-empty-week-icon" aria-hidden="true">📅</div>
            <p className="wv-empty-week-msg">
              Nothing on the books this week. Add a meal plan, set a reminder, or check the Household tab to get started.
            </p>
            <button
              type="button"
              className="wv-empty-week-cta"
              onClick={() => void navigate({ to: '/lists' })}
            >
              Go to Household →
            </button>
          </div>
        )}

        {/* Day sections */}
        {weeklyQuery.data && !allEmpty && (
          <div className="wv-days">
            {weeklyQuery.data.days.map((day, i) => (
              <DaySection
                key={day.date}
                day={day}
                dayIndex={i}
                isToday={day.date === todayStr}
                onRoutineClick={(routineId) => void navigate({ to: '/routines/$routineId', params: { routineId } })}
                onReminderClick={(reminderId) => void navigate({ to: '/reminders/$reminderId', params: { reminderId } })}
                onMealClick={(planId) => void navigate({ to: '/meals/$planId', params: { planId } })}
                onInboxClick={(itemId) => void navigate({ to: '/items/$itemId', params: { itemId } })}
                onEmptyMealClick={() => void navigate({ to: '/meals' })}
              />
            ))}
          </div>
        )}

        <div className="weekly-view-footer">
          <Link to="/history" className="view-history-link">View history →</Link>
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

      <BottomNav activeTab="home" nudgeBadgeCount={nudges.length} />
    </div>
  );
}
