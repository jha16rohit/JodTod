/**
 * Preferences API client (Page 04/05).
 *
 * Single layer for static preferences + notification counts. Screens
 * must use these helpers instead of calling endpoints directly.
 *
 * Backend routes (see backend/routes/preferences.py — identity comes
 * from the Bearer session, never from client input):
 *   GET    /api/users/me/preferences
 *   PATCH  /api/users/me/preferences   (partial update)
 *   GET    /api/users/me/notifications/counts
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 * Local caching reuses AsyncStorage (same mechanism as auth.storage);
 * the database stays the source of truth.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_V1_BASE_URL, AUTH_API_PATHS, AUTH_TIMEOUTS } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

// ---------------------------------------------------------------------------
// Types (mirror backend/schemas/preferences.py)
// ---------------------------------------------------------------------------

export type CurrencyCode = "INR";
export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type WeekStart = "monday" | "sunday";
export type AppLanguage = "en";
export type DisplayNameChoice = "account_name" | "username";

export interface Preferences {
  currency: CurrencyCode;
  date_format: DateFormat;
  start_of_week: WeekStart;
  app_language: AppLanguage;
  display_name: DisplayNameChoice;
}

export interface NotificationCounts {
  expense_updates: number;
  settlement_reminders: number;
  group_invitations: number;
}

export interface UpdatePreferencesInput {
  currency?: CurrencyCode;
  date_format?: DateFormat;
  start_of_week?: WeekStart;
  app_language?: AppLanguage;
  display_name?: DisplayNameChoice;
}

export const DEFAULT_PREFERENCES: Preferences = {
  currency: "INR",
  date_format: "DD/MM/YYYY",
  start_of_week: "monday",
  app_language: "en",
  display_name: "account_name",
};

export const DEFAULT_COUNTS: NotificationCounts = {
  expense_updates: 0,
  settlement_reminders: 0,
  group_invitations: 0,
};

// ---------------------------------------------------------------------------
// Static 5-currency catalog (Page 05).
//
// Local/static by design: no external currency API. Only INR is
// applicable/selectable; the rest are visible but unavailable.
// ---------------------------------------------------------------------------

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  available: boolean;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9", available: true },
  { code: "USD", name: "US Dollar", symbol: "$", available: false },
  { code: "EUR", name: "Euro", symbol: "\u20AC", available: false },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", available: false },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5", available: false },
];

export const DATE_FORMATS: DateFormat[] = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

export const WEEK_STARTS: { value: WeekStart; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "sunday", label: "Sunday" },
];

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PreferencesApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "PreferencesApiError";
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

// ---------------------------------------------------------------------------
// Safe parsers (never throw, never return undefined fields)
// ---------------------------------------------------------------------------

function isDateFormat(value: unknown): value is DateFormat {
  return (
    value === "DD/MM/YYYY" || value === "MM/DD/YYYY" || value === "YYYY-MM-DD"
  );
}

function isWeekStart(value: unknown): value is WeekStart {
  return value === "monday" || value === "sunday";
}

export function preferencesOrDefaults(value: unknown): Preferences {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_PREFERENCES };
  }
  const v = value as Partial<Preferences>;
  return {
    // Only INR is applicable; anything else falls back safely.
    currency: v.currency === "INR" ? "INR" : "INR",
    date_format: isDateFormat(v.date_format) ? v.date_format : DEFAULT_PREFERENCES.date_format,
    start_of_week: isWeekStart(v.start_of_week) ? v.start_of_week : DEFAULT_PREFERENCES.start_of_week,
    app_language: v.app_language === "en" ? "en" : "en",
    display_name: v.display_name === "username" ? "username" : "account_name",
  };
}

function countOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function countsOrDefaults(value: unknown): NotificationCounts {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_COUNTS };
  }
  const v = value as Partial<NotificationCounts>;
  return {
    expense_updates: countOrZero(v.expense_updates),
    settlement_reminders: countOrZero(v.settlement_reminders),
    group_invitations: countOrZero(v.group_invitations),
  };
}

export function currencyMeta(code: string | null | undefined): CurrencyInfo {
  const found = CURRENCIES.find((c) => c.code === code);
  // INR (index 0) is the safe default; never undefined.
  return found ?? CURRENCIES[0];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthorizationHeader();
  // Same timeout discipline as auth.api: a hung request must surface
  // as a controlled error (loading stops) instead of spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    AUTH_TIMEOUTS.REQUEST_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...headers, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new PreferencesApiError(
      error instanceof Error && error.name === "AbortError"
        ? "The request timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Network request failed.",
      null,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new PreferencesApiError(
      detail ?? `Preferences request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return (await response.json()) as T;
}

export async function fetchPreferences(): Promise<Preferences> {
  const body = await request<Partial<Preferences>>(AUTH_API_PATHS.PREFERENCES);
  return preferencesOrDefaults(body);
}

export async function updatePreferences(input: UpdatePreferencesInput): Promise<Preferences> {
  const body = await request<Partial<Preferences>>(AUTH_API_PATHS.PREFERENCES, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return preferencesOrDefaults(body);
}

export async function fetchNotificationCounts(): Promise<NotificationCounts> {
  const body = await request<Partial<NotificationCounts>>(AUTH_API_PATHS.NOTIFICATION_COUNTS);
  return countsOrDefaults(body);
}

// ---------------------------------------------------------------------------
// Local cache (AsyncStorage — same mechanism as auth.storage).
//
// Instant UI on open + offline safety. The backend stays the source of
// truth: cache is only written after a successful server round-trip.
// ---------------------------------------------------------------------------

const PREFERENCES_CACHE_KEY = "jodtod.preferences.cached";

export async function getCachedPreferences(): Promise<Preferences | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return preferencesOrDefaults(parsed);
  } catch {
    return null;
  }
}

export async function saveCachedPreferences(prefs: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // Cache is best-effort; the backend remains authoritative.
  }
}

export async function clearCachedPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFERENCES_CACHE_KEY);
  } catch {
    // Treat as cleared.
  }
}
