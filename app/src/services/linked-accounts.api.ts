/**
 * Linked Accounts API client (Page 07).
 *
 * Single layer for provider connection state + link/unlink. Screens
 * must use these helpers instead of calling endpoints directly.
 *
 * Backend routes (see backend/routes/linked_accounts.py — identity
 * comes from the Bearer session, never from client input; the client
 * only ever sends a provider ID token, never a self-asserted
 * email/subject):
 *   GET    /api/users/me/linked-accounts
 *   POST   /api/users/me/linked-accounts/{google|apple}/link
 *   DELETE /api/users/me/linked-accounts/{google|apple}/unlink
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 * State caching reuses AsyncStorage (same mechanism as auth.storage);
 * the database stays the source of truth.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_V1_BASE_URL } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

const LINKED_ACCOUNTS_PATH = "/users/me/linked-accounts";

export type LinkableProvider = "google" | "apple";

export interface EmailLinkState {
  connected: boolean;
  email: string | null;
  verified: boolean;
}

export interface PhoneLinkState {
  connected: boolean;
  phone: string | null;
  verified: boolean;
}

export interface ProviderLinkState {
  connected: boolean;
  email: string | null;
  /** ISO timestamps from the backend; informational only. */
  connected_at?: string | null;
  last_verified_at?: string | null;
}

export interface UnavailableProviderState {
  connected: boolean;
  available: boolean;
}

export interface LinkedAccountsState {
  email: EmailLinkState;
  phone: PhoneLinkState;
  google: ProviderLinkState;
  apple: ProviderLinkState;
  facebook: UnavailableProviderState;
}

export const DEFAULT_LINKED_STATE: LinkedAccountsState = {
  email: { connected: false, email: null, verified: false },
  phone: { connected: false, phone: null, verified: false },
  google: { connected: false, email: null },
  apple: { connected: false, email: null },
  facebook: { connected: false, available: false },
};

export class LinkedAccountsApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "LinkedAccountsApiError";
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

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Never throws; unknown/missing fields fall back safely. */
export function linkedStateOrDefaults(value: unknown): LinkedAccountsState {
  if (typeof value !== "object" || value === null) {
    return structuredCloneSafe();
  }
  const v = value as Partial<Record<keyof LinkedAccountsState, unknown>>;
  const email = (v.email ?? {}) as Partial<EmailLinkState>;
  const phone = (v.phone ?? {}) as Partial<PhoneLinkState>;
  const google = (v.google ?? {}) as Partial<ProviderLinkState>;
  const apple = (v.apple ?? {}) as Partial<ProviderLinkState>;
  return {
    email: {
      connected: boolOr(email.connected, false),
      email: stringOrNull(email.email),
      verified: boolOr(email.verified, false),
    },
    phone: {
      connected: boolOr(phone.connected, false),
      phone: stringOrNull(phone.phone),
      verified: boolOr(phone.verified, false),
    },
    google: {
      connected: boolOr(google.connected, false),
      email: stringOrNull(google.email),
      connected_at: stringOrNull(google.connected_at),
      last_verified_at: stringOrNull(google.last_verified_at),
    },
    apple: {
      connected: boolOr(apple.connected, false),
      email: stringOrNull(apple.email),
      connected_at: stringOrNull(apple.connected_at),
      last_verified_at: stringOrNull(apple.last_verified_at),
    },
    // Facebook has no backend integration: always unavailable.
    facebook: { connected: false, available: false },
  };
}

function structuredCloneSafe(): LinkedAccountsState {
  return JSON.parse(JSON.stringify(DEFAULT_LINKED_STATE)) as LinkedAccountsState;
}

export async function fetchLinkedAccounts(): Promise<LinkedAccountsState> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${LINKED_ACCOUNTS_PATH}`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new LinkedAccountsApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new LinkedAccountsApiError(
      detail ?? `Linked accounts request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return linkedStateOrDefaults(await response.json());
}

export async function linkProvider(
  provider: LinkableProvider,
  idToken: string,
): Promise<LinkedAccountsState> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${LINKED_ACCOUNTS_PATH}/${provider}/link`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch (error) {
    throw new LinkedAccountsApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new LinkedAccountsApiError(
      detail ?? `Provider link failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return linkedStateOrDefaults(await response.json());
}

export async function unlinkProvider(
  provider: LinkableProvider,
): Promise<LinkedAccountsState> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${LINKED_ACCOUNTS_PATH}/${provider}/unlink`, {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new LinkedAccountsApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new LinkedAccountsApiError(
      detail ?? `Provider unlink failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return linkedStateOrDefaults(await response.json());
}

// ---------------------------------------------------------------------------
// State cache (AsyncStorage — same mechanism as auth.storage).
//
// Last-known-good connection state for offline display. Written only
// after a successful server fetch; the backend stays the source of
// truth. Connect/disconnect while offline are blocked with an error,
// never faked as successful.
// ---------------------------------------------------------------------------

const LINKED_ACCOUNTS_CACHE_KEY = "jodtod.linked-accounts.cached";

export async function getCachedLinkedState(): Promise<LinkedAccountsState | null> {
  try {
    const raw = await AsyncStorage.getItem(LINKED_ACCOUNTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return linkedStateOrDefaults(parsed);
  } catch {
    return null;
  }
}

export async function saveCachedLinkedState(state: LinkedAccountsState): Promise<void> {
  try {
    await AsyncStorage.setItem(LINKED_ACCOUNTS_CACHE_KEY, JSON.stringify(state));
  } catch {
    // Cache is best-effort; the backend remains authoritative.
  }
}

export async function clearCachedLinkedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LINKED_ACCOUNTS_CACHE_KEY);
  } catch {
    // Treat as cleared.
  }
}
