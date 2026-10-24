/**
 * Groups + expenses API client (Settle list, group overview, suggestions).
 *
 * Identity comes from the Bearer session; every group id is
 * authorization-checked server-side. Money arrives as 2dp decimal
 * strings and is only rendered via formatINR() (display text).
 *
 * Backend routes (see backend/routes/groups.py, expenses.py):
 *   POST /api/groups
 *   GET  /api/groups
 *   POST /api/groups/join
 *   GET  /api/groups/search/by-code?code=
 *   GET  /api/groups/{group_id}
 *   POST /api/groups/{group_id}/members
 *   POST /api/groups/{group_id}/archive
 *   POST /api/groups/{group_id}/invite-code/rotate
 *   GET  /api/groups/{group_id}/suggestions
 *   POST /api/expenses
 *   GET  /api/expenses?group_id=&limit=&offset=
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 */

import { API_V1_BASE_URL, AUTH_TIMEOUTS } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";
import { formatINR } from "./settlements.api";

export { formatINR };

export type GroupLifecycle = "active" | "archived";
export type GroupSettlementStatus = "pending" | "settled";

export interface GroupSummary {
  id: string;
  name: string;
  group_type: string;
  currency: string;
  image_url: string | null;
  lifecycle: GroupLifecycle;
  settlement_status: GroupSettlementStatus;
  member_count: number;
  you_owe: string;
  you_are_owed: string;
  pending_count: number;
  invite_code: string | null;
}

export interface GroupMemberBalance {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  net_balance: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  currency: string;
  image_url: string | null;
  lifecycle: GroupLifecycle;
  settlement_status: GroupSettlementStatus;
  member_count: number;
  my_net: string;
  my_direction: string;
  confirmed_count: number;
  invite_code: string | null;
  members: GroupMemberBalance[];
}

export interface SettlementSuggestion {
  payer_user_id: string;
  payer_name: string;
  payer_avatar_url: string | null;
  receiver_user_id: string;
  receiver_name: string;
  receiver_avatar_url: string | null;
  amount: string;
  currency: string;
}

export interface ExpenseSplit {
  user_id: string;
  display_name: string;
  share_amount: string;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  payer_user_id: string;
  payer_name: string;
  expense_date: string | null;
  created_at: string | null;
  splits: ExpenseSplit[];
}

export class GroupsApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "GroupsApiError";
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

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function groupOrNull(value: unknown): GroupSummary | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const lifecycle = v.lifecycle === "archived" ? "archived" : "active";
  const settlement = v.settlement_status === "settled" ? "settled" : "pending";
  return {
    id: v.id,
    name: v.name,
    group_type: asString(v.group_type, "other"),
    currency: asString(v.currency, "INR"),
    image_url: asNullableString(v.image_url),
    lifecycle,
    settlement_status: settlement,
    member_count: typeof v.member_count === "number" ? v.member_count : 0,
    you_owe: asString(v.you_owe, "0.00"),
    you_are_owed: asString(v.you_are_owed, "0.00"),
    pending_count: typeof v.pending_count === "number" ? v.pending_count : 0,
    invite_code: asNullableString(v.invite_code),
  };
}

function groupsOrEmpty(value: unknown): GroupSummary[] {
  const list = (value as { groups?: unknown } | null)?.groups;
  if (!Array.isArray(list)) return [];
  const out: GroupSummary[] = [];
  for (const item of list) {
    const parsed = groupOrNull(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

function memberOrNull(value: unknown): GroupMemberBalance | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.user_id !== "string" || typeof v.display_name !== "string") return null;
  return {
    user_id: v.user_id,
    display_name: v.display_name,
    avatar_url: asNullableString(v.avatar_url),
    role: asString(v.role, "member"),
    net_balance: asString(v.net_balance, "0.00"),
  };
}

export function groupDetailOrNull(value: unknown): GroupDetail | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const members = Array.isArray(v.members) ? v.members : [];
  const parsed: GroupMemberBalance[] = [];
  for (const item of members) {
    const m = memberOrNull(item);
    if (m) parsed.push(m);
  }
  return {
    id: v.id,
    name: v.name,
    description: asNullableString(v.description),
    group_type: asString(v.group_type, "other"),
    currency: asString(v.currency, "INR"),
    image_url: asNullableString(v.image_url),
    lifecycle: v.lifecycle === "archived" ? "archived" : "active",
    settlement_status: v.settlement_status === "settled" ? "settled" : "pending",
    member_count: typeof v.member_count === "number" ? v.member_count : parsed.length,
    my_net: asString(v.my_net, "0.00"),
    my_direction: asString(v.my_direction, "SETTLED"),
    confirmed_count: typeof v.confirmed_count === "number" ? v.confirmed_count : 0,
    invite_code: asNullableString(v.invite_code),
    members: parsed,
  };
}

