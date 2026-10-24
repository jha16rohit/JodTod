/**
 * My Profile API client.
 *
 * Single layer that talks to the profile endpoints. Screens must use
 * these helpers instead of calling the endpoints directly.
 *
 * Backend routes (see backend/routes/users.py — all derive identity
 * from the Bearer session, never from a client-supplied user_id):
 *   GET    /api/users/me/profile
 *   PATCH  /api/users/me
 *   POST   /api/users/me/photo
 *   DELETE /api/users/me/photo
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 */

import {
  API_BASE_URL,
  API_V1_BASE_URL,
  AUTH_API_PATHS,
  AUTH_TIMEOUTS,
} from "../constants/auth.constants";
import type { AuthUser } from "../types/auth.types";
import { authorizedFetch, getAuthorizationHeader } from "./auth.api";

export interface ProfileCollectionSummary {
  count: number;
  items: unknown[];
}

export interface ProfileActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  amount: string | null;
  occurred_at: string | null;
  group_name: string | null;
  actor_name: string | null;
  status: string | null;
}

export interface ProfileDashboard {
  profile: AuthUser;
  groups: ProfileCollectionSummary;
  expenses: ProfileCollectionSummary;
  trips: ProfileCollectionSummary;
  settlements: ProfileCollectionSummary;
  /** Server-calculated account-health indicator (status + inputs). */
  account_health: AccountHealth;
  recent_activities: ProfileActivityItem[];
}

export type AccountHealthStatus = "active" | "dormant" | "high_spend";
export type AccountHealthColor = "green" | "yellow" | "red";

export interface AccountHealth {
  status: AccountHealthStatus;
  status_color: AccountHealthColor;
  status_label: string;
  expense_total: number;
  expense_threshold: number;
  last_activity_at: string | null;
  inactivity_threshold_days: number;
}

function accountHealthOrFallback(value: unknown): AccountHealth {
  const fallback: AccountHealth = {
    status: "active",
    status_color: "green",
    status_label: "Active",
    expense_total: 0,
    expense_threshold: 10000,
    last_activity_at: null,
    inactivity_threshold_days: 90,
  };
  if (typeof value !== "object" || value === null) {
    return fallback;
  }
  const v = value as Partial<AccountHealth>;
  const status: AccountHealthStatus =
    v.status === "dormant" || v.status === "high_spend" ? v.status : "active";
  const color: AccountHealthColor =
    v.status_color === "yellow" || v.status_color === "red"
      ? v.status_color
      : "green";
  return {
    status,
    status_color: color,
    status_label: typeof v.status_label === "string" ? v.status_label : fallback.status_label,
    expense_total: typeof v.expense_total === "number" ? v.expense_total : 0,
    expense_threshold: typeof v.expense_threshold === "number" ? v.expense_threshold : 10000,
    last_activity_at: typeof v.last_activity_at === "string" ? v.last_activity_at : null,
    inactivity_threshold_days:
      typeof v.inactivity_threshold_days === "number" ? v.inactivity_threshold_days : 90,
  };
}

export class ProfileApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "ProfileApiError";
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

function collectionOrEmpty(value: unknown): ProfileCollectionSummary {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { count?: unknown }).count === "number" &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    const v = value as ProfileCollectionSummary;
    return { count: v.count, items: v.items };
  }
  return { count: 0, items: [] };
}

/**
 * Resolve a backend avatar reference to a fetchable URL.
 *
 * The API stores a relative path ("/uploads/..."); absolute URLs pass
 * through unchanged; null/empty stays null (caller shows the placeholder).
 */
export function resolvePhotoUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl || !avatarUrl.trim()) {
    return null;
  }
  const trimmed = avatarUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${path}`;
}

export async function fetchProfileDashboard(): Promise<ProfileDashboard> {
  // Shared request path: Bearer token, timeout, and a single
  // refresh + retry on 401. Error mapping stays local to this service.
  let response: Response;
  try {
    response = await authorizedFetch(AUTH_API_PATHS.PROFILE_DASHBOARD, {
      method: "GET",
    });
  } catch (error) {
    throw new ProfileApiError(
      error instanceof Error && error.name === "AbortError"
        ? "The request timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new ProfileApiError(
      detail ?? `Profile request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }

  const body = (await response.json()) as Partial<ProfileDashboard>;
  if (!body || typeof body !== "object" || !body.profile) {
    throw new ProfileApiError("Unexpected profile response from server.", response.status);
  }

  return {
    profile: body.profile,
    groups: collectionOrEmpty(body.groups),
    expenses: collectionOrEmpty(body.expenses),
    trips: collectionOrEmpty(body.trips),
    settlements: collectionOrEmpty(body.settlements),
    account_health: accountHealthOrFallback(body.account_health),
    recent_activities: Array.isArray(body.recent_activities)
      ? body.recent_activities
      : [],
  };
}

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  phone?: string;
}

/**
 * PATCH /api/users/me — update Full Name / Username / Phone Number.
 *
 * Email is intentionally not accepted here (read-only on the Personal
 * Information page). Returns the updated user record.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  // The Save button must always leave its loading state (success or
  // controlled error), never spin forever on a hung request.
  let response: Response;
  try {
    response = await authorizedFetch(AUTH_API_PATHS.UPDATE_PROFILE, {
      method: "PATCH",
      body: input,
    });
  } catch (error) {
    throw new ProfileApiError(
      error instanceof Error && error.name === "AbortError"
        ? "The request timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new ProfileApiError(
      detail ?? `Profile update failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }

  const body = (await response.json()) as { user?: AuthUser };
  if (!body || typeof body !== "object" || !body.user) {
    throw new ProfileApiError(
      "Unexpected profile response from server.",
      response.status,
    );
  }
  return body.user;
}

export interface PickedPhoto {
  uri: string;
  fileName: string;
  mimeType: string;
}

export async function uploadProfilePhoto(photo: PickedPhoto): Promise<string | null> {
  const headers = await getAuthorizationHeader();
  const form = new FormData();
  // React Native FormData file part; backend reads it as `photo: UploadFile`.
  form.append("photo", {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${AUTH_API_PATHS.PROFILE_PHOTO}`, {
      method: "POST",
      headers: { ...headers },
      body: form,
    });
  } catch (error) {
    throw new ProfileApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new ProfileApiError(
      detail ?? `Photo upload failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }

  const body = (await response.json()) as { avatar_url?: string | null };
  return body.avatar_url ?? null;
}

export async function removeProfilePhoto(): Promise<void> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${AUTH_API_PATHS.PROFILE_PHOTO}`, {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new ProfileApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new ProfileApiError(
      detail ?? `Photo removal failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
}
