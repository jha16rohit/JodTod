/**
 * Group invitations API client.
 *
 * Single layer for the authenticated user's pending invitations.
 * Identity comes from the Bearer session; invitation IDs are
 * authorization-checked server-side (id + invitee).
 *
 * Backend routes (see backend/routes/invitations.py):
 *   GET  /api/invitations/mine
 *   POST /api/invitations/{id}/accept
 *   POST /api/invitations/{id}/decline
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 */

import { API_V1_BASE_URL } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

export interface GroupInvitation {
  id: string;
  group_name: string;
  invite_code: string;
  invited_by: string | null;
  status: string;
  created_at: string;
}

export class InvitationsApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "InvitationsApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseError(response: Response): Promise<{ detail?: string; code?: string }> {
  try {
    const body = (await response.json()) as { detail?: unknown; code?: unknown };
    return {
      detail: typeof body.detail === "string" ? body.detail : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
    };
  } catch {
    return {};
  }
}

function invitationOrNull(value: unknown): GroupInvitation | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Partial<GroupInvitation>;
  if (typeof v.id !== "string" || typeof v.group_name !== "string") return null;
  if (typeof v.invite_code !== "string" || typeof v.status !== "string") return null;
  return {
    id: v.id,
    group_name: v.group_name,
    invite_code: v.invite_code,
    invited_by: typeof v.invited_by === "string" ? v.invited_by : null,
    status: v.status,
    created_at: typeof v.created_at === "string" ? v.created_at : "",
  };
}

/** Never throws; malformed payloads yield [] (never undefined). */
export function invitationsOrEmpty(value: unknown): GroupInvitation[] {
  const list = (value as { invitations?: unknown } | null)?.invitations;
  if (!Array.isArray(list)) return [];
  const out: GroupInvitation[] = [];
  for (const item of list) {
    const parsed = invitationOrNull(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${path}`, {
      ...init,
      headers: { ...headers, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new InvitationsApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new InvitationsApiError(
      detail ?? `Invitation request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return (await response.json()) as T;
}

export async function fetchMyInvitations(): Promise<GroupInvitation[]> {
  return invitationsOrEmpty(await request<unknown>("/invitations/mine"));
}

export async function acceptInvitation(id: string): Promise<GroupInvitation | null> {
  return invitationOrNull(
    await request<unknown>(`/invitations/${encodeURIComponent(id)}/accept`, {
      method: "POST",
    }),
  );
}

export async function declineInvitation(id: string): Promise<GroupInvitation | null> {
  return invitationOrNull(
    await request<unknown>(`/invitations/${encodeURIComponent(id)}/decline`, {
      method: "POST",
    }),
  );
}
