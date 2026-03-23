import {
  setupAccountResponseSchema,
  requestMagicLinkResponseSchema,
  verifyMagicLinkResponseSchema,
  setPinResponseSchema,
  verifyPinResponseSchema,
  authMeResponseSchema,
  generateInviteResponseSchema,
  claimInviteResponseSchema,
  householdMembersResponseSchema,
  type SetupAccountRequest,
  type SetupAccountResponse,
  type RequestMagicLinkRequest,
  type RequestMagicLinkResponse,
  type VerifyMagicLinkRequest,
  type VerifyMagicLinkResponse,
  type SetPinRequest,
  type VerifyPinRequest,
  type AuthMeResponse,
  type GenerateInviteRequest,
  type GenerateInviteResponse,
  type ClaimInviteRequest,
  type ClaimInviteResponse,
  type HouseholdMembersResponse,
} from '@olivia/contracts';
import { resolveApiUrl, ApiError } from './api';

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> ?? {}) };
  if (init?.body) {
    headers['Content-Type'] ??= 'application/json';
  }
  const response = await fetch(resolveApiUrl(path), { ...init, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (payload as { message?: string } | null)?.message ?? 'Request failed.',
      response.status,
      payload,
    );
  }
  return payload as T;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function checkAuthStatus(): Promise<{ initialized: boolean }> {
  return authRequest<{ initialized: boolean }>('/api/auth/status');
}

export async function setupAccount(req: SetupAccountRequest): Promise<SetupAccountResponse> {
  return setupAccountResponseSchema.parse(
    await authRequest<SetupAccountResponse>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  );
}

export async function requestMagicLink(req: RequestMagicLinkRequest): Promise<RequestMagicLinkResponse> {
  return requestMagicLinkResponseSchema.parse(
    await authRequest<RequestMagicLinkResponse>('/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  );
}

export async function verifyMagicLink(req: VerifyMagicLinkRequest): Promise<VerifyMagicLinkResponse> {
  return verifyMagicLinkResponseSchema.parse(
    await authRequest<VerifyMagicLinkResponse>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  );
}

export async function getCurrentUser(token: string): Promise<AuthMeResponse> {
  return authMeResponseSchema.parse(
    await authRequest<AuthMeResponse>('/api/auth/me', {
      headers: authHeaders(token),
    }),
  );
}

export async function setPin(token: string, req: SetPinRequest): Promise<{ ok: boolean }> {
  return setPinResponseSchema.parse(
    await authRequest<{ ok: boolean }>('/api/auth/pin/set', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(req),
    }),
  );
}

type VerifyPinResponse = { user: import('@olivia/contracts').User; sessionToken: string };

export async function verifyPin(req: VerifyPinRequest): Promise<VerifyPinResponse> {
  return verifyPinResponseSchema.parse(
    await authRequest<VerifyPinResponse>('/api/auth/pin/verify', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  );
}

export async function logoutSession(token: string): Promise<void> {
  await authRequest<void>('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function generateInvite(token: string, req?: GenerateInviteRequest): Promise<GenerateInviteResponse> {
  return generateInviteResponseSchema.parse(
    await authRequest<GenerateInviteResponse>('/api/household/invite', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(req ?? {}),
    }),
  );
}

export async function claimInvite(req: ClaimInviteRequest): Promise<ClaimInviteResponse> {
  return claimInviteResponseSchema.parse(
    await authRequest<ClaimInviteResponse>('/api/household/invite/claim', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  );
}

export async function getHouseholdMembers(token: string): Promise<HouseholdMembersResponse> {
  return householdMembersResponseSchema.parse(
    await authRequest<HouseholdMembersResponse>('/api/household/members', {
      headers: authHeaders(token),
    }),
  );
}

export async function revokeInvite(token: string, invitationId: string): Promise<void> {
  await authRequest<void>(`/api/household/invite/${invitationId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
