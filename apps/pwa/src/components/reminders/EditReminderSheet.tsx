import { useState, useCallback, useEffect } from 'react';
import type { Reminder, Owner, RecurrenceCadence, ReminderUpdateChange } from '@olivia/contracts';
import { BottomSheet } from './BottomSheet';
import { DateTimePicker } from './DateTimePicker';
import { ownerLabel, formatScheduledLabel } from '../../lib/reminder-helpers';

type EditReminderSheetProps = {
  open: boolean;
  onClose: () => void;
  reminder: Reminder;
  onSave: (change: ReminderUpdateChange) => void;
};

const OWNERS: Owner[] = ['stakeholder', 'spouse', 'unassigned'];

export function EditReminderSheet({ open, onClose, reminder, onSave }: EditReminderSheetProps) {
  const [title, setTitle] = useState(reminder.title);
  const [scheduledAt, setScheduledAt] = useState(reminder.scheduledAt);
  const [owner, setOwner] = useState<Owner>(reminder.owner);
  const [recurring, setRecurring] = useState(reminder.recurrenceCadence !== 'none');
  const [cadence, setCadence] = useState<RecurrenceCadence>(
    reminder.recurrenceCadence === 'none' ? 'weekly' : reminder.recurrenceCadence
  );
  const [note, setNote] = useState(reminder.note ?? '');

  useEffect(() => {
    if (open) {
      setTitle(reminder.title);
      setScheduledAt(reminder.scheduledAt);
      setOwner(reminder.owner);
      setRecurring(reminder.recurrenceCadence !== 'none');
      setCadence(reminder.recurrenceCadence === 'none' ? 'weekly' : reminder.recurrenceCadence);
      setNote(reminder.note ?? '');
      setPickerOpen(false);
    }
  }, [open, reminder]);

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleDateChange = useCallback((isoString: string) => {
    setScheduledAt(isoString);
  }, []);

  const handlePickerToggle = useCallback(() => {
    setPickerOpen((prev) => !prev);
  }, []);

  const handleSave = useCallback(() => {
    const change: ReminderUpdateChange = {};
    if (title.trim() !== reminder.title) change.title = title.trim();
    if (scheduledAt !== reminder.scheduledAt) change.scheduledAt = scheduledAt;
    if (owner !== reminder.owner) change.owner = owner;
    const newCadence = recurring ? cadence : 'none';
    if (newCadence !== reminder.recurrenceCadence) change.recurrenceCadence = newCadence;
    const newNote = note.trim() || null;
    if (newNote !== reminder.note) change.note = newNote;

    if (Object.keys(change).length > 0) {
      onSave(change);
    } else {
      onClose();
    }
  }, [title, scheduledAt, owner, recurring, cadence, note, reminder, onSave, onClose]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit reminder">
      <div className="rem-form-group">
        <span className="rem-form-label">Title</span>
        <input
          className="rem-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">Scheduled</span>
        <div className="rem-form-chips">
          <span className="rem-chip active">
            {formatScheduledLabel(scheduledAt)}
          </span>
          <DateTimePicker
            value={scheduledAt}
            onChange={handleDateChange}
            mode="edit"
            open={pickerOpen}
            onToggle={handlePickerToggle}
          />
        </div>
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">Owner</span>
        <div className="rem-form-chips">
          {OWNERS.map((o) => (
            <button
              key={o}
              type="button"
              className={`rem-chip${owner === o ? ' active' : ''}`}
              onClick={() => setOwner(o)}
            >
              {ownerLabel(o)}
            </button>
          ))}
        </div>
      </div>

      <div className="rem-form-group">
        <div className="rem-toggle-row">
          <div>
            <div className="rem-toggle-label">Repeat</div>
            {recurring && (
              <div className="rem-toggle-sub">
                {cadence.charAt(0).toUpperCase() + cadence.slice(1)}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`rem-toggle${recurring ? ' on' : ''}`}
            onClick={() => setRecurring(!recurring)}
            aria-label="Toggle repeat"
          />
        </div>
        {recurring && (
          <div className="cadence-picker" style={{ marginTop: 8 }}>
            {(['daily', 'weekly', 'monthly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`cadence-option${cadence === c ? ' active' : ''}`}
                onClick={() => setCadence(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">Note</span>
        <textarea
          className="rem-form-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note…"
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
