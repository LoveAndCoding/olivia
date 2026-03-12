import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { InboxViewResponse, Owner } from '@olivia/contracts';
import { confirmCreateCommand, loadInboxView, previewCreateCommand } from '../lib/sync';
import { useRole } from '../lib/role';
import {
  PERSON_LABELS,
  type TaskFilter,
  countCompletedThisWeek,
  filterTasks,
  getActiveItems,
  getCompletedItems,
  getTaskBadge,
  getTaskMeta,
  getTaskVariant
} from '../lib/view-models';

const FILTERS: Array<{ key: TaskFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'shared', label: 'Shared' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'snoozed', label: 'Snoozed' }
];

export function TasksPage() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [structuredMode, setStructuredMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [structuredTitle, setStructuredTitle] = useState('');
  const [structuredOwner, setStructuredOwner] = useState<Owner>('unassigned');
  const [structuredDueText, setStructuredDueText] = useState('');
  const [structuredDescription, setStructuredDescription] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCreateCommand>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'tasks'],
    queryFn: () => loadInboxView(role, 'all')
  });

  const activeItems = useMemo(() => getActiveItems(inboxQuery.data), [inboxQuery.data]);
  const allCompletedItems = useMemo(() => getCompletedItems(inboxQuery.data), [inboxQuery.data]);
  const completedItems = useMemo(() => allCompletedItems.slice(0, 6), [allCompletedItems]);
  const filteredItems = useMemo(() => filterTasks(activeItems, filter, role), [activeItems, filter, role]);
  const completedThisWeek = useMemo(() => countCompletedThisWeek(allCompletedItems), [allCompletedItems]);

  const resetComposer = () => {
    setComposerOpen(false);
    setStructuredMode(false);
    setInputText('');
    setStructuredTitle('');
    setStructuredOwner('unassigned');
    setStructuredDueText('');
    setStructuredDescription('');
    setPreview(null);
    setError(null);
  };

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await previewCreateCommand(
        role,
        structuredMode ? undefined : inputText,
        structuredMode
          ? {
              title: structuredTitle,
              owner: structuredOwner,
              dueText: structuredDueText || null,
              description: structuredDescription || null
            }
          : undefined
      );
      setPreview(response);
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const savedItem = await confirmCreateCommand(role, preview.parsedItem, preview.draftId);
      queryClient.setQueriesData({ queryKey: ['inbox-view'] }, (current: InboxViewResponse | undefined) => {
        if (!current) return current;
        const withoutExisting = current.itemsByStatus.open.filter((item) => item.id !== savedItem.id);
        return {
          ...current,
          itemsByStatus: {
            ...current.itemsByStatus,
            open: [savedItem, ...withoutExisting]
          }
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      await queryClient.refetchQueries({ queryKey: ['inbox-view'], type: 'active' });
      resetComposer();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen stack-lg">
      <section className="stack-sm">
        <h1 className="screen-title">Tasks</h1>
        <p className="screen-subtitle">
          {activeItems.length} open · {completedThisWeek} completed this week
        </p>
      </section>

      <div className="filter-row" role="tablist" aria-label="Task filters">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`ftab ${filter === item.key ? 'active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {role === 'stakeholder' ? (
        <section className="stack-md">
          <button type="button" className="add-task-btn" onClick={() => setComposerOpen((value) => !value)}>
            <span className="add-task-plus">+</span>
            <span>{composerOpen ? 'Hide new task' : 'Add a new task...'}</span>
          </button>

          {composerOpen ? (
            <div className="panel-card stack-md">
              <div className="composer-header">
                <div className="stack-sm">
                  <span className="caps-label">Create task</span>
                  <h2 className="section-title">Preview before save</h2>
                </div>
                <button type="button" className="ghost-link" onClick={() => setStructuredMode((value) => !value)}>
                  {structuredMode ? 'Use freeform entry' : 'Use structured entry'}
                </button>
              </div>

              {!structuredMode ? (
                <label className="stack-sm">
                  <span className="field-label">Freeform input</span>
                  <textarea
                    aria-label="Freeform input"
                    className="form-textarea"
                    rows={4}
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder="Add: follow up on plumber quote, due tomorrow, owner me"
                  />
                </label>
              ) : (
                <div className="form-grid">
                  <label className="stack-sm">
                    <span className="field-label">Title</span>
                    <input value={structuredTitle} onChange={(event) => setStructuredTitle(event.target.value)} />
                  </label>
                  <label className="stack-sm">
                    <span className="field-label">Owner</span>
                    <select value={structuredOwner} onChange={(event) => setStructuredOwner(event.target.value as Owner)}>
                      <option value="unassigned">Unassigned</option>
                      <option value="stakeholder">{PERSON_LABELS.stakeholder}</option>
                      <option value="spouse">{PERSON_LABELS.spouse}</option>
                    </select>
                  </label>
                  <label className="stack-sm">
                    <span className="field-label">Due</span>
                    <input value={structuredDueText} onChange={(event) => setStructuredDueText(event.target.value)} placeholder="next Friday" />
                  </label>
                  <label className="stack-sm form-grid-span">
                    <span className="field-label">Description</span>
                    <textarea className="form-textarea" rows={3} value={structuredDescription} onChange={(event) => setStructuredDescription(event.target.value)} />
                  </label>
                </div>
              )}

              <div className="button-row">
                <button type="button" className="btn-primary" onClick={handlePreview} disabled={busy}>
                  {busy ? 'Previewing...' : 'Preview item'}
                </button>
                <span className="field-hint">Nothing is saved until you confirm.</span>
              </div>

              {preview ? (
                <div className="preview-panel stack-md">
                  <div className="preview-grid">
                    <div className="preview-field">
                      <span className="field-label">Title</span>
                      <strong>{preview.parsedItem.title}</strong>
                    </div>
                    <div className="preview-field">
                      <span className="field-label">Owner</span>
                      <strong>{PERSON_LABELS[preview.parsedItem.owner]}</strong>
                    </div>
                    <div className="preview-field">
                      <span className="field-label">Status</span>
                      <strong>{preview.parsedItem.status.replace('_', ' ')}</strong>
                    </div>
                    <div className="preview-field">
                      <span className="field-label">Due</span>
                      <strong>{preview.parsedItem.dueText ?? 'No due date'}</strong>
                    </div>
                  </div>
                  {preview.ambiguities.length > 0 ? (
                    <ul className="warning-list">
                      {preview.ambiguities.map((ambiguity) => (
                        <li key={ambiguity}>{ambiguity}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="button-row">
                    <button type="button" className="btn-primary" onClick={handleConfirm} disabled={busy}>
                      {busy ? 'Saving...' : 'Confirm and save'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={resetComposer}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {error ? <p className="error-text">{error}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {role === 'spouse' ? <p className="screen-subtitle">Spouse mode is view-only in this first slice.</p> : null}

      {inboxQuery.isLoading ? <div className="panel-card">Loading tasks...</div> : null}
      {inboxQuery.isError ? <div className="panel-card">{(inboxQuery.error as Error).message}</div> : null}

      {filter === 'snoozed' ? <div className="panel-card empty-note">No snoozed tasks right now.</div> : null}
      {filter !== 'snoozed' && filteredItems.length === 0 && !inboxQuery.isLoading ? (
        <div className="panel-card empty-note">
          {filter === 'all' ? 'Nothing left to do today - nice work.' : `No ${FILTERS.find((item) => item.key === filter)?.label.toLowerCase()} tasks right now.`}
        </div>
      ) : null}

      {filter !== 'snoozed' ? (
        <div className="stack-md">
          {filteredItems.map((item) => {
            const badge = getTaskBadge(item, role);
            return (
              <Link key={item.id} to="/items/$itemId" params={{ itemId: item.id }} className={`task-card full task-${getTaskVariant(item, role)}`}>
                <span className="task-checkbox" aria-hidden="true" />
                <div className="task-main">
                  <div className="task-topline">
                    <strong className="task-title">{item.title}</strong>
                    {item.pendingSync ? <span className="task-badge badge-mint">Pending sync</span> : badge ? <span className={`task-badge badge-${badge.tone}`}>{badge.label}</span> : null}
                  </div>
                  <div className="task-bottomline">
                    <span className="task-meta">{getTaskMeta(item)}</span>
                    {item.owner !== 'unassigned' ? <span className="assignee-chip">{PERSON_LABELS[item.owner]}</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {filter === 'all' ? (
        <>
          <div className="divider" />
          <section className="stack-md">
            <span className="caps-label">Completed</span>
            {completedItems.map((item) => (
              <Link key={item.id} to="/items/$itemId" params={{ itemId: item.id }} className="task-card full is-complete">
                <span className="task-checkbox task-checkbox-checked" aria-hidden="true">✓</span>
                <div className="task-main">
                  <strong className="task-title">{item.title}</strong>
                  <span className="task-meta">{getTaskMeta(item)}</span>
                </div>
              </Link>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
