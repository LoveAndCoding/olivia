import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Owner } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { confirmCreateCommand, previewCreateCommand } from '../lib/sync';

export function AddPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const [inputText, setInputText] = useState('');
  const [structuredMode, setStructuredMode] = useState(false);
  const [structuredTitle, setStructuredTitle] = useState('');
  const [structuredOwner, setStructuredOwner] = useState<Owner>('unassigned');
  const [structuredDueText, setStructuredDueText] = useState('');
  const [structuredDescription, setStructuredDescription] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCreateCommand>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (role === 'spouse') {
    return <section className="panel-card">The spouse role is read-only in this slice, so add-item capture stays with the stakeholder.</section>;
  }

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await previewCreateCommand(
        role,
        structuredMode ? undefined : inputText,
        structuredMode ? { title: structuredTitle, owner: structuredOwner, dueText: structuredDueText || null, description: structuredDescription || null } : undefined
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
      await queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
      navigate({ to: '/items/$itemId', params: { itemId: savedItem.id } });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen stack-lg">
      <section className="stack-sm">
        <span className="caps-label">Capture</span>
        <h1 className="screen-title">Add a household item</h1>
        <p className="screen-subtitle">Use freeform capture for speed, or switch to structured entry when you want more control.</p>
      </section>

      <section className="panel-card stack-md">
        <div className="composer-header">
          <div className="stack-sm">
            <span className="caps-label">Create task</span>
            <h2 className="section-title">Preview before save</h2>
          </div>
          <button type="button" className="ghost-link" onClick={() => setStructuredMode((value) => !value)}>
            {structuredMode ? 'Use freeform capture' : 'Use structured fallback'}
          </button>
        </div>
        {!structuredMode ? (
          <label className="stack-sm">
            <span className="field-label">Freeform input</span>
            <textarea className="form-textarea" value={inputText} onChange={(event) => setInputText(event.target.value)} rows={5} placeholder="Add: schedule HVAC service, due end of March, owner spouse" />
            <span className="field-hint">Use natural language for the fastest capture path.</span>
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
                <option value="unassigned">unassigned</option>
                <option value="stakeholder">stakeholder</option>
                <option value="spouse">spouse</option>
              </select>
            </label>
            <label className="stack-sm">
              <span className="field-label">Due text</span>
              <input value={structuredDueText} onChange={(event) => setStructuredDueText(event.target.value)} placeholder="end of March" />
            </label>
            <label className="stack-sm form-grid-span">
              <span className="field-label">Description</span>
              <textarea className="form-textarea" value={structuredDescription} onChange={(event) => setStructuredDescription(event.target.value)} rows={4} />
            </label>
          </div>
        )}
        <div className="button-row">
          <button type="button" className="btn-primary" onClick={handlePreview} disabled={busy}>{busy ? 'Previewing...' : 'Preview item'}</button>
          <span className="field-hint">Nothing is saved until you confirm the parsed item.</span>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel-card stack-md">
        <div className="section-header-row">
          <div className="stack-sm">
            <span className="caps-label">Guidance</span>
            <h2 className="section-title">Capture habits this design favors</h2>
          </div>
          <span className="section-link disabled-link">Fast enough to use in ordinary life</span>
        </div>
        <ul className="warning-list muted">
          <li>Put the title first, then add owner and due text if they matter.</li>
          <li>Use the structured fallback when parsing confidence is likely to be low.</li>
          <li>Expect one quick confirmation step before anything reaches durable memory.</li>
        </ul>
      </section>

      {preview ? (
        <section className="panel-card stack-md">
          <div className="section-header-row">
            <div className="stack-sm">
              <span className="caps-label">Review</span>
              <h2 className="section-title">Confirm before save</h2>
            </div>
            <span className="section-link disabled-link">Advisory-only write gate</span>
          </div>
          <div className="preview-grid">
            <div className="preview-field">
              <span className="field-label">Title</span>
              <strong>{preview.parsedItem.title}</strong>
            </div>
            <div className="preview-field">
              <span className="field-label">Owner</span>
              <strong>{preview.parsedItem.owner}</strong>
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
          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={busy}>{busy ? 'Saving...' : 'Confirm and save'}</button>
        </section>
      ) : null}
    </div>
  );
}
