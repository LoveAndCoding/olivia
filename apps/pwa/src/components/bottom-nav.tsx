import { Link } from '@tanstack/react-router';
import { House, CalendarCheck, Sparkle, ListChecks, DotsThree } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export type NavTab = 'home' | 'daily' | 'olivia' | 'lists' | 'more';

const NAV_ITEMS: Array<{ tab: NavTab; to: string; icon: Icon; label: string }> = [
  { tab: 'home',   to: '/',       icon: House,         label: 'Home'   },
  { tab: 'daily',  to: '/daily',  icon: CalendarCheck,  label: 'Daily'  },
  { tab: 'olivia', to: '/olivia', icon: Sparkle,        label: 'Olivia' },
  { tab: 'lists',  to: '/lists',  icon: ListChecks,     label: 'Lists'  },
  { tab: 'more',   to: '/more',   icon: DotsThree,      label: 'More'   },
];

export function BottomNav({ activeTab, nudgeBadgeCount = 0, moreBadgeCount = 0 }: { activeTab: NavTab; nudgeBadgeCount?: number; moreBadgeCount?: number }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ tab, to, icon: IconComponent, label }) => {
        const isActive = activeTab === tab;
        return (
          <Link
            key={tab}
            to={to}
            className={`nav-btn${isActive ? ' active' : ''}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
              <span className="nav-icon" aria-hidden="true">
                <IconComponent size={24} weight={isActive ? 'fill' : 'regular'} />
              </span>
              {tab === 'home' && nudgeBadgeCount > 0 && (
                <span
                  className="nudge-nav-badge"
                  aria-label={`${nudgeBadgeCount > 9 ? '9+' : nudgeBadgeCount} active nudges`}
                >
                  {nudgeBadgeCount > 9 ? '9+' : nudgeBadgeCount}
                </span>
              )}
              {tab === 'more' && moreBadgeCount > 0 && (
                <span
                  className="more-nav-badge"
                  aria-label={`${moreBadgeCount > 9 ? '9+' : moreBadgeCount} pending tasks`}
                >
                  {moreBadgeCount > 9 ? '9+' : moreBadgeCount}
                </span>
              )}
            </span>
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
