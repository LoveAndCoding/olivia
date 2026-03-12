import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Owner } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { confirmUpdateCommand, loadItemDetail, previewUpdateCommand } from '../lib/sync';

type UpdatePreviewState = {
  draftId: string;
  proposedChange: Parameters<typeof previewUpdateCommand>[3];
  summary: string;
};

export function ItemDetailPage() {
  const params = useParams({ from: '/items/$itemId' });
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

  if (itemQuery.isLoading) return <section className="card">Loading item…</section>;
  if (itemQuery.isError || !itemQuery.data) return <section className="card error-card">{(itemQuery.error as Error)?.message ?? 'Item not found.'}</section>;

  const { item, history, flags } = itemQuery.data;

  return (
    <div className="stack-lg">
      <section className="card hero-card accent-detail stack-md">
        <div className="section-header">
          <div className="stack-sm">
            <p className="eyebrow">Item detail</p>
            <h2>{item.title}</h2>
            <p className="muted">Owner: {item.owner} · Status: {item.status.replace('_', ' ')}</p>
          </div>
          {item.pendingSync ? <span className="chip pending">Pending sync</span> : null}
        </div>
        {item.description ? <p>{item.description}</p> : <p className="muted">No description or notes yet.</p>}
        <div className="chip-row">
          {flags.overdue ? <span className="chip danger">Overdue</span> : null}
          {flags.dueSoon ? <span className="chip info">Due soon</span> : null}
          {flags.stale ? <span className="chip warning">Stale</span> : null}
          {flags.unassigned ? <span className="chip neutral">Unassigned</span> : null}
        </div>
        <p className="muted">Due: {item.dueText ?? 'No due date'} · Version {item.version}</p>
      </section>

      {role === 'stakeholder' ? (
        <section className="card accent-update stack-md">
          <div className="section-header">
            <div className="stack-sm">
              <p className="eyebrow">Update</p>
              <h2>Preview an update</h2>
            </div>
            <span className="section-note">Every write requires confirmation</span>
          </div>
          <div className="update-grid">
            <div className="stack-sm">
              <span className="field-label">Status</span>
              <select value={statusValue} onChange={(event) => setStatusValue(event.target.value as typeof statusValue)}>
                <option value="open">open</option><option value="in_progress">in progress</option><option value="done">done</option><option value="deferred">deferred</option>
              </select>
              <button type="button" className="secondary-button" onClick={() => previewChange({ status: statusValue }, `Change status to ${statusValue.replace('_', ' ')}`)}>Preview status change</button>
            </div>
            <div className="stack-sm">
              <span className="field-label">Owner</span>
              <select value={ownerValue} onChange={(event) => setOwnerValue(event.target.value as Owner)}>
                <option value="stakeholder">stakeholder</option><option value="spouse">spouse</option><option value="unassigned">unassigned</option>
              </select>
              <button type="button" className="secondary-button" onClick={() => previewChange({ owner: ownerValue }, `Change owner to ${ownerValue}`)}>Preview owner change</button>
            </div>
            <div className="stack-sm">
              <span className="field-label">Due text</span>
              <input value={dueText} onChange={(event) => setDueText(event.target.value)} placeholder="next Friday" />
              <button type="button" className="secondary-button" onClick={() => previewChange({ dueText }, `Change due date to ${dueText || 'empty'}`)}>Preview due date</button>
            </div>
            <div className="stack-sm">
              <span className="field-label">Add note</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Call the preferred vendor first" />
              <button type="button" className="secondary-button" onClick={() => previewChange({ note }, 'Append note to the item')}>Preview note</button>
            </div>
          </div>
          {pendingPreview ? (
            <div className="confirm-panel stack-sm">
              <span className="field-label">Pending change</span>
              <p>{pendingPreview.summary}</p>
              <button type="button" className="primary-button" onClick={confirmChange} disabled={busy}>{busy ? 'Confirming…' : 'Confirm change'}</button>
            </div>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </section>
      ) : <section className="card">Spouse mode reuses the same detail view but intentionally hides write controls.</section>}

      <section className="card accent-history stack-md">
        <div className="section-header">
          <div className="stack-sm">
            <p className="eyebrow">History</p>
            <h2>Recent changes</h2>
          </div>
          <span className="section-note">Newest first</span>
        </div>
        {history.length === 0 ? <p className="muted">No history entries yet.</p> : null}
        <ul className="history-list">{history.map((entry) => <li key={entry.id}><strong>{entry.eventType.replace('_', ' ')}</strong><span className="muted"> {new Date(entry.createdAt).toLocaleString()}</span></li>)}</ul>
      </section>
    </div>
  );
}
