/**
 * Activity feed API client.
 *
 * Single layer that talks to the Activity endpoints. Screens must use
 * these helpers instead of calling the endpoints directly.
 *
 * Backend routes (see backend/routes/activities.py):
 *   GET  /api/activities?type=&member=&group=&date_range=&start_date=&end_date=&q=
 *   POST /api/activities
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 */

import { API_V1_BASE_URL } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

export type ActivityTypeFilter =
  | "all"
  | "expense"
  | "settlement"
  | "member"
  | "group";

export type ActivityDateRange =
  | "all"
  | "today"
  | "week"
  | "month"
  | "custom";

export interface BackendActivityParticipant {
  name: string;
  share: string;
  avatar?: string | null;
}

export interface BackendActivity {
  id: string;
  type: Exclude<ActivityTypeFilter, "all">;
  title: string;
  subtitle: string | null;
  amount: string | null;
  occurred_at: string;
  member_key: string | null;
  group_name: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  counterparty_name: string | null;
  counterparty_avatar: string | null;
  counterparty_sub: string | null;
  category: string | null;
  status: string | null;
  description: string | null;
  split_type: string | null;
  split_among: string | null;
  each_share: string | null;
  bill_image: string | null;
  participants: BackendActivityParticipant[] | null;
}

export interface FetchActivitiesParams {
  type?: ActivityTypeFilter;
  member?: string | string[];
  group?: string | string[];
  date_range?: ActivityDateRange;
  start_date?: string | null;
  end_date?: string | null;
  search?: string;
}

export class ActivityApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ActivityApiError";
    this.status = status;
  }
}

function appendMulti(search: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (value === undefined) return;
  const values = (Array.isArray(value) ? value : [value])
    .map((v) => v.trim())
    .filter((v) => v !== "" && v !== "all");
  // Empty selection means "all": omit the param so the backend default applies.
  for (const v of values) search.append(key, v);
}

function buildQuery(params: FetchActivitiesParams): string {
  const search = new URLSearchParams();
  search.set("type", params.type ?? "all");
  appendMulti(search, "member", params.member);
  appendMulti(search, "group", params.group);
  const dateRange = params.date_range ?? "all";
  search.set("date_range", dateRange);
  if (dateRange === "custom") {
    if (params.start_date) search.set("start_date", params.start_date);
    if (params.end_date) search.set("end_date", params.end_date);
  }
  if (params.search !== undefined && params.search.trim() !== "") {
    search.set("q", params.search.trim());
  }
  return search.toString();
}

export async function fetchActivities(
  params: FetchActivitiesParams = {},
): Promise<BackendActivity[]> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(
      `${API_V1_BASE_URL}/activities?${buildQuery(params)}`,
      { headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    throw new ActivityApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    throw new ActivityApiError(
      `Activity request failed with status ${response.status}.`,
      response.status,
    );
  }

  const body = (await response.json()) as { items?: BackendActivity[] };
  return Array.isArray(body.items) ? body.items : [];
}

export async function fetchActivityById(id: string): Promise<BackendActivity> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}/activities/${id}`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new ActivityApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    throw new ActivityApiError(
      `Activity detail request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as BackendActivity;
}
