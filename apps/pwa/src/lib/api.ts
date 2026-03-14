import {
  cancelReminderResponseSchema,
  completeReminderResponseSchema,
  confirmCreateReminderResponseSchema,
  itemDetailResponseSchema,
  inboxViewResponseSchema,
  previewCreateResponseSchema,
  previewCreateReminderResponseSchema,
  previewUpdateResponseSchema,
  previewUpdateReminderResponseSchema,
  reminderDetailResponseSchema,
  reminderSettingsResponseSchema,
  reminderViewResponseSchema,
  saveReminderNotificationPreferencesResponseSchema,
  snoozeReminderResponseSchema,
  type ActorRole,
  type CancelReminderResponse,
  type CompleteReminderResponse,
  type ConfirmCreateResponse,
  type ConfirmCreateReminderResponse,
  type ConfirmUpdateResponse,
  type ConfirmUpdateReminderResponse,
  type DraftItem,
  type DraftReminder,
  type ItemDetailResponse,
  type InboxViewResponse,
  type PreviewCreateResponse,
  type PreviewCreateReminderResponse,
  type PreviewUpdateResponse,
  type PreviewUpdateReminderResponse,
  type ReminderDetailResponse,
  type ReminderNotificationPreferencesInput,
  type ReminderSettingsResponse,
  type ReminderUpdateChange,
  type ReminderViewResponse,
  type SnoozeReminderResponse,
  type StructuredInput,
  type StructuredReminderInput,
  type UpdateChange
} from '@olivia/contracts';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';

function normalizeBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim();
  if (!trimmedBasePath || trimmedBasePath === '/') {
    return '';
  }

  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, '')}`;
}

function stripDuplicatePrefix(pathname: string, basePath: string): string {
  if (!basePath) {
    return pathname;
  }

  if (pathname === basePath) {
    return '';
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }

  return pathname;
}

export function resolveApiUrl(path: string, baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL): string {
  const requestUrl = new URL(path.startsWith('/') ? path : `/${path}`, 'http://olivia.local');

  if (/^https?:\/\//i.test(baseUrl)) {
    const resolvedBaseUrl = new URL(baseUrl);
    const basePath = normalizeBasePath(resolvedBaseUrl.pathname);
    resolvedBaseUrl.pathname = `${basePath}${stripDuplicatePrefix(requestUrl.pathname, basePath)}` || '/';
    resolvedBaseUrl.search = requestUrl.search;
    resolvedBaseUrl.hash = requestUrl.hash;
    return resolvedBaseUrl.toString();
  }

  const basePath = normalizeBasePath(baseUrl);
  return `${basePath}${stripDuplicatePrefix(requestUrl.pathname, basePath)}${requestUrl.search}${requestUrl.hash}` || '/';
}

export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly payload: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError((payload as { message?: string } | null)?.message ?? 'Request failed.', response.status, payload);
  }
  return payload as T;
}

export async function fetchInboxView(role: ActorRole): Promise<InboxViewResponse> {
  return inboxViewResponseSchema.parse(await request<InboxViewResponse>(`/api/inbox/items?actorRole=${role}&view=all`));
}

export async function fetchItemDetail(role: ActorRole, itemId: string): Promise<ItemDetailResponse> {
  return itemDetailResponseSchema.parse(await request<ItemDetailResponse>(`/api/inbox/items/${itemId}?actorRole=${role}`));
}

export async function previewCreate(role: ActorRole, inputText?: string, structuredInput?: Partial<StructuredInput>): Promise<PreviewCreateResponse> {
  return previewCreateResponseSchema.parse(
    await request<PreviewCreateResponse>('/api/inbox/items/preview-create', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, inputText, structuredInput })
    })
  );
}

export async function confirmCreate(role: ActorRole, finalItem: DraftItem, draftId?: string): Promise<ConfirmCreateResponse> {
  return request<ConfirmCreateResponse>('/api/inbox/items/confirm-create', {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, draftId, approved: true, finalItem })
  });
}

export async function previewUpdate(role: ActorRole, itemId: string, expectedVersion: number, proposedChange: UpdateChange): Promise<PreviewUpdateResponse> {
  return previewUpdateResponseSchema.parse(
    await request<PreviewUpdateResponse>('/api/inbox/items/preview-update', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, itemId, expectedVersion, proposedChange })
    })
  );
}

export async function confirmUpdate(role: ActorRole, itemId: string, expectedVersion: number, proposedChange?: UpdateChange, draftId?: string): Promise<ConfirmUpdateResponse> {
  return request<ConfirmUpdateResponse>('/api/inbox/items/confirm-update', {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, itemId, expectedVersion, draftId, approved: true, proposedChange })
  });
}

export async function saveNotificationSubscription(role: ActorRole) {
  return request<{ subscription: unknown }>('/api/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      actorRole: role,
      endpoint: `${window.location.origin}/notifications/${role}`,
      payload: { permission: Notification.permission, userAgent: navigator.userAgent, storedAt: new Date().toISOString() }
    })
  });
}

export async function listNotificationSubscriptions(role: ActorRole) {
  return request<{ subscriptions: unknown[] }>(`/api/notifications/subscriptions?actorRole=${role}`);
}

export async function fetchReminderView(role: ActorRole): Promise<ReminderViewResponse> {
  return reminderViewResponseSchema.parse(await request<ReminderViewResponse>(`/api/reminders?actorRole=${role}`));
}

export async function fetchReminderDetail(role: ActorRole, reminderId: string): Promise<ReminderDetailResponse> {
  return reminderDetailResponseSchema.parse(await request<ReminderDetailResponse>(`/api/reminders/${reminderId}?actorRole=${role}`));
}

export async function previewCreateReminder(
  role: ActorRole,
  inputText?: string,
  structuredInput?: Partial<StructuredReminderInput>
): Promise<PreviewCreateReminderResponse> {
  return previewCreateReminderResponseSchema.parse(
    await request<PreviewCreateReminderResponse>('/api/reminders/preview-create', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, inputText, structuredInput })
    })
  );
}

export async function confirmCreateReminder(
  role: ActorRole,
  finalReminder: DraftReminder,
  draftId?: string
): Promise<ConfirmCreateReminderResponse> {
  return confirmCreateReminderResponseSchema.parse(
    await request<ConfirmCreateReminderResponse>('/api/reminders/confirm-create', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, draftId, approved: true, finalReminder })
    })
  );
}

export async function previewUpdateReminder(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<PreviewUpdateReminderResponse> {
  return previewUpdateReminderResponseSchema.parse(
    await request<PreviewUpdateReminderResponse>('/api/reminders/preview-update', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, proposedChange })
    })
  );
}

export async function confirmUpdateReminder(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<ConfirmUpdateReminderResponse> {
  return request<ConfirmUpdateReminderResponse>('/api/reminders/confirm-update', {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true, proposedChange })
  });
}

export async function completeReminder(role: ActorRole, reminderId: string, expectedVersion: number): Promise<CompleteReminderResponse> {
  return completeReminderResponseSchema.parse(
    await request<CompleteReminderResponse>('/api/reminders/complete', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true })
    })
  );
}

export async function snoozeReminder(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  snoozedUntil: string
): Promise<SnoozeReminderResponse> {
  return snoozeReminderResponseSchema.parse(
    await request<SnoozeReminderResponse>('/api/reminders/snooze', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true, snoozedUntil })
    })
  );
}

export async function cancelReminder(role: ActorRole, reminderId: string, expectedVersion: number): Promise<CancelReminderResponse> {
  return cancelReminderResponseSchema.parse(
    await request<CancelReminderResponse>('/api/reminders/cancel', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true })
    })
  );
}

export async function fetchReminderSettings(role: ActorRole): Promise<ReminderSettingsResponse> {
  return reminderSettingsResponseSchema.parse(await request<ReminderSettingsResponse>(`/api/reminders/settings?actorRole=${role}`));
}

export async function saveReminderSettings(
  role: ActorRole,
  preferences: ReminderNotificationPreferencesInput
): Promise<ReminderSettingsResponse> {
  return saveReminderNotificationPreferencesResponseSchema.parse(
    await request<ReminderSettingsResponse>('/api/reminders/settings', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, preferences })
    })
  );
}
