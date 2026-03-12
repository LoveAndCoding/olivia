import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Owner } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { confirmUpdateCommand, loadItemDetail, previewUpdateCommand } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';

type UpdatePreviewState = {
  draftId: string;
  proposedChange: Parameters<typeof previewUpdateCommand>[3];
  summary: string;
};

export function ItemDetailPage() {
  const params = useParams({ from: '/items/$itemId' });
  const navigate = useNavigate();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [statusValue, setStatusValue] = useState<'open' | 'in_progress' | 'done' | 'deferred'>('in_progress');
  const [ownerValue, setOwnerValue] = useState<Owner>('stakeholder');
  const [dueText, setDueText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<UpdatePreviewState | null>(null);

  const itemQuery = useQuery({ queryKey: ['item-detail', role, params.itemId], queryFn: () => loadItemDetail(role, params.itemId) });

  const previewChange = async (proposedChange: UpdatePreviewState['proposedChange'], summary: string) => {
    if (!itemQuery.data) return;
    setBusy(true);
    setError(null);
    try {
      const response = await previewUpdateCommand(role, itemQuery.data.item.id, itemQuery.data.item.version, proposedChange);
      setPendingPreview({ draftId: response.draftId, proposedChange, summary });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = async () => {
    if (!itemQuery.data || !pendingPreview) return;
    setBusy(true);
    setError(null);
    try {
      await confirmUpdateCommand(role, itemQuery.data.item.id, itemQuery.data.item.version, pendingPreview.proposedChange, navigator.onLine ? pendingPreview.draftId : undefined);
      setPendingPreview(null);
      setNote('');
      setDueText('');
      await queryClient.invalidateQueries({ queryKey: ['item-detail', role, params.itemId] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          {/* Back button */}
          <button
            type="button"
            onClick={() => void navigate({ to: '/tasks' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--violet)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            ← Back to Tasks
          </button>

          {itemQuery.isLoading && (
            <div className="card"><p className="muted">Loading item…</p></div>
          )}
          {(itemQuery.isError || (!itemQuery.isLoading && !itemQuery.data)) && (
            <div className="card error-card">
              <p>{(itemQuery.error as Error)?.message ?? 'Item not found.'}</p>
            </div>
          )}

          {itemQuery.data && (() => {
            const { item, history, flags } = itemQuery.data;
            return (
              <>
                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">Item detail</span>
                      <h2 className="card-title">{item.title}</h2>
                      <p className="muted">
                        Owner: {item.owner === 'spouse' ? 'Alexander' : item.owner === 'stakeholder' ? 'Lexi' : 'Unassigned'} · Status: {item.status.replace('_', ' ')}
                      </p>
                    </div>
                    {item.pendingSync ? <span className="chip info">Pending sync</span> : null}
                  </div>
                  {item.description ? <p>{item.description}</p> : <p className="muted">No description yet.</p>}
                  <div className="chip-row">
                    {flags.overdue   ? <span className="chip danger">Overdue</span>  : null}
                    {flags.dueSoon   ? <span className="chip info">Due soon</span>   : null}
                    {flags.stale     ? <span className="chip warning">Stale</span>   : null}
                    {flags.unassigned? <span className="chip neutral">Unassigned</span> : null}
                  </div>
                  <p className="muted" style={{ fontSize: 12 }}>Due: {item.dueText ?? 'No due date'} · v{item.version}</p>
                </div>

                {role === 'stakeholder' ? (
                  <div className="card stack-md">
                    <div className="section-header">
                      <div className="stack-sm">
                        <span className="eyebrow">Update</span>
                        <h3 className="card-title" style={{ fontSize: 18 }}>Preview a change</h3>
                      </div>
                      <span className="section-note">Advisory-only — confirm before save</span>
                    </div>
                    <div className="update-grid">
                      <div className="stack-sm">
                        <span className="field-label">Status</span>
                        <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as typeof statusValue)}>
                          <option value="open">open</option>
                          <option value="in_progress">in progress</option>
                          <option value="done">done</option>
                          <option value="deferred">deferred</option>
                        </select>
                        <button type="button" className="secondary-button" onClick={() => previewChange({ status: statusValue }, `Change status to ${statusValue.replace('_', ' ')}`)}>
                          Preview status change
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Owner</span>
                        <select value={ownerValue} onChange={(e) => setOwnerValue(e.target.value as Owner)}>
                          <option value="stakeholder">Lexi (stakeholder)</option>
                          <option value="spouse">Alexander (spouse)</option>
                          <option value="unassigned">unassigned</option>
                        </select>
                        <button type="button" className="secondary-button" onClick={() => previewChange({ owner: ownerValue }, `Change owner to ${ownerValue}`)}>
                          Preview owner change
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Due text</span>
                        <input value={dueText} onChange={(e) => setDueText(e.target.value)} placeholder="next Friday" />
                        <button type="button" className="secondary-button" onClick={() => previewChange({ dueText }, `Change due date`)}>
                          Preview due date
                        </button>
                      </div>
                      <div className="stack-sm">
                        <span className="field-label">Add note</span>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Call the preferred vendor first" />
                        <button type="button" className="secondary-button" onClick={() => previewChange({ note }, 'Append note')}>
                          Preview note
                        </button>
                      </div>
                    </div>
                    {pendingPreview ? (
                      <div className="confirm-panel stack-sm">
                        <span className="field-label">Pending change</span>
                        <p>{pendingPreview.summary}</p>
                        <button type="button" className="primary-button" onClick={confirmChange} disabled={busy}>
                          {busy ? 'Confirming…' : 'Confirm change'}
                        </button>
                      </div>
                    ) : null}
                    {error ? <p className="error-text">{error}</p> : null}
                  </div>
                ) : (
                  <div className="card">
                    <p className="muted">You're viewing as Alexander. Updates are made by Lexi.</p>
                  </div>
                )}

                <div className="card stack-md">
                  <div className="section-header">
                    <div className="stack-sm">
                      <span className="eyebrow">History</span>
                      <h3 className="card-title" style={{ fontSize: 18 }}>Recent changes</h3>
                    </div>
                    <span className="section-note">Newest first</span>
                  </div>
                  {history.length === 0 ? <p className="muted">No history yet.</p> : null}
                  <ul className="history-list">
                    {history.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.eventType.replace('_', ' ')}</strong>
                        <span className="muted"> · {new Date(entry.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      <BottomNav activeTab="tasks" />
    </div>
  );
}
