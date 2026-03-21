import { useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ArrowsClockwise, Bell, ForkKnife, Tray, GearSix, Stethoscope } from '@phosphor-icons/react';
import { computeReminderState, rankRemindersForSurfacing } from '@olivia/domain';
import { getWeekBounds } from '@olivia/domain';
import type { Reminder, DraftReminder, WeeklyDayView, WeeklyRoutineOccurrence, WeeklyReminder, WeeklyMealEntry, WeeklyInboxItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadWeeklyView, confirmCreateReminderCommand, snoozeReminderCommand, loadReminderView } from '../lib/sync';
import { getDisplayName } from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';
import { NudgeTray, useNudges } from './nudge-tray';
import { CreateReminderSheet } from '../components/reminders/CreateReminderSheet';
import { SnoozeSheet } from '../components/reminders/SnoozeSheet';
import { ConfirmBanner } from '../components/reminders/ConfirmBanner';
import { SpouseBanner } from '../components/lists/SpouseBanner';
import type { NudgeData } from '../types/display';
import { fetchOnboardingState, startOnboarding, finishOnboarding, fetchHealthCheckState, dismissHealthCheck, type OnboardingState, type HealthCheckState } from '../lib/api';
import { getHealthCheckProgress } from '../lib/client-db';

// ─── Status badge helpers ─────────────────────────────────────────────────────

type BadgeVariant = 'upcoming' | 'due' | 'due-today' | 'overdue' | 'done' | 'snoozed' | 'paused';

function StatusBadge({ variant }: { variant: BadgeVariant }) {
  const labels: Record<BadgeVariant, string> = {
    upcoming: 'UPCOMING',
    due: 'DUE',
    'due-today': 'DUE TODAY',
    overdue: 'NEEDS ATTENTION',
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
  icon: ReactNode;
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
      icon={<ArrowsClockwise size={18} />}
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
      icon={<Bell size={18} />}
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
      icon={<ForkKnife size={18} />}
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
      icon={<Tray size={18} />}
      accentColor="sky"
      title={item.title}
      completed={isDone}
      statusBadge={isDone ? 'done' : undefined}
      metadata={format(new Date(item.dueAt), 'h:mm a')}
      onClick={onClick}
    />
  );
}

// ─── Empty slot components (preserved for /week route) ──────────────────────

export function EmptyRoutineSlot({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="wv-empty-routine-slot" onClick={onClick} aria-label="No routines today, browse all routines">
      <span className="wv-empty-routine-slot-icon"><ArrowsClockwise size={18} /></span>
      <em className="wv-empty-routine-text">No routines today — browse all →</em>
    </button>
  );
}

export function EmptyReminderSlot({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="wv-empty-reminder-slot" onClick={onClick} aria-label="No reminders today, browse all reminders">
      <span className="wv-empty-reminder-slot-icon"><Bell size={18} /></span>
      <em className="wv-empty-reminder-text">No reminders today — browse all →</em>
    </button>
  );
}

export function EmptyMealSlot({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="wv-empty-meal-slot" onClick={onClick}>
      <span className="wv-empty-meal-slot-icon"><ForkKnife size={18} /></span>
      <em className="wv-empty-meal-text">No meal planned yet — add in Meals →</em>
    </button>
  );
}

// ─── Day section (preserved for /week route) ────────────────────────────────

interface DaySectionProps {
  day: WeeklyDayView;
  dayIndex: number;
  isToday: boolean;
  onRoutineClick: (routineId: string) => void;
  onReminderClick: (reminderId: string) => void;
  onMealClick: (planId: string) => void;
  onInboxClick: (itemId: string) => void;
  onEmptyMealClick: () => void;
  onEmptyRoutineClick: () => void;
  onEmptyReminderClick: () => void;
}

