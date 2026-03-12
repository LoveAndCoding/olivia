interface Avatar {
  initial: string;
  colorIndex?: 0 | 1 | 2 | 3 | 4;
}

interface AvatarGroupProps {
  avatars: Avatar[];
  size?: 'sm' | 'md';
}

export function AvatarGroup({ avatars, size = 'md' }: AvatarGroupProps) {
  return (
    <div className={`avatar-group avatar-group--${size}`} aria-label="Household members">
      {avatars.map((avatar, i) => (
        <span
          key={i}
          className={`avatar avatar--${avatar.colorIndex ?? i % 5}`}
          aria-label={`Member: ${avatar.initial}`}
        >
          {avatar.initial}
        </span>
      ))}
    </div>
  );
}
