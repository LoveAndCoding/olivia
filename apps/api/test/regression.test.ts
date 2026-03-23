/**
 * Regression tests for past bug failure modes.
 *
 * Each test references the original issue that introduced the bug
 * so future readers can trace the failure mode.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { subDays } from 'date-fns';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';

const createConfig = (dbPath: string): AppConfig => ({
  port: 0,
  dbPath,
  staleThresholdDays: 14,
  dueSoonDays: 7,
  aiProvider: 'disabled',
  notificationsEnabled: false,
  vapidPublicKey: null,
  vapidPrivateKey: null,
  vapidContact: 'mailto:test@localhost',
  notificationRules: { dueSoonEnabled: false, staleItemEnabled: false, digestEnabled: false },
  notificationIntervalMs: 3_600_000,
  nudgePushIntervalMs: 1_800_000,
  pwaOrigin: 'http://localhost:4173',
  householdTimezone: 'UTC',
  apns: { keyId: null, teamId: null, privateKey: null, bundleId: 'com.loveandcoding.olivia', useSandbox: true },
  paperclip: { apiUrl: null, apiKey: null, companyId: null, sreAgentId: null },
  auth: { enabled: false, resendApiKey: null },
});

function makeDir() {
  const dir = mkdtempSync(join(tmpdir(), 'olivia-regression-'));
  return { dir, dbPath: join(dir, 'test.sqlite') };
}

// ── OLI-234: Routine completion URL interpolation ───────────────────────────
//
// Bug: The `completeRoutineOccurrence` API client used a template literal where
// `routineId` was not interpolated, resulting in the URL containing the literal
// string "${routineId}" instead of the actual UUID. The server would then return
// 404 because no routine matched that malformed ID.
//
// Regression guard: verify that the complete endpoint resolves the routineId
// parameter correctly and returns 200 (not 404) with the expected routine data.

describe('OLI-234: routine completion URL must include the real routineId', () => {
  it('completes a routine via /api/routines/:routineId/complete with an actual UUID', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    // Create a routine
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Water the plants',
        owner: 'stakeholder',
        recurrenceRule: 'daily',
        firstDueDate: subDays(new Date(), 1).toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();

    // Complete the routine using the exact URL pattern the PWA client uses.
    // The original bug produced a URL like /api/routines/${routineId}/complete
    // instead of /api/routines/<actual-uuid>/complete.
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', routineId: savedRoutine.id, expectedVersion: savedRoutine.version }
    });

    // Must be 200, NOT 404. A 404 would indicate the routineId was not interpolated.
    expect(completeRes.statusCode).toBe(200);

    const body = completeRes.json();
    expect(body.occurrence).toBeDefined();
    expect(body.occurrence.routineId).toBe(savedRoutine.id);
    expect(body.savedRoutine.id).toBe(savedRoutine.id);
    expect(body.savedRoutine.version).toBe(savedRoutine.version + 1);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns 404 when routineId is a literal string (simulating the original bug)', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    // Simulate the broken URL that the bug would have produced
    const res = await app.inject({
      method: 'POST',
      url: '/api/routines/${routineId}/complete',
      payload: { actorRole: 'stakeholder', routineId: 'fake', expectedVersion: 1 }
    });

    // The server rejects this — Zod validation fails on the non-UUID string.
    // The important thing is it does NOT return 200 (which would mean an
    // accidental match). 400 (bad request) or 404 (not found) are both correct.
    expect([400, 404]).toContain(res.statusCode);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

// ── OLI-186: Blank onboarding when AI unavailable ───────────────────────────
//
// Bug: The onboarding screen went completely blank when AI session creation
// failed. The root cause was that the API did not return a structured error
// the frontend could act on, causing the page to render nothing.
//
// Regression guard: verify that the API returns structured 503 responses with
// the AI_UNAVAILABLE code so the frontend can display a meaningful fallback.

describe('OLI-186: onboarding returns structured 503 when AI is unavailable', () => {
  it('POST /api/onboarding/start returns 503 with AI_UNAVAILABLE code', async () => {
    const { dir, dbPath } = makeDir();
    // Config has aiProvider: 'disabled', so chatClient will be null
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({ method: 'POST', url: '/api/onboarding/start' });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    // The response must include a machine-readable code so the frontend
    // can distinguish "AI unavailable" from other 503s and render the
    // error state instead of a blank page.
    expect(body.code).toBe('AI_UNAVAILABLE');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('POST /api/onboarding/messages returns 503 with AI_UNAVAILABLE code', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding/messages',
      payload: { content: 'Tell me about meal planning' }
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.code).toBe('AI_UNAVAILABLE');
    expect(body.message).toBeDefined();

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /api/onboarding/state still returns 200 even when AI is unavailable', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    // The state endpoint must always work so the frontend can decide
    // what UI to show. If this returned 503, the page would have no
    // data at all and render blank.
    const res = await app.inject({ method: 'GET', url: '/api/onboarding/state' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.needsOnboarding).toBeDefined();
    expect(body.session).toBeDefined();

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
