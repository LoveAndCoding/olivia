import { useState, useCallback, useEffect } from 'react';
import type { DraftReminder, RecurrenceCadence } from '@olivia/contracts';
import { BottomSheet } from './BottomSheet';
import { OliviaMessage } from './OliviaMessage';
import { DateTimePicker } from './DateTimePicker';
import { getDateChipOptions } from '../../lib/reminder-helpers';
import { format } from 'date-fns';
import { useAuth } from '../../lib/auth';
import { getHouseholdMembers } from '../../lib/auth-api';

type CreateReminderSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: (draft: DraftReminder) => void;
  linkedItemId?: string | null;
  parsedDraft?: DraftReminder | null;
  parsedMessage?: string | null;
};

type MemberOption = { id: string; name: string };

export function CreateReminderSheet({
  open,
  onClose,
  onSave,
  linkedItemId = null,
  parsedDraft = null,
  parsedMessage = null,
}: CreateReminderSheetProps) {
  const { user, getSessionToken } = useAuth();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(user?.id ?? null);
  const [recurring, setRecurring] = useState(false);
  const [cadence, setCadence] = useState<RecurrenceCadence>('weekly');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'structured' | 'parsed'>(parsedDraft ? 'parsed' : 'structured');
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
    if (parsedDraft && open) {
      setTitle(parsedDraft.title);
      setScheduledAt(parsedDraft.scheduledAt);
      setAssigneeUserId(parsedDraft.assigneeUserId);
      setRecurring(parsedDraft.recurrenceCadence !== 'none');
      setCadence(parsedDraft.recurrenceCadence === 'none' ? 'weekly' : parsedDraft.recurrenceCadence);
      setNote(parsedDraft.note ?? '');
      setMode('parsed');
    }
  }, [parsedDraft, open]);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setScheduledAt('');
      setSelectedChip(null);
      setAssigneeUserId(user?.id ?? null);
      setRecurring(false);
      setCadence('weekly');
      setNote('');
      setPickerOpen(false);
      setMode(parsedDraft ? 'parsed' : 'structured');
    }
  }, [open, parsedDraft, user]);

  const dateChips = getDateChipOptions(new Date());

  const handleChipSelect = useCallback((label: string, value: Date) => {
    setSelectedChip(label);
    setScheduledAt(value.toISOString());
    setPickerOpen(false);
  }, []);

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCustomDateChange = useCallback((isoString: string) => {
    setSelectedChip('custom');
    setScheduledAt(isoString);
  }, []);

  const handlePickerToggle = useCallback(() => {
    setPickerOpen((prev) => !prev);
    if (!pickerOpen) {
      setSelectedChip('custom');
    }
  }, [pickerOpen]);

  const handleSave = useCallback(() => {
    if (!title.trim() || !scheduledAt) return;
    const draft: DraftReminder = {
      id: crypto.randomUUID(),
      title: title.trim(),
      note: note.trim() || null,
      assigneeUserId,
      scheduledAt,
      recurrenceCadence: recurring ? cadence : 'none',
      linkedInboxItemId: linkedItemId,
    };
    onSave(draft);
  }, [title, scheduledAt, note, assigneeUserId, recurring, cadence, linkedItemId, onSave]);

  const isValid = title.trim().length > 0 && scheduledAt.length > 0;

  if (mode === 'parsed' && parsedDraft) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Confirm reminder">
        {parsedMessage && (
          <OliviaMessage label="✦ Olivia parsed" text={parsedMessage} />
        )}

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
              {scheduledAt ? format(new Date(scheduledAt), 'EEE MMM d') : 'Not set'}
            </span>
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
              {recurring && <div className="rem-toggle-sub">{cadence} · every {cadence === 'daily' ? 'day' : cadence === 'weekly' ? 'week' : 'month'}</div>}
            </div>
            <button
              type="button"
              className={`rem-toggle${recurring ? ' on' : ''}`}
              onClick={() => setRecurring(!recurring)}
              aria-label="Toggle repeat"
            />
          </div>
        </div>

        <div className="rem-actions-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="rem-btn rem-btn-primary"
            style={{ flex: 2 }}
            disabled={!isValid}
            onClick={handleSave}
          >
            Save reminder
          </button>
          <button
            type="button"
            className="rem-btn rem-btn-ghost"
            style={{ flex: 1 }}
            onClick={() => setMode('structured')}
          >
            ✏️ Edit
          </button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="New reminder">
      <div className="rem-form-group">
        <span className="rem-form-label">Title</span>
        <input
          className="rem-form-input"
          placeholder="What do you want to remember?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="rem-form-group">
        <span className="rem-form-label">When</span>
        <div className="rem-form-chips">
          {dateChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={`rem-chip${selectedChip === chip.label ? ' active' : ''}`}
              onClick={() => handleChipSelect(chip.label, chip.value)}
            >
              {chip.label}
            </button>
          ))}
          <DateTimePicker
            value={selectedChip === 'custom' ? scheduledAt : ''}
            onChange={handleCustomDateChange}
            mode="create"
            open={pickerOpen}
            onToggle={handlePickerToggle}
          />
        </div>
        {pickerOpen && <div style={{ height: 0 }} />}
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
                {cadence === 'daily' ? 'Off → on' : cadence}
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
        <span className="rem-form-label">Note (optional)</span>
        <textarea
          className="rem-form-input"
          placeholder="Add a note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={{ resize: 'none' }}
        />
      </div>

      {linkedItemId && (
        <div className="rem-form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--mint-soft)', borderRadius: 14 }}>
            <span>🔗</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mint)' }}>Linked to a task</span>
          </div>
        </div>
      )}

      <div className="rem-actions-row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="rem-btn rem-btn-primary"
          style={{ flex: 1 }}
          disabled={!isValid}
          onClick={handleSave}
        >
          Save reminder
        </button>
        <button
          type="button"
          className="rem-btn rem-btn-ghost"
          style={{ flex: 1 }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
