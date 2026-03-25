import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, ClockCounterClockwise, CalendarBlank, GearSix, CaretRight } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { loadInboxView } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';

interface MoreRowProps {
  to: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: number;
}

function MoreRow({ to, icon, iconBg, iconColor, title, subtitle, badge }: MoreRowProps) {
  return (
    <Link to={to} className="more-row">
      <span className="more-row-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </span>
      <span className="more-row-content">
        <span className="more-row-title">{title}</span>
        <span className="more-row-subtitle">{subtitle}</span>
      </span>
      {badge != null && badge > 0 && (
        <span className="more-row-badge" aria-label={`${badge > 9 ? '9+' : badge} pending tasks`}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="more-row-chevron" aria-hidden="true">
        <CaretRight size={16} />
      </span>
    </Link>
  );
}

export function MorePage() {
  const { user: currentUser } = useAuth();

  // Get open item count for badge
  const itemQuery = useQuery({
    queryKey: ['inbox-view', currentUser?.id, 'active'],
    queryFn: () => loadInboxView('active'),
  });
  const pendingCount = (itemQuery.data?.itemsByStatus.open.length ?? 0) + (itemQuery.data?.itemsByStatus.in_progress.length ?? 0);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '12px 16px 0' }}>
          <div className="screen-title">More</div>
          <div className="screen-sub" style={{ marginBottom: 24 }}>Everything else</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MoreRow
              to="/more/tasks"
              icon={<CheckSquare size={20} />}
              iconBg="var(--violet-dim)"
              iconColor="var(--violet)"
              title="Tasks"
              subtitle="Your task inbox"
              badge={pendingCount}
            />
            <MoreRow
              to="/more/history"
              icon={<ClockCounterClockwise size={20} />}
              iconBg="var(--lavender-soft)"
              iconColor="var(--violet-2)"
              title="Activity History"
              subtitle="What's happened recently"
            />
            <MoreRow
              to="/more/week"
              icon={<CalendarBlank size={20} />}
              iconBg="var(--sky-dim)"
              iconColor="var(--sky)"
              title="Week View"
              subtitle="Your week at a glance"
            />
            <MoreRow
              to="/more/settings"
              icon={<GearSix size={20} />}
              iconBg="var(--surface-2)"
              iconColor="var(--ink-2)"
              title="Settings"
              subtitle="Household & preferences"
            />
          </div>
        </div>

        <div className="spacer-bottom" />
      </div>

      <BottomNav activeTab="more" moreBadgeCount={pendingCount} />
    </div>
  );
}
