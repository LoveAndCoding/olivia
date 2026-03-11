import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';

const createConfig = (dbPath: string): AppConfig => ({
  port: 0,
  dbPath,
  staleThresholdDays: 14,
  dueSoonDays: 7,
  aiProvider: 'disabled'
});

describe('household inbox api', () => {
  it('requires preview and approval before writes are persisted', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'stakeholder',
        inputText: 'Add: schedule HVAC service, owner me, due next Friday'
      }
    });

    expect(preview.statusCode).toBe(200);
    const previewBody = preview.json();

    const beforeConfirm = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=stakeholder&view=all'
    });
    expect(beforeConfirm.json().itemsByStatus.open).toHaveLength(0);

    const confirm = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-create',
      payload: {
        actorRole: 'stakeholder',
        draftId: previewBody.draftId,
        approved: true,
        finalItem: previewBody.parsedItem
      }
    });

    expect(confirm.statusCode).toBe(200);

    const afterConfirm = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=stakeholder&view=all'
    });
    expect(afterConfirm.json().itemsByStatus.open).toHaveLength(1);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('rejects spouse write attempts while allowing read-only access', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const spouseWrite = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'spouse',
        inputText: 'Add: order filters'
      }
    });

    expect(spouseWrite.statusCode).toBe(403);
    expect(spouseWrite.json().code).toBe('ROLE_READ_ONLY');

    const spouseRead = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=spouse&view=active'
    });

    expect(spouseRead.statusCode).toBe(200);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('rejects stale version updates with a version conflict', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'stakeholder',
        inputText: 'Add: call the plumber, owner me'
      }
    });
    const previewBody = preview.json();

    const confirm = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-create',
      payload: {
        actorRole: 'stakeholder',
        draftId: previewBody.draftId,
        approved: true,
        finalItem: previewBody.parsedItem
      }
    });

    const created = confirm.json().savedItem;

    const firstUpdate = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: created.id,
        expectedVersion: created.version,
        approved: true,
        proposedChange: { status: 'in_progress' }
      }
    });
    expect(firstUpdate.statusCode).toBe(200);

    const staleUpdate = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: created.id,
        expectedVersion: created.version,
        approved: true,
        proposedChange: { status: 'done' }
      }
    });

    expect(staleUpdate.statusCode).toBe(409);
    expect(staleUpdate.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
