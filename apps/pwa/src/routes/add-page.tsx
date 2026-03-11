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
    return <section className="card">The spouse role is read-only in this slice, so add-item capture stays with the stakeholder.</section>;
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
    <div className="stack-lg">
      <section className="card stack-md">
        <div className="section-header">
          <h2>Add a household item</h2>
          <button type="button" className="text-button" onClick={() => setStructuredMode((value) => !value)}>
            {structuredMode ? 'Use freeform capture' : 'Use structured fallback'}
          </button>
        </div>
        {!structuredMode ? (
          <label className="stack-sm">
            Freeform input
            <textarea value={inputText} onChange={(event) => setInputText(event.target.value)} rows={5} placeholder="Add: schedule HVAC service, due end of March, owner spouse" />
          </label>
        ) : (
          <div className="stack-md">
            <label className="stack-sm">Title<input value={structuredTitle} onChange={(event) => setStructuredTitle(event.target.value)} /></label>
            <label className="stack-sm">Owner<select value={structuredOwner} onChange={(event) => setStructuredOwner(event.target.value as Owner)}><option value="unassigned">unassigned</option><option value="stakeholder">stakeholder</option><option value="spouse">spouse</option></select></label>
            <label className="stack-sm">Due text<input value={structuredDueText} onChange={(event) => setStructuredDueText(event.target.value)} placeholder="end of March" /></label>
            <label className="stack-sm">Description<textarea value={structuredDescription} onChange={(event) => setStructuredDescription(event.target.value)} rows={4} /></label>
          </div>
        )}
        <button type="button" className="primary-button" onClick={handlePreview} disabled={busy}>{busy ? 'Previewing…' : 'Preview item'}</button>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      {preview ? (
        <section className="card stack-md">
          <div className="section-header"><h2>Confirm before save</h2><span className="muted">Advisory-only write gate</span></div>
          <p><strong>{preview.parsedItem.title}</strong></p>
          <p className="muted">Owner: {preview.parsedItem.owner} · Status: {preview.parsedItem.status.replace('_', ' ')}</p>
          <p className="muted">Due: {preview.parsedItem.dueText ?? 'No due date'}</p>
          <p className="muted">Parse confidence: {preview.parseConfidence}</p>
          {preview.ambiguities.length > 0 ? <ul className="warning-list">{preview.ambiguities.map((ambiguity) => <li key={ambiguity}>{ambiguity}</li>)}</ul> : null}
          <button type="button" className="primary-button" onClick={handleConfirm} disabled={busy}>{busy ? 'Saving…' : 'Confirm and save'}</button>
        </section>
      ) : null}
    </div>
  );
}
