import type { UserRole } from '@olivia/contracts';

type AvatarSize = 'sm' | 'md' | 'lg';

type UserAvatarProps = {
  name: string;
  role: UserRole;
  size?: AvatarSize;
};

export function UserAvatar({ name, role, size = 'md' }: UserAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className={`auth-avatar ${role} size-${size}`}
      aria-label={`${name} (${role})`}
    >
      {initial}
    </div>
  );
}
