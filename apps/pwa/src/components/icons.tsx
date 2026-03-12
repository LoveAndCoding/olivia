import type { ComponentProps } from 'react';

type IconProps = ComponentProps<'svg'>;

function IconBase(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 10.5 12 3l8.5 7.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </IconBase>
  );
}

export function TasksIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 7h12" />
      <path d="M6 12h12" />
      <path d="M6 17h12" />
      <path d="m3.5 7 .9.9 1.6-1.8" />
      <path d="m3.5 12 .9.9 1.6-1.8" />
      <path d="m3.5 17 .9.9 1.6-1.8" />
    </IconBase>
  );
}

export function OliviaIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.25 13.95 10l5.8 2-5.8 2L12 19.75 10.05 14 4.25 12l5.8-2L12 4.25Z" />
    </IconBase>
  );
}

export function MemoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5a2.5 2.5 0 0 1 2.5-2.5H20v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M7 4v16" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </IconBase>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 12 15-8-3 8 3 8-15-8Z" />
    </IconBase>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.5c4.7 0 8.5 3.1 8.5 7 0 2.9-2.1 4.5-4.4 4.5h-1.6a1.5 1.5 0 0 0 0 3H12A7.5 7.5 0 0 1 12 4.5Z" />
      <circle cx="8.2" cy="10" r=".8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8.4" r=".8" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="8.7" r=".8" fill="currentColor" stroke="none" />
      <circle cx="16" cy="11.4" r=".8" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function HouseBadgeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 11.25 12 4l8 7.25" />
      <path d="M6.5 10.5V20h11V10.5" />
      <path d="M10 20v-4.5h4V20" />
    </IconBase>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.5 4.5a4 4 0 0 0 4.8 4.8l-8.4 8.4a2.5 2.5 0 1 1-3.5-3.5l8.4-8.4a4 4 0 0 0-1.3-1.3Z" />
    </IconBase>
  );
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5v17" />
      <path d="m7.5 6 9 12" />
      <path d="m16.5 6-9 12" />
      <path d="m6 8 3 1.5L10.5 6" />
      <path d="m18 8-3 1.5L13.5 6" />
      <path d="m6 16 3-1.5 1.5 3.5" />
      <path d="m18 16-3-1.5-1.5 3.5" />
    </IconBase>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8.5" cy="8.5" r="3.5" />
      <path d="M11 11 20 20" />
      <path d="M15.5 15.5 18 13" />
      <path d="M17.5 17.5 20 15" />
    </IconBase>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 4h10l3 3v13H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
      <path d="M17 4v4h4" />
      <path d="M9 12h7" />
      <path d="M9 16h5" />
    </IconBase>
  );
}
