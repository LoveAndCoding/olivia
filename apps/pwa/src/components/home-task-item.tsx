type TaskStatus = 'overdue' | 'soon' | 'shared';

const STATUS_LABELS: Record<TaskStatus, string> = {
  overdue: 'Overdue',
  soon: 'Soon',
  shared: 'Shared',
};

interface HomeTaskItemProps {
  title: string;
  subtitle: string;
  status?: TaskStatus;
  checked?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

export function HomeTaskItem({
  title,
  subtitle,
  status,
  checked = false,
  onToggle,
  onClick,
}: HomeTaskItemProps) {
  const modifierClass = status ? ` home-task-item--${status}` : '';

  return (
    <div
      className={`home-task-item${modifierClass}`}
      role="listitem"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <button
        className={`task-checkbox${checked ? ' task-checkbox--checked' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        aria-label={checked ? `Mark "${title}" incomplete` : `Mark "${title}" complete`}
        aria-pressed={checked}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="home-task-item__content">
        <span className="home-task-item__title">{title}</span>
        <span className="home-task-item__subtitle muted">{subtitle}</span>
      </div>
      {status && (
        <span className={`chip ${status}`} aria-label={`Status: ${STATUS_LABELS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      )}
    </div>
  );
}
