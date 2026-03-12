import { Link } from '@tanstack/react-router';

interface SectionHeaderProps {
  title: string;
  linkLabel?: string;
  href?: string;
  onLinkClick?: () => void;
}

export function SectionHeader({ title, linkLabel, href, onLinkClick }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {linkLabel && (
        href
          ? <Link to={href} className="text-button section-link">{linkLabel}</Link>
          : <button className="text-button section-link" onClick={onLinkClick}>{linkLabel}</button>
      )}
    </div>
  );
}
