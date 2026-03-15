import { useState, useRef, useCallback } from 'react';
import type { MealEntry } from '@olivia/contracts';
import { parseMealEntryItemsFromText } from '@olivia/domain';

type MealEntryCardProps = {
  entry: MealEntry;
  onUpdateItems: (items: string[]) => void;
  onDelete: () => void;
  isSpouse: boolean;
  isArchived: boolean;
};

export function MealEntryCard({ entry, onUpdateItems, onDelete, isSpouse, isArchived }: MealEntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(entry.shoppingItems.join('\n'));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const readOnly = isSpouse || isArchived;

  const handleToggle = useCallback(() => {
    if (!expanded) {
      setEditText(entry.shoppingItems.join('\n'));
    }
    setExpanded((v) => !v);
  }, [expanded, entry.shoppingItems]);

  const handleSave = useCallback(() => {
    const items = parseMealEntryItemsFromText(editText);
    onUpdateItems(items);
    setExpanded(false);
  }, [editText, onUpdateItems]);

  return (
    <div className="list-card" style={{ marginBottom: 8 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="list-card-title" style={{ fontWeight: 600 }}>{entry.name}</div>
          {!expanded && (
            <div className="list-card-meta-row" style={{ marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {entry.shoppingItems.length === 0
                  ? 'No shopping items'
                  : `${entry.shoppingItems.length} item${entry.shoppingItems.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {!readOnly ? (
            <>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>
                Shopping items (one per line or comma-separated)
              </label>
              <textarea
                ref={textareaRef}
                className="rem-form-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Milk&#10;Eggs&#10;Bread"
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="rem-btn rem-btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rem-btn"
                  onClick={() => setExpanded(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rem-btn"
                  style={{ color: 'var(--rose)' }}
                  onClick={onDelete}
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {entry.shoppingItems.length === 0 ? (
                <span style={{ color: 'var(--ink-3)' }}>No shopping items.</span>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {entry.shoppingItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
