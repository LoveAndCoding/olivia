import { Link } from '@tanstack/react-router';

export type NavTab = 'home' | 'tasks' | 'olivia' | 'memory';

const NAV_ITEMS: Array<{ tab: NavTab; to: string; icon: string; label: string }> = [
  { tab: 'home',   to: '/',        icon: '🏡', label: 'Home'   },
  { tab: 'tasks',  to: '/tasks',   icon: '✅', label: 'Tasks'  },
  { tab: 'olivia', to: '/olivia',  icon: '✦',  label: 'Olivia' },
  { tab: 'memory', to: '/memory',  icon: '🗂️', label: 'Memory' },
];

export function BottomNav({ activeTab }: { activeTab: NavTab }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ tab, to, icon, label }) => (
        <Link
          key={tab}
          to={to}
          className={`nav-btn${activeTab === tab ? ' active' : ''}`}
          aria-label={label}
          aria-current={activeTab === tab ? 'page' : undefined}
        >
          <span className="nav-icon" aria-hidden="true">{icon}</span>
          <span className="nav-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
