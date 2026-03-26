import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@olivia/contracts';
import { useAuth } from '../lib/auth';
import { getHouseholdMembers } from '../lib/auth-api';
import { confirmCreateCommand, previewCreateCommand } from '../lib/sync';

export function AddPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, getSessionToken } = useAuth();
  const [members, setMembers] = useState<User[]>(currentUser ? [currentUser] : []);
  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    getHouseholdMembers(token).then(res => setMembers(res.members)).catch(() => {});
  }, [getSessionToken]);
  const [inputText, setInputText] = useState('');
  const [structuredMode, setStructuredMode] = useState(false);
  const [structuredTitle, setStructuredTitle] = useState('');
  const [structuredAssigneeUserId, setStructuredAssigneeUserId] = useState<string | null>(null);
  const [structuredDueText, setStructuredDueText] = useState('');
  const [structuredDescription, setStructuredDescription] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCreateCommand>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await previewCreateCommand(inputText);
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
      const savedItem = await confirmCreateCommand(preview.parsedItem, preview.draftId);
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      navigate({ to: '/items/$itemId', params: { itemId: savedItem.id } });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDirectCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const savedItem = await confirmCreateCommand({
        id,
        title: structuredTitle,
        assigneeUserId: structuredAssigneeUserId,
        status: 'open',
        dueText: structuredDueText || null,
        dueAt: null,
        description: structuredDescription || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-view'] });
      navigate({ to: '/items/$itemId', params: { itemId: savedItem.id } });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="card hero-card accent-capture stack-md">
        <div className="section-header">
          <div className="stack-sm">
            <p className="eyebrow">Capture</p>
            <h2>Add a household item</h2>
            <p className="muted">
              Keep the fast freeform path, but make the confirmation flow feel more intentional and easier to scan.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setStructuredMode((value) => !value)}>
            {structuredMode ? 'Use freeform capture' : 'Use structured fallback'}
          </button>
        </div>
        {!structuredMode ? (
          <label className="stack-sm">
            <span className="field-label">Freeform input</span>
            <textarea value={inputText} onChange={(event) => setInputText(event.target.value)} rows={5} placeholder="Add: schedule HVAC service, due end of March, assign to Christian" />
            <span className="field-hint">Use natural language for the fastest capture path.</span>
          </label>
        ) : (
          <div className="form-grid">
            <label className="stack-sm">
              <span className="field-label">Title</span>
              <input value={structuredTitle} onChange={(event) => setStructuredTitle(event.target.value)} />
            </label>
            <label className="stack-sm">
              <span className="field-label">Assignee</span>
              <select value={structuredAssigneeUserId ?? ''} onChange={(event) => setStructuredAssigneeUserId(event.target.value || null)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="stack-sm">
              <span className="field-label">Due text</span>
              <input value={structuredDueText} onChange={(event) => setStructuredDueText(event.target.value)} placeholder="end of March" />
            </label>
            <label className="stack-sm form-grid-span">
              <span className="field-label">Description</span>
              <textarea value={structuredDescription} onChange={(event) => setStructuredDescription(event.target.value)} rows={4} />
            </label>
          </div>
        )}
        <div className="button-row">
          {structuredMode ? (
            <button type="button" className="primary-button" onClick={handleDirectCreate} disabled={busy}>{busy ? 'Adding…' : 'Add item'}</button>
          ) : (
            <button type="button" className="primary-button" onClick={handlePreview} disabled={busy}>{busy ? 'Previewing…' : 'Preview item'}</button>
          )}
          {!structuredMode && <span className="field-hint">Olivia will parse your input — review before saving.</span>}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card accent-guidance stack-md">
        <div className="section-header">
          <div className="stack-sm">
            <p className="eyebrow">Guidance</p>
            <h2>Capture habits this design favors</h2>
          </div>
          <span className="section-note">Fast enough to use in ordinary life</span>
        </div>
        <ul className="warning-list muted">
          <li>Put the title first, then add owner and due text if they matter.</li>
          <li>Use the structured fallback when parsing confidence is likely to be low.</li>
          <li>Expect one quick confirmation step before anything reaches durable memory.</li>
        </ul>
      </section>

      {preview ? (
        <section className="card accent-confirm stack-md">
          <div className="section-header">
            <div className="stack-sm">
              <p className="eyebrow">Review</p>
              <h2>Confirm before save</h2>
            </div>
            <span className="section-note">Advisory-only write gate</span>
          </div>
          <div className="preview-grid">
            <div className="preview-field">
              <span className="field-label">Title</span>
              <strong>{preview.parsedItem.title}</strong>
            </div>
            <div className="preview-field">
              <span className="field-label">Assignee</span>
              <strong>{preview.parsedItem.assigneeUserId ? members.find(m => m.id === preview.parsedItem.assigneeUserId)?.name ?? 'Unknown' : 'Unassigned'}</strong>
            </div>
            <div className="preview-field">
              <span className="field-label">Status</span>
              <strong>{preview.parsedItem.status.replace('_', ' ')}</strong>
            </div>
            <div className="preview-field">
              <span className="field-label">Due</span>
              <strong>{preview.parsedItem.dueText ?? 'No due date'}</strong>
            </div>
            <div className="preview-field form-grid-span">
              <span className="field-label">Parse confidence</span>
              <strong>{preview.parseConfidence}</strong>
            </div>
          </div>
          {preview.ambiguities.length > 0 ? <ul className="warning-list">{preview.ambiguities.map((ambiguity) => <li key={ambiguity}>{ambiguity}</li>)}</ul> : null}
          <button type="button" className="primary-button" onClick={handleConfirm} disabled={busy}>{busy ? 'Saving…' : 'Confirm and save'}</button>
        </section>
      ) : null}
    </div>
  );
}
