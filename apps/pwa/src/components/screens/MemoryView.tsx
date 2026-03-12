import { useState, useMemo } from 'react';
import type { MemoryCategory } from '../../types/display';

export type MemoryViewProps = {
  categories: MemoryCategory[];
};

export function MemoryView({ categories }: MemoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter(
          (e) => e.title.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.entries.length > 0);
  }, [categories, searchQuery]);

  const hasResults = filtered.some((c) => c.entries.length > 0);

  return (
    <div className="screen-scroll">
      {/* Header */}
      <div className="screen-header">
        <div className="screen-title">Household memory</div>
        <div className="screen-sub">Things worth keeping</div>
      </div>

      {/* Search */}
      <div className="memory-search" role="search">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="search-input"
          placeholder="Search decisions, info, notes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search memory"
        />
      </div>

      {/* Categories */}
      {hasResults ? (
        filtered.map((cat) => (
          <div key={cat.id} className="mem-category">
            <span className="mem-cat-label">{cat.label}</span>
            <div className="mem-cards" role="list" aria-label={cat.label}>
              {cat.entries.map((entry) => (
                <div key={entry.id} className="mem-card" role="listitem">
                  <div className={`mem-icon ${entry.iconColor}`} aria-hidden="true">
                    {entry.icon}
                  </div>
                  <div className="mem-body">
                    <div className="mem-title">{entry.title}</div>
                    <div className="mem-detail">{entry.detail}</div>
                  </div>
                  <div className="mem-age" aria-label={`Added ${entry.age} ago`}>{entry.age}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <p>
            {searchQuery
              ? `No results for "${searchQuery}".`
              : "Olivia hasn't saved anything here yet. She'll remember things as you use the app."}
          </p>
        </div>
      )}

      <div className="spacer-bottom" />
    </div>
  );
}
