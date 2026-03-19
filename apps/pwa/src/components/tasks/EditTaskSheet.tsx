import { useState, useCallback, useEffect } from 'react';
import type { InboxItem, Owner, UpdateChange } from '@olivia/contracts';
import { BottomSheet } from '../reminders/BottomSheet';

type EditTaskSheetProps = {
  open: boolean;
  onClose: () => void;
  item: InboxItem;
  onSave: (change: UpdateChange) => void;
};

const OWNERS: { value: Owner; label: string }[] = [
  { value: 'stakeholder', label: 'Lexi' },
  { value: 'spouse', label: 'Christian' },
  { value: 'unassigned', label: 'Unassigned' },
];

const STATUSES: { value: InboxItem['status']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'deferred', label: 'Deferred' },
];

export function EditTaskSheet({ open, onClose, item, onSave }: EditTaskSheetProps) {
  const [status, setStatus] = useState(item.status);
  const [owner, setOwner] = useState<Owner>(item.owner);
  const [dueText, setDueText] = useState(item.dueText ?? '');
  const [description, setDescription] = useState(item.description ?? '');

  useEffect(() => {
    if (open) {
      setStatus(item.status);
      setOwner(item.owner);
      setDueText(item.dueText ?? '');
      setDescription(item.description ?? '');
    }
  }, [open, item]);

  const handleSave = useCallback(() => {
    const change: UpdateChange = {};
    if (status !== item.status) change.status = status;
    if (owner !== item.owner) change.owner = owner;
    const newDueText = dueText.trim() || null;
    if (newDueText !== item.dueText) change.dueText = newDueText;
    const newDescription = description.trim() || null;
    if (newDescription !== item.description) change.description = newDescription;

    if (Object.keys(change).length > 0) {
      onSave(change);
    } else {
      onClose();
    }
  }, [status, owner, dueText, description, item, onSave, onClose]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit task">
      <div className="rem-form-group">
        <span className="rem-form-label">Status</span>
        <div className="rem-form-chips">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`rem-chip${status === s.value ? ' active' : ''}`}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">Owner</span>
        <div className="rem-form-chips">
          {OWNERS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`rem-chip${owner === o.value ? ' active' : ''}`}
              onClick={() => setOwner(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">Due date</span>
        <input
          className="rem-form-input"
          value={dueText}
          onChange={(e) => setDueText(e.target.value)}
          placeholder="e.g. next Friday, tomorrow"
        />
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">Description</span>
        <textarea
          className="rem-form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a description…"
          style={{ resize: 'none' }}
        />
      </div>

      <div className="rem-actions-row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="rem-btn rem-btn-primary"
          style={{ flex: 1 }}
          onClick={handleSave}
        >
          Save changes
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ flex: 1 }}
          onClick={onClose}
        >
          Discard
        </button>
      </div>
    </BottomSheet>
  );
}
