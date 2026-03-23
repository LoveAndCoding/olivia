import type { User } from '@olivia/contracts';
import { UserAvatar } from './UserAvatar';

type MemberCardProps = {
  user: User;
  isCurrentUser?: boolean;
};

function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `Joined ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function MemberCard({ user, isCurrentUser = false }: MemberCardProps) {
  return (
    <div className="member-card">
      <UserAvatar name={user.name} role={user.role} size="lg" />
      <div className="member-card-info">
        <div className="member-card-name">
          {user.name}{isCurrentUser ? ' (you)' : ''}
        </div>
        <div className="member-card-email">{user.email}</div>
        <div className="member-card-joined">{formatJoinDate(user.createdAt)}</div>
      </div>
      <span className={`member-card-badge ${user.role}`} aria-label={`Role: ${user.role === 'admin' ? 'Admin' : 'Member'}`}>
        {user.role === 'admin' ? 'Admin' : 'Member'}
      </span>
    </div>
  );
}
