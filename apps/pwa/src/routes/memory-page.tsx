import { useMemo, useState } from 'react';
import { HouseBadgeIcon, KeyIcon, NoteIcon, PaletteIcon, SearchIcon, SnowflakeIcon, WrenchIcon } from '../components/icons';
import { DEFAULT_MEMORY, MEMORY_SECTIONS } from '../lib/view-models';

const MEMORY_ICONS = {
  palette: PaletteIcon,
  home: HouseBadgeIcon,
  wrench: WrenchIcon,
  snowflake: SnowflakeIcon,
  key: KeyIcon,
  note: NoteIcon
};

export function MemoryPage() {
  const [query, setQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return DEFAULT_MEMORY;
    return DEFAULT_MEMORY.filter((entry) => {
      return `${entry.title} ${entry.detail}`.toLowerCase().includes(normalized);
    });
  }, [query]);

  return (
    <div className="screen stack-lg">
      <section className="stack-sm">
        <h1 className="screen-title">Household memory</h1>
        <p className="screen-subtitle">Things worth keeping</p>
      </section>

      <label className="search-bar">
        <SearchIcon className="search-icon" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search decisions, info, notes..."
          aria-label="Search household memory"
        />
      </label>

      {filteredEntries.length === 0 ? (
        <div className="panel-card celebration-note">
          Olivia hasn't saved anything here yet. She'll remember things as you use the app.
        </div>
      ) : null}

      {MEMORY_SECTIONS.map((section) => {
        const entries = filteredEntries.filter((entry) => entry.category === section.key);
        if (entries.length === 0) return null;
        return (
          <section key={section.key} className="stack-md">
            <span className="mem-cat-label">{section.label}</span>
            <div className="stack-md">
              {entries.map((entry) => {
                const Icon = MEMORY_ICONS[entry.icon];
                return (
                  <article key={entry.id} className="memory-card">
                    <div className={`memory-icon memory-icon-${entry.category}`}>
                      <Icon className="memory-icon-svg" />
                    </div>
                    <div className="memory-main">
                      <strong className="task-title">{entry.title}</strong>
                      <p className="memory-detail">{entry.detail}</p>
                    </div>
                    <span className="memory-age">{entry.age}</span>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