export function DaySection({ day, dayIndex, isToday, onRoutineClick, onReminderClick, onMealClick, onInboxClick, onEmptyMealClick, onEmptyRoutineClick, onEmptyReminderClick }: DaySectionProps) {
  const date = new Date(day.date + 'T12:00:00');
  const dayLabel = format(date, 'EEE d');

  return (
    <section
      className={`wv-day-section${isToday ? ' wv-day-section--today' : ''}`}
      id={isToday ? 'today-section' : undefined}
      aria-label={isToday ? `Today, ${dayLabel}` : dayLabel}
    >
      <div className={`wv-day-header${isToday ? ' wv-day-header--today' : ''}`}>
        {isToday && <span className="wv-today-badge">TODAY</span>}
        <span className="wv-day-label">{isToday ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : dayLabel}</span>
      </div>

      <div className="wv-day-content">
        <div className="wv-workflow-section">
          <div className="wv-workflow-header">
            <div className="wv-workflow-label">ROUTINES</div>
            <Link to="/routines" className="wv-section-link" aria-label="View all routines">All →</Link>
          </div>
          {day.routines.length > 0
            ? day.routines.map((r, i) => (
                <RoutineCard key={`${r.routineId}-${dayIndex}-${i}`} item={r} onClick={() => onRoutineClick(r.routineId)} />
              ))
            : <EmptyRoutineSlot onClick={onEmptyRoutineClick} />
          }
        </div>

        <div className="wv-workflow-section">
          <div className="wv-workflow-header">
            <div className="wv-workflow-label">REMINDERS</div>
            <Link to="/reminders" className="wv-section-link" aria-label="View all reminders">All →</Link>
          </div>
          {day.reminders.length > 0
            ? day.reminders.map((r) => (
                <ReminderCard key={r.reminderId} item={r} onClick={() => onReminderClick(r.reminderId)} />
              ))
            : <EmptyReminderSlot onClick={onEmptyReminderClick} />
          }
        </div>

        <div className="wv-workflow-section">
          <div className="wv-workflow-header">
            <div className="wv-workflow-label">MEALS</div>
            <Link to="/meals" className="wv-section-link" aria-label="View all meals">All →</Link>
          </div>
          {day.meals.length > 0
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
    </section>
  );
}

// ─── Greeting logic ─────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good morning,';
  if (hour >= 12 && hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

// ─── Today workflow section (only renders if items exist) ───────────────────

interface TodayWorkflowSectionProps {
  label: string;
  linkTo: string;
  linkLabel: string;
  children: ReactNode;
}

function TodayWorkflowSection({ label, linkTo, linkLabel, children }: TodayWorkflowSectionProps) {
  return (
    <div className="wv-workflow-section">
      <div className="wv-workflow-header">
        <div className="wv-workflow-label">{label}</div>
        <Link to={linkTo} className="wv-section-link" aria-label={linkLabel}>All →</Link>
      </div>
      {children}
    </div>
  );
}

// ─── Empty today state (Olivia message) ─────────────────────────────────────

function EmptyTodayMessage() {
  return (
    <div className="home-empty-today">
      <div className="home-empty-today-eyebrow">OLIVIA</div>
      <p className="home-empty-today-msg">
        Nothing on the calendar today —{'\n'}
        a good day to check on your routines{'\n'}
        or plan the week ahead.
      </p>
      <div className="home-empty-today-actions">
        <Link to="/routines" className="home-empty-today-btn">Browse routines →</Link>
        <Link to="/reminders" className="home-empty-today-btn">Browse reminders →</Link>
        <Link to="/meals" className="home-empty-today-btn">Browse meals →</Link>
      </div>
    </div>
  );
}

// ─── Workflow nav row (persistent) ──────────────────────────────────────────

function WorkflowNavRow() {
  return (
    <nav className="home-workflow-nav" aria-label="Workflows">
      <Link to="/routines" className="home-workflow-pill">Routines</Link>
      <Link to="/reminders" className="home-workflow-pill">Reminders</Link>
      <Link to="/meals" className="home-workflow-pill">Meals</Link>
      <Link to="/lists" className="home-workflow-pill">Lists</Link>
    </nav>
  );
}

// ─── Upcoming preview ───────────────────────────────────────────────────────

interface UpcomingSummaryRow {
  date: string;
  dayLabel: string;
  summaryParts: string[];
}

function buildUpcomingSummary(days: WeeklyDayView[], todayStr: string): UpcomingSummaryRow[] {
  const rows: UpcomingSummaryRow[] = [];
  for (const day of days) {
    if (day.date <= todayStr) continue;
    const parts: string[] = [];
    if (day.routines.length > 0) parts.push(`${day.routines.length} routine${day.routines.length > 1 ? 's' : ''}`);
    if (day.reminders.length > 0) parts.push(`${day.reminders.length} reminder${day.reminders.length > 1 ? 's' : ''}`);
    if (day.meals.length > 0) parts.push(`${day.meals.length} meal${day.meals.length > 1 ? 's' : ''}`);
    if (day.inboxItems.length > 0) parts.push(`${day.inboxItems.length} inbox item${day.inboxItems.length > 1 ? 's' : ''}`);
    if (parts.length === 0) continue;
    const d = new Date(day.date + 'T12:00:00');
    rows.push({
      date: day.date,
      dayLabel: format(d, 'EEE d'),
      summaryParts: parts
    });
    if (rows.length >= 3) break;
  }
  return rows;
}

function UpcomingPreview({ days, todayStr }: { days: WeeklyDayView[]; todayStr: string }) {
  const rows = useMemo(() => buildUpcomingSummary(days, todayStr), [days, todayStr]);

  if (rows.length === 0) return null;

  return (
    <section className="home-upcoming" aria-label="Coming up">
      <div className="home-upcoming-label">COMING UP</div>
      <div className="home-upcoming-card">
        {rows.map((row, i) => (
          <div key={row.date}>
            <Link to="/week" className="home-upcoming-row">
              <span className="home-upcoming-day">{row.dayLabel}</span>
              <span className="home-upcoming-summary">
                {row.summaryParts.map((part, j) => (
                  <span key={j}>
                    {j > 0 && <span aria-hidden="true"> · </span>}
                    {part}
                  </span>
                ))}
              </span>
            </Link>
            {i < rows.length - 1 && <div className="home-upcoming-divider" />}
          </div>
        ))}
      </div>
      <Link to="/week" className="home-week-link">This week →</Link>
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

  // Onboarding state query
  const onboardingQuery = useQuery({
    queryKey: ['onboarding-state'],
    queryFn: fetchOnboardingState,
    retry: 1,
  });
  const onboardingState: OnboardingState | undefined = onboardingQuery.data;

  // Client-side first-launch detection: if the API is unreachable on a fresh
  // install, we still want to show the onboarding welcome card. The localStorage
  // flag is set after the user completes or skips onboarding. On a brand-new
  // Capacitor install there is no flag and no cached data, so the card appears.
  const isFirstLaunch = useMemo(() => !localStorage.getItem('olivia-onboarding-seen'), []);
  const showOnboardingFallback = isFirstLaunch && !onboardingState && (onboardingQuery.isError || onboardingQuery.failureCount > 0);

  const healthCheckQuery = useQuery({
    queryKey: ['health-check-state'],
    queryFn: fetchHealthCheckState,
  });
  const healthCheckState: HealthCheckState | undefined = healthCheckQuery.data;

  const [healthCheckRemainingCount, setHealthCheckRemainingCount] = useState<number | null>(null);
  // Check for partial progress on mount
  useState(() => {
    void getHealthCheckProgress().then((p) => {
      if (p && p.totalItems && p.reviewedItemIds.length > 0) {
        setHealthCheckRemainingCount(Math.max(0, p.totalItems - p.reviewedItemIds.length));
      }
    });
  });

  const { weekStart } = useMemo(() => getWeekBounds(new Date()), []);
  const weekStartString = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);

  const weeklyQuery = useQuery({
    queryKey: ['weekly-view', weekStartString],
    queryFn: () => loadWeeklyView(weekStartString)
  });

  const reminderQuery = useQuery({
    queryKey: ['reminder-view', role],
    queryFn: () => loadReminderView(role)
  });

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
        primaryCta: 'Yes, draft it',
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

  // Compute today's data
  const todayData = useMemo(() => {
    if (!weeklyQuery.data) return null;
    return weeklyQuery.data.days.find(d => d.date === todayStr) ?? null;
  }, [weeklyQuery.data, todayStr]);

  // Count today's items
  const todayItemCount = useMemo(() => {
    if (!todayData) return 0;
    return todayData.routines.length + todayData.reminders.length + todayData.meals.length + todayData.inboxItems.length;
  }, [todayData]);

  // Check if any upcoming days have content
  const hasUpcomingItems = useMemo(() => {
    if (!weeklyQuery.data) return false;
    return weeklyQuery.data.days.some(d => d.date > todayStr && (d.routines.length + d.reminders.length + d.meals.length + d.inboxItems.length) > 0);
  }, [weeklyQuery.data, todayStr]);

  // Subtitle text
  const subtitleText = useMemo(() => {
    const now = new Date();
    const dayName = format(now, 'EEEE');
    const dateStr = format(now, 'MMMM d');
    if (todayItemCount > 0) return `${dayName}, ${dateStr} · ${todayItemCount} thing${todayItemCount > 1 ? 's' : ''} today`;
    if (hasUpcomingItems) return `${dayName}, ${dateStr} · Nothing urgent — enjoy your day`;
    return `${dayName}, ${dateStr} · Your week looks clear`;
  }, [todayItemCount, hasUpcomingItems]);

  const displayName = useMemo(() => getDisplayName(role), [role]);
  const greeting = useMemo(() => getGreeting(), []);

  const handleCreateSave = useCallback(async (draft: DraftReminder) => {
    setShowCreateSheet(false);
    await confirmCreateReminderCommand(role, draft);
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
    setBanner({ message: 'Reminder created', variant: 'mint' });
    setTimeout(() => setBanner(null), 5000);
  }, [role, queryClient]);

  const handleSnoozeSelect = useCallback(async (isoString: string) => {
    if (!snoozeTarget) return;
    setSnoozeTarget(null);
    await snoozeReminderCommand(role, snoozeTarget.id, snoozeTarget.version, isoString);
    await queryClient.invalidateQueries({ queryKey: ['reminder-view'] });
    await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
    setBanner({ message: `Snoozed until ${new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, variant: 'sky' });
    setTimeout(() => setBanner(null), 5000);
  }, [snoozeTarget, role, queryClient]);

  // Max items per workflow section in Today
  const MAX_TODAY_ITEMS = 4;

  return (
    <div className="screen">
      {/* Sticky header — warm time-aware greeting */}
      <header className="home-header">
        <div className="home-header-row">
          <div className="wordmark" style={{ color: 'var(--violet-text)' }}>olivia</div>
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
              <GearSix size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="greeting">{greeting}</div>
        <div className="greeting"><em>{displayName}.</em></div>
        <div className="greeting-sub">{subtitleText}</div>

        {role === 'spouse' && (
          <div style={{ marginTop: 12 }}>
            <SpouseBanner />
          </div>
        )}
      </header>

      <div className="screen-scroll" ref={scrollAreaRef}>
        {/* Proactive nudge tray */}
        <NudgeTray
          role={role}
          nudges={nudges}
          onDismiss={dismissNudge}
          onRemove={removeNudge}
        />

        {/* Onboarding: Welcome Card (new user, no session yet) */}
        {/* Shows when API confirms needsOnboarding OR when API is unreachable on first launch */}
        {((onboardingState && onboardingState.needsOnboarding && !onboardingState.session) || showOnboardingFallback) && (
          <div className="onb-welcome-card" role="region" aria-label="Welcome to Olivia">
            <div className="nudge-deco nudge-deco-1" aria-hidden="true" />
            <div className="nudge-deco nudge-deco-2" aria-hidden="true" />
            <div className="nudge-deco nudge-deco-3" aria-hidden="true" />
            <div className="onb-welcome-eyebrow">{'\u2726'} OLIVIA</div>
            <div className="onb-welcome-headline">Let{'\u2019'}s get your household set up.</div>
            <div className="onb-welcome-body">It takes about 10 minutes {'\u2014'} just tell me what{'\u2019'}s on your plate and I{'\u2019'}ll organize it.</div>
            <button
              type="button"
              className="onb-welcome-btn-primary"
              onClick={async () => {
                try {
                  await startOnboarding();
                  void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
                  void navigate({ to: '/onboarding' });
                } catch {
                  // AI unavailable — navigate anyway, page will handle the error
                  void navigate({ to: '/onboarding' });
                }
              }}
            >
              Let{'\u2019'}s go {'\u2192'}
            </button>
            <button
              type="button"
              className="onb-welcome-skip"
              onClick={async () => {
                try {
                  await startOnboarding();
                  await finishOnboarding();
                } catch {
                  // API unreachable — just set the local flag
                }
                localStorage.setItem('olivia-onboarding-seen', 'true');
                void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Onboarding: Continue Setup Card (session started but not finished) */}
        {onboardingState?.session && onboardingState.session.status === 'started' && (
          <div className="onb-continue-card" role="region" aria-label="Continue setting up">
            <div className="onb-continue-eyebrow">{'\u2726'} Continue setting up</div>
            <div className="onb-continue-body">
              {onboardingState.session.topicsCompleted.length > 0
                ? `You\u2019ve set up ${onboardingState.session.topicsCompleted.join(' and ')}. Ready to keep going?`
                : `Whenever you\u2019re ready, I can help organize your household.`
              }
            </div>
            <div className="onb-continue-progress">
              {['tasks', 'routines', 'reminders', 'lists', 'meals'].map((topic) => (
                <div
                  key={topic}
                  className={`onb-continue-dot ${onboardingState.session!.topicsCompleted.includes(topic) ? 'onb-continue-dot-done' : ''}`}
                />
              ))}
              <span className="onb-continue-label">
                {onboardingState.session.topicsCompleted.length} of 5 topics covered
              </span>
            </div>
            <div className="onb-continue-actions">
              <button
                type="button"
                className="btn-primary onb-continue-btn"
                onClick={() => void navigate({ to: '/onboarding' })}
              >
                Continue {'\u2192'}
              </button>
              <button
                type="button"
                className="btn-secondary onb-continue-btn"
                onClick={async () => {
                  try {
                    await finishOnboarding();
                  } catch {
                    // ignore
                  }
                  localStorage.setItem('olivia-onboarding-seen', 'true');
                  void queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
                }}
              >
                I{'\u2019'}m good {'\u2713'}
              </button>
            </div>
          </div>
        )}

        {/* Health Check Card (data freshness — monthly prompt) */}
        {healthCheckState?.shouldShow && (
          <div className="health-check-card" role="region" aria-label="Monthly health check">
            <div className="health-check-card__header">
              <div className="health-check-card__icon">
                <Stethoscope size={18} weight="bold" />
              </div>
              <div className="health-check-card__title">Monthly check-up</div>
              <button
                type="button"
                className="health-check-card__dismiss"
                aria-label="Dismiss health check"
                onClick={async () => {
                  try {
                    await dismissHealthCheck();
                    void queryClient.invalidateQueries({ queryKey: ['health-check-state'] });
                  } catch {
                    // ignore
                  }
                }}
              >
                {'\u00D7'}
              </button>
            </div>
            <div className={`health-check-card__body${healthCheckRemainingCount != null && healthCheckRemainingCount > 0 ? ' health-check-card__body--progress' : ''}`}>
              {healthCheckRemainingCount != null && healthCheckRemainingCount > 0
                ? `${healthCheckRemainingCount} item${healthCheckRemainingCount === 1 ? '' : 's'} left to review`
                : `Want to make sure everything\u2019s still accurate?`
              }
            </div>
            <div className="health-check-card__actions">
              <button
                type="button"
                className="health-check-card__btn"
                onClick={() => void navigate({ to: '/health-check' })}
              >
                {healthCheckRemainingCount != null && healthCheckRemainingCount > 0 ? 'Continue' : 'Review now'} {'\u2192'}
              </button>
            </div>
          </div>
        )}

        {/* Olivia nudge card (hidden during onboarding) */}
        {nudge && !nudgeDismissed && !(onboardingState?.needsOnboarding || onboardingState?.session?.status === 'started') && (
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

        {/* ── Today Section (Hero Zone) ── */}
        {weeklyQuery.data && todayData && (
          <section className="home-today" aria-label="Today">
            <div className="home-today-header">
              <span className="home-today-badge">TODAY</span>
              <span className="home-today-date">{format(new Date(todayData.date + 'T12:00:00'), 'EEEE, MMMM d')}</span>
            </div>

            {todayItemCount > 0 ? (
              <div className="home-today-content">
                {/* Routines — only if items exist */}
                {todayData.routines.length > 0 && (
                  <TodayWorkflowSection label="ROUTINES" linkTo="/routines" linkLabel="View all routines">
                    {todayData.routines.slice(0, MAX_TODAY_ITEMS).map((r, i) => (
                      <RoutineCard key={`${r.routineId}-today-${i}`} item={r} onClick={() => void navigate({ to: '/routines/$routineId', params: { routineId: r.routineId } })} />
                    ))}
                    {todayData.routines.length > MAX_TODAY_ITEMS && (
                      <Link to="/routines" className="home-more-link">{todayData.routines.length - MAX_TODAY_ITEMS} more →</Link>
                    )}
                  </TodayWorkflowSection>
                )}

                {/* Reminders — only if items exist */}
                {todayData.reminders.length > 0 && (
                  <TodayWorkflowSection label="REMINDERS" linkTo="/reminders" linkLabel="View all reminders">
                    {todayData.reminders.slice(0, MAX_TODAY_ITEMS).map((r) => (
                      <ReminderCard key={r.reminderId} item={r} onClick={() => void navigate({ to: '/reminders/$reminderId', params: { reminderId: r.reminderId } })} />
                    ))}
                    {todayData.reminders.length > MAX_TODAY_ITEMS && (
                      <Link to="/reminders" className="home-more-link">{todayData.reminders.length - MAX_TODAY_ITEMS} more →</Link>
                    )}
                  </TodayWorkflowSection>
                )}

                {/* Meals — only if items exist */}
                {todayData.meals.length > 0 && (
                  <TodayWorkflowSection label="MEALS" linkTo="/meals" linkLabel="View all meals">
                    {todayData.meals.slice(0, MAX_TODAY_ITEMS).map((m) => (
                      <MealCard key={m.entryId} item={m} onClick={() => void navigate({ to: '/meals/$planId', params: { planId: m.planId } })} />
                    ))}
                    {todayData.meals.length > MAX_TODAY_ITEMS && (
                      <Link to="/meals" className="home-more-link">{todayData.meals.length - MAX_TODAY_ITEMS} more →</Link>
                    )}
                  </TodayWorkflowSection>
                )}

                {/* Inbox — only if items exist */}
                {todayData.inboxItems.length > 0 && (
                  <TodayWorkflowSection label="INBOX" linkTo="/tasks" linkLabel="View all inbox items">
                    {todayData.inboxItems.slice(0, MAX_TODAY_ITEMS).map((item) => (
                      <InboxItemCard key={item.itemId} item={item} onClick={() => void navigate({ to: '/items/$itemId', params: { itemId: item.itemId } })} />
                    ))}
                    {todayData.inboxItems.length > MAX_TODAY_ITEMS && (
                      <Link to="/tasks" className="home-more-link">{todayData.inboxItems.length - MAX_TODAY_ITEMS} more →</Link>
                    )}
                  </TodayWorkflowSection>
                )}
              </div>
            ) : (
              <EmptyTodayMessage />
            )}
          </section>
        )}

        {/* Empty data state (weeklyQuery loaded but no todayData — shouldn't happen but safeguard) */}
        {weeklyQuery.data && !todayData && (
          <section className="home-today" aria-label="Today">
            <EmptyTodayMessage />
          </section>
        )}

        {/* ── Workflow Nav Row ── */}
        <WorkflowNavRow />

        {/* ── Upcoming Preview ── */}
        {weeklyQuery.data && (
          <UpcomingPreview days={weeklyQuery.data.days} todayStr={todayStr} />
        )}

        {/* This week link (always visible even if no upcoming) */}
        {weeklyQuery.data && !hasUpcomingItems && (
          <div style={{ padding: '12px 22px' }}>
            <Link to="/week" className="home-week-link">This week →</Link>
          </div>
        )}

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
