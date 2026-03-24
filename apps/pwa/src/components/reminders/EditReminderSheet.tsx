import { useState, useCallback, useEffect } from 'react';
import type { Reminder, RecurrenceCadence, ReminderUpdateChange } from '@olivia/contracts';
import { BottomSheet } from './BottomSheet';
import { DateTimePicker } from './DateTimePicker';
import { formatScheduledLabel } from '../../lib/reminder-helpers';
import { useAuth } from '../../lib/auth';
import { getHouseholdMembers } from '../../lib/auth-api';

type EditReminderSheetProps = {
  open: boolean;
  onClose: () => void;
  reminder: Reminder;
  onSave: (change: ReminderUpdateChange) => void;
};

type MemberOption = { id: string; name: string };

export function EditReminderSheet({ open, onClose, reminder, onSave }: EditReminderSheetProps) {
  const { getSessionToken } = useAuth();
  const [title, setTitle] = useState(reminder.title);
  const [scheduledAt, setScheduledAt] = useState(reminder.scheduledAt);
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(reminder.assigneeUserId);
  const [recurring, setRecurring] = useState(reminder.recurrenceCadence !== 'none');
  const [cadence, setCadence] = useState<RecurrenceCadence>(
    reminder.recurrenceCadence === 'none' ? 'weekly' : reminder.recurrenceCadence
  );
  const [note, setNote] = useState(reminder.note ?? '');
  const [members, setMembers] = useState<MemberOption[]>([]);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    let cancelled = false;
    void getHouseholdMembers(token).then((res) => {
      if (!cancelled) setMembers(res.members.map((m) => ({ id: m.id, name: m.name })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [getSessionToken]);

  useEffect(() => {
    if (open) {
      setTitle(reminder.title);
      setScheduledAt(reminder.scheduledAt);
      setAssigneeUserId(reminder.assigneeUserId);
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
    if (assigneeUserId !== reminder.assigneeUserId) change.assigneeUserId = assigneeUserId;
    const newCadence = recurring ? cadence : 'none';
    if (newCadence !== reminder.recurrenceCadence) change.recurrenceCadence = newCadence;
    const newNote = note.trim() || null;
    if (newNote !== reminder.note) change.note = newNote;

    if (Object.keys(change).length > 0) {
      onSave(change);
    } else {
      onClose();
    }
  }, [title, scheduledAt, assigneeUserId, recurring, cadence, note, reminder, onSave, onClose]);

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
        <span className="rem-form-label">Assignee</span>
        <div className="rem-form-chips">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`rem-chip${assigneeUserId === m.id ? ' active' : ''}`}
              onClick={() => setAssigneeUserId(m.id)}
            >
              {m.name}
            </button>
          ))}
          <button
            type="button"
            className={`rem-chip${assigneeUserId === null ? ' active' : ''}`}
            onClick={() => setAssigneeUserId(null)}
          >
            Unassigned
          </button>
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
