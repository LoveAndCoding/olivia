import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { AddTaskPreview, CompletedTask, FullTask } from '../../types/display';

export type FilterTab = 'All' | 'Mine' | 'Shared' | 'Needs attention' | 'Snoozed';

const FILTER_TABS: FilterTab[] = ['All', 'Mine', 'Shared', 'Needs attention', 'Snoozed'];

export type TasksViewProps = {
  openTasks: FullTask[];
  doneTasks: CompletedTask[];
  summaryLine: string;
  isLoading?: boolean;
  error?: string | null;
  onNavigateToItem?: (id: string) => void;
  /** Returns a parsed preview, or null/throws on failure. */
  onPreviewTask?: (inputText: string) => Promise<AddTaskPreview | null>;
  /** Confirms the previewed task. */
  onConfirmTask?: (preview: AddTaskPreview) => Promise<void>;
};

export function TasksView({
  openTasks,
  doneTasks,
  summaryLine,
  isLoading,
  error,
  onNavigateToItem,
  onPreviewTask,
  onConfirmTask,
}: TasksViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState<AddTaskPreview | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filteredOpen = openTasks.filter((t) => {
    if (activeFilter === 'Mine')    return t.assignee?.cls === '';
    if (activeFilter === 'Shared')  return t.assignee?.cls === 'rose-av';
    if (activeFilter === 'Needs attention') return t.accent === 'rose';
    if (activeFilter === 'Snoozed') return false;
    return true;
  });

  const handlePreview = async () => {
    if (!inputText.trim() || !onPreviewTask) return;
    setBusy(true);
    setAddError(null);
    try {
      const result = await onPreviewTask(inputText);
      if (result) setPreview(result);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !onConfirmTask) return;
    setBusy(true);
    setAddError(null);
    try {
      await onConfirmTask(preview);
      setInputText('');
      setPreview(null);
      setShowAddForm(false);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen-scroll">
      {/* Header */}
      <div className="screen-header">
        <div className="screen-title">Tasks</div>
        <div className="screen-sub">{summaryLine}</div>
      </div>

      {/* Filter tabs */}
      <div className="filter-row" role="tablist" aria-label="Task filters">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeFilter === tab}
            className={`ftab${activeFilter === tab ? ' active' : ''}`}
            onClick={() => setActiveFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Add task */}
      {!showAddForm && (
        <button
          type="button"
          className="add-task-btn"
          onClick={() => setShowAddForm(true)}
          aria-label="Add a new task"
        >
          <div className="add-icon" aria-hidden="true"><Plus size={20} /></div>
          <div className="add-label">Add a new task…</div>
        </button>
      )}

      {/* Add task form */}
      {showAddForm && (
        <div className="add-task-form">
          <div>
            <div className="form-field-label">What needs doing?</div>
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Call electrician about the kitchen outlet, due next week"
              autoFocus
            />
          </div>
          {!preview && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="primary-button"
                onClick={handlePreview}
                disabled={busy || !inputText.trim()}
                style={{ flex: 1 }}
              >
                {busy ? 'Parsing…' : 'Preview'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setShowAddForm(false); setPreview(null); setInputText(''); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          )}
          {preview && (
            <div className="confirm-panel">
              <div className="form-field-label">Review before saving</div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '6px 0 4px' }}>{preview.title}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Owner: {preview.ownerDisplay}
                {preview.dueText ? ` · Due: ${preview.dueText}` : ''}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleConfirm}
                  disabled={busy}
                  style={{ flex: 1 }}
                >
                  {busy ? 'Saving…' : 'Confirm & save'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPreview(null)}
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
              </div>
            </div>
          )}
          {addError && <p style={{ color: 'var(--rose)', fontSize: 12 }}>{addError}</p>}
        </div>
      )}

      {/* Loading / error */}
      {isLoading && (
        <div style={{ padding: '24px 22px', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      )}
      {error && !isLoading && (
        <div style={{ padding: '24px 22px', color: 'var(--rose)', fontSize: 13 }}>{error}</div>
      )}

      {/* Task list */}
      <div className="tasks-list">
        {!isLoading && filteredOpen.length === 0 && (
          <div className="empty-state">
            <p>
              {activeFilter === 'All'
                ? 'Nothing left to do today — nice work.'
                : `No ${activeFilter.toLowerCase()} tasks right now.`}
            </p>
          </div>
        )}
        {filteredOpen.map((task) => (
          <div
            key={task.id}
            className={`task-full${task.accent ? ` ${task.accent}` : ''}`}
            onClick={() => onNavigateToItem?.(task.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigateToItem?.(task.id)}
          >
            <div className="tf-top">
              <div
                className="tf-check"
                role="checkbox"
                aria-checked="false"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Mark "${task.title}" complete`}
              />
              <div className="tf-name">{task.title}</div>
              {task.badge && (
                <div className={`badge ${task.badge.cls}`} style={{ flexShrink: 0, marginTop: 1 }}>
                  {task.badge.label}
                </div>
              )}
            </div>
            <div className="tf-bottom">
              {task.dueText && <div className="tf-meta">{task.dueText}</div>}
              {task.assignee && (
                <div className="tf-assign">
                  <div className={`tf-mini-av${task.assignee.cls ? ` ${task.assignee.cls}` : ''}`}>
                    {task.assignee.initial}
                  </div>
                  {task.assignee.name}
                </div>
              )}
              {task.pendingSync && <span className="badge badge-violet">Pending sync</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Completed section */}
      {doneTasks.length > 0 && (
        <>
          <div className="completed-label">Completed</div>
          <div className="tasks-list">
            {doneTasks.map((t) => (
              <div key={t.id} className="task-full done">
                <div className="tf-top">
                  <div className="tf-check done" />
                  <div className="tf-name done">{t.title}</div>
                </div>
                {t.meta && (
                  <div className="tf-bottom">
                    <div className="tf-meta">{t.meta}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="spacer-bottom" />
    </div>
  );
}
