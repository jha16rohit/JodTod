/**
 * Settlements API client (People & Settlements + settlement workflow).
 *
 * Identity comes from the Bearer session; every id is
 * authorization-checked server-side. Money arrives as 2dp decimal
 * strings ("1250.00") and is never converted to float for persistence
 * or calculation — formatINR() below only renders display text.
 *
 * Backend routes (see backend/routes/settlements.py):
 *   GET  /api/settlements/people?q=&direction=&limit=&offset=
 *   GET  /api/settlements/people/{person_id}
 *   GET  /api/settlements/people/{person_id}/history?limit=&offset=
 *   GET  /api/settlements/pending-confirmations?limit=&offset=
 *   GET  /api/settlements/groups/{group_id}/history?limit=&offset=
 *   POST /api/settlements
 *   GET  /api/settlements/{settlement_id}
 *   POST /api/settlements/{settlement_id}/confirm
 *   POST /api/settlements/{settlement_id}/reject
 *   POST /api/settlements/{settlement_id}/cancel
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 */

import { API_V1_BASE_URL, AUTH_TIMEOUTS } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

export type PeopleDirection = "all" | "you_owe" | "they_owe";
export type PersonDirection = "YOU_OWE" | "THEY_OWE" | "SETTLED";
export type SettlementStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "rejected"
  | "cancelled";
export type PaymentMethod = "marked_as_paid" | "partial_payment";

export interface PersonSummary {
  user_id: string;
  display_name: string;
  profile_photo: string | null;
  common_group_count: number;
  you_owe: string;
  they_owe: string;
  net_balance: string;
  direction: PersonDirection;
}

export interface PersonGroup {
  group_id: string;
  name: string;
  group_type: string;
  image_url: string | null;
  you_owe: string;
  they_owe: string;
  net_balance: string;
  direction: PersonDirection;
}

export interface PersonDetail {
  user_id: string;
  display_name: string;
  profile_photo: string | null;
  you_owe: string;
  they_owe: string;
  net_balance: string;
  direction: PersonDirection;
  groups: PersonGroup[];
}

export interface Settlement {
  id: string;
  group_id: string;
  group_name: string;
  payer_user_id: string;
  payer_name: string;
  receiver_user_id: string;
  receiver_name: string;
  amount: string;
  currency: string;
  status: SettlementStatus;
  payment_method: string;
  note: string | null;
  rejection_reason: string | null;
  initiated_at: string | null;
  confirmed_at: string | null;
  created_at: string | null;
}

export interface InitiateSettlementInput {
  group_id: string;
  receiver_user_id: string;
  amount: string;
  payment_method?: PaymentMethod;
  note?: string;
  idempotency_key?: string;
}

export class SettlementsApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "SettlementsApiError";
    this.status = status;
    this.code = code;
  }
}

/** Render a backend 2dp money string as Indian-rupee display text. */
export function formatINR(amount: string | null | undefined): string {
  const numeric = Number(amount ?? "0");
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compare 2dp money strings without float: -1 | 0 | 1. */
export function compareMoney(a: string, b: string): number {
  const pa = a.split(".");
  const pb = b.split(".");
  const intCmp = BigInt(pa[0] || "0") < BigInt(pb[0] || "0") ? -1 : BigInt(pa[0] || "0") > BigInt(pb[0] || "0") ? 1 : 0;
  if (intCmp !== 0) return intCmp;
  const fa = (pa[1] ?? "00").padEnd(2, "0").slice(0, 2);
  const fb = (pb[1] ?? "00").padEnd(2, "0").slice(0, 2);
  return fa < fb ? -1 : fa > fb ? 1 : 0;
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

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function personOrNull(value: unknown): PersonSummary | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.user_id !== "string" || typeof v.display_name !== "string") return null;
  const direction = v.direction;
  if (direction !== "YOU_OWE" && direction !== "THEY_OWE" && direction !== "SETTLED") return null;
  return {
    user_id: v.user_id,
    display_name: v.display_name,
    profile_photo: asNullableString(v.profile_photo),
    common_group_count: typeof v.common_group_count === "number" ? v.common_group_count : 0,
    you_owe: asString(v.you_owe, "0.00"),
    they_owe: asString(v.they_owe, "0.00"),
    net_balance: asString(v.net_balance, "0.00"),
    direction,
  };
}

function personGroupOrNull(value: unknown): PersonGroup | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.group_id !== "string" || typeof v.name !== "string") return null;
  const direction = v.direction;
  if (direction !== "YOU_OWE" && direction !== "THEY_OWE" && direction !== "SETTLED") return null;
  return {
    group_id: v.group_id,
    name: v.name,
    group_type: asString(v.group_type, "other"),
    image_url: asNullableString(v.image_url),
    you_owe: asString(v.you_owe, "0.00"),
    they_owe: asString(v.they_owe, "0.00"),
    net_balance: asString(v.net_balance, "0.00"),
    direction,
  };
}