function suggestionOrNull(value: unknown): SettlementSuggestion | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.payer_user_id !== "string" || typeof v.receiver_user_id !== "string") return null;
  if (typeof v.amount !== "string") return null;
  return {
    payer_user_id: v.payer_user_id,
    payer_name: asString(v.payer_name, "Member"),
    payer_avatar_url: asNullableString(v.payer_avatar_url),
    receiver_user_id: v.receiver_user_id,
    receiver_name: asString(v.receiver_name, "Member"),
    receiver_avatar_url: asNullableString(v.receiver_avatar_url),
    amount: v.amount,
    currency: asString(v.currency, "INR"),
  };
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
    throw new GroupsApiError(
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
    throw new GroupsApiError(
      detail ?? `Group request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  return (await response.json()) as T;
}

export async function fetchMyGroups(): Promise<GroupSummary[]> {
  return groupsOrEmpty(await request<unknown>("/groups"));
}

export async function fetchGroupDetail(groupId: string): Promise<GroupDetail | null> {
  return groupDetailOrNull(await request<unknown>(`/groups/${encodeURIComponent(groupId)}`));
}

export async function fetchGroupSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
  const body = (await request<unknown>(
    `/groups/${encodeURIComponent(groupId)}/suggestions`,
  )) as { suggestions?: unknown };
  if (!Array.isArray(body.suggestions)) return [];
  const out: SettlementSuggestion[] = [];
  for (const item of body.suggestions) {
    const parsed = suggestionOrNull(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export async function createGroup(input: {
  name: string;
  description?: string;
  group_type?: string;
  currency?: string;
}): Promise<GroupSummary | null> {
  return groupOrNull(
    await request<unknown>("/groups", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? undefined,
        group_type: input.group_type ?? "other",
        currency: input.currency ?? "INR",
      }),
    }),
  );
}

export async function joinGroupByCode(inviteCode: string): Promise<GroupSummary | null> {
  return groupOrNull(
    await request<unknown>("/groups/join", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode.trim().toUpperCase() }),
    }),
  );
}

export async function archiveGroup(groupId: string): Promise<boolean> {
  await request<unknown>(`/groups/${encodeURIComponent(groupId)}/archive`, { method: "POST" });
  return true;
}

export async function leaveGroup(groupId: string): Promise<"left" | "deleted"> {
  const body = (await request<unknown>(`/groups/${encodeURIComponent(groupId)}/members/me`, {
    method: "DELETE",
  })) as { status?: unknown };
  return body.status === "deleted" ? "deleted" : "left";
}

export async function rotateInviteCode(groupId: string): Promise<string | null> {
  const body = (await request<unknown>(
    `/groups/${encodeURIComponent(groupId)}/invite-code/rotate`,
    { method: "POST" },
  )) as { invite_code?: unknown };
  return typeof body.invite_code === "string" ? body.invite_code : null;
}

export async function fetchGroupExpenses(
  groupId: string,
  limit = 20,
  offset = 0,
): Promise<{ expenses: Expense[]; total: number }> {
  const body = (await request<unknown>(
    `/expenses?group_id=${encodeURIComponent(groupId)}&limit=${limit}&offset=${offset}`,
  )) as { expenses?: unknown; total?: unknown };
  const expenses: Expense[] = [];
  if (Array.isArray(body.expenses)) {
    for (const item of body.expenses) {
      if (typeof item !== "object" || item === null) continue;
      const v = item as Record<string, unknown>;
      if (typeof v.id !== "string" || typeof v.title !== "string") continue;
      const splits: ExpenseSplit[] = [];
      if (Array.isArray(v.splits)) {
        for (const s of v.splits) {
          if (typeof s !== "object" || s === null) continue;
          const sv = s as Record<string, unknown>;
          if (typeof sv.user_id !== "string") continue;
          splits.push({
            user_id: sv.user_id,
            display_name: asString(sv.display_name, "Member"),
            share_amount: asString(sv.share_amount, "0.00"),
          });
        }
      }
      expenses.push({
        id: v.id,
        group_id: asString(v.group_id),
        title: v.title,
        description: asNullableString(v.description),
        amount: asString(v.amount, "0.00"),
        currency: asString(v.currency, "INR"),
        payer_user_id: asString(v.payer_user_id),
        payer_name: asString(v.payer_name, "Member"),
        expense_date: asNullableString(v.expense_date),
        created_at: asNullableString(v.created_at),
        splits,
      });
    }
  }
  return {
    expenses,
    total: typeof body.total === "number" ? body.total : expenses.length,
  };
}
