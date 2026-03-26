import { useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { getWeekBounds, formatWeekLabel } from '@olivia/domain';
import { loadWeeklyView } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import { useNudges } from './nudge-tray';
import { DaySection } from './home-page';

export function WeekPage() {
  const navigate = useNavigate();
  const { nudges } = useNudges();

  const { weekStart, weekEnd } = useMemo(() => getWeekBounds(new Date()), []);
  const weekStartString = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart, weekEnd), [weekStart, weekEnd]);

  const weeklyQuery = useQuery({
    queryKey: ['weekly-view', weekStartString],
    queryFn: () => loadWeeklyView(weekStartString)
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className="screen">
      <div className="home-header">
        <div className="home-header-row">
          <Link to="/more" className="week-back-btn" aria-label="Back to More">
            <CaretLeft size={20} />
          </Link>
          <div style={{ flex: 1 }}>
            <div className="wv-title">This week</div>
            <div className="greeting-sub">{weekLabel}</div>
          </div>
        </div>
      </div>

      <div className="screen-scroll">
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

        {/* Day sections — full 7-day grid with empty-state slots */}
        {weeklyQuery.data && (
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
                onEmptyRoutineClick={() => void navigate({ to: '/routines' })}
                onEmptyReminderClick={() => void navigate({ to: '/reminders' })}
              />
            ))}
          </div>
        )}

        <div className="weekly-view-footer">
          <Link to="/more/history" className="view-history-link">View history →</Link>
        </div>

        <div className="spacer-bottom" />
      </div>

      <BottomNav activeTab="more" nudgeBadgeCount={nudges.length} />
    </div>
  );
}