export function personDetailOrNull(value: unknown): PersonDetail | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.user_id !== "string" || typeof v.display_name !== "string") return null;
  const direction = v.direction;
  if (direction !== "YOU_OWE" && direction !== "THEY_OWE" && direction !== "SETTLED") return null;
  const groups = Array.isArray(v.groups) ? v.groups : [];
  const parsed: PersonGroup[] = [];
  for (const item of groups) {
    const g = personGroupOrNull(item);
    if (g) parsed.push(g);
  }
  return {
    user_id: v.user_id,
    display_name: v.display_name,
    profile_photo: asNullableString(v.profile_photo),
    you_owe: asString(v.you_owe, "0.00"),
    they_owe: asString(v.they_owe, "0.00"),
    net_balance: asString(v.net_balance, "0.00"),
    direction,
    groups: parsed,
  };
}

export function settlementOrNull(value: unknown): Settlement | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.group_id !== "string") return null;
  if (typeof v.payer_user_id !== "string" || typeof v.receiver_user_id !== "string") return null;
  if (typeof v.amount !== "string" || typeof v.status !== "string") return null;
  return {
    id: v.id,
    group_id: v.group_id,
    group_name: asString(v.group_name),
    payer_user_id: v.payer_user_id,
    payer_name: asString(v.payer_name, "Member"),
    receiver_user_id: v.receiver_user_id,
    receiver_name: asString(v.receiver_name, "Member"),
    amount: v.amount,
    currency: asString(v.currency, "INR"),
    status: v.status as SettlementStatus,
    payment_method: asString(v.payment_method, "marked_as_paid"),
    note: asNullableString(v.note),
    rejection_reason: asNullableString(v.rejection_reason),
    initiated_at: asNullableString(v.initiated_at),
    confirmed_at: asNullableString(v.confirmed_at),
    created_at: asNullableString(v.created_at),
  };
}

function settlementsOrEmpty(value: unknown, key: string): Settlement[] {
  const list = (value as Record<string, unknown> | null)?.[key];
  if (!Array.isArray(list)) return [];
  const out: Settlement[] = [];
  for (const item of list) {
    const parsed = settlementOrNull(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthorizationHeader();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUTS.REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...headers, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new SettlementsApiError(
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out. Please try again."
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
    throw new SettlementsApiError(
      detail ?? `Settlement request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return (await response.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** People summary only (never history): active non-zero relationships. */
export async function fetchPeople(
  direction: PeopleDirection = "all",
  search?: string,
  limit = 50,
  offset = 0,
): Promise<{ people: PersonSummary[]; total: number }> {
  const body = await request<unknown>(
    `/settlements/people${query({ direction, q: search?.trim() || undefined, limit, offset })}`,
  );
  const raw = body as { people?: unknown; total?: unknown };
  const list = Array.isArray(raw.people) ? raw.people : [];
  const people: PersonSummary[] = [];
  for (const item of list) {
    const parsed = personOrNull(item);
    if (parsed) people.push(parsed);
  }
  return {
    people,
    total: typeof raw.total === "number" ? raw.total : people.length,
  };
}

export async function fetchPersonDetail(personId: string): Promise<PersonDetail | null> {
  return personDetailOrNull(
    await request<unknown>(`/settlements/people/${encodeURIComponent(personId)}`),
  );
}

export async function fetchPersonHistory(
  personId: string,
  limit = 20,
  offset = 0,
): Promise<{ settlements: Settlement[]; total: number }> {
  const body = await request<unknown>(
    `/settlements/people/${encodeURIComponent(personId)}/history${query({ limit, offset })}`,
  );
  const raw = body as { total?: unknown };
  return {
    settlements: settlementsOrEmpty(body, "settlements"),
    total: typeof raw.total === "number" ? raw.total : 0,
  };
}

export async function fetchPendingConfirmations(
  limit = 20,
  offset = 0,
): Promise<Settlement[]> {
  return settlementsOrEmpty(
    await request<unknown>(`/settlements/pending-confirmations${query({ limit, offset })}`),
    "pending",
  );
}

export async function fetchGroupSettlementHistory(
  groupId: string,
  limit = 20,
  offset = 0,
): Promise<{ settlements: Settlement[]; total: number }> {
  const body = await request<unknown>(
    `/settlements/groups/${encodeURIComponent(groupId)}/history${query({ limit, offset })}`,
  );
  const raw = body as { total?: unknown };
  return {
    settlements: settlementsOrEmpty(body, "settlements"),
    total: typeof raw.total === "number" ? raw.total : 0,
  };
}

export async function initiateSettlement(input: InitiateSettlementInput): Promise<Settlement | null> {
  return settlementOrNull(await request<unknown>("/settlements", {
    method: "POST",
    body: JSON.stringify({
      group_id: input.group_id,
      receiver_user_id: input.receiver_user_id,
      amount: input.amount,
      payment_method: input.payment_method ?? "marked_as_paid",
      note: input.note ?? undefined,
      idempotency_key: input.idempotency_key ?? undefined,
    }),
  }));
}

export async function fetchSettlement(id: string): Promise<Settlement | null> {
  return settlementOrNull(await request<unknown>(`/settlements/${encodeURIComponent(id)}`));
}

export async function confirmSettlement(id: string): Promise<Settlement | null> {
  return settlementOrNull(
    await request<unknown>(`/settlements/${encodeURIComponent(id)}/confirm`, { method: "POST" }),
  );
}

export async function rejectSettlement(id: string, reason?: string): Promise<Settlement | null> {
  return settlementOrNull(
    await request<unknown>(`/settlements/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  );
}

export async function cancelSettlement(id: string): Promise<Settlement | null> {
  return settlementOrNull(
    await request<unknown>(`/settlements/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  );
}
