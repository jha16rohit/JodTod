/**
 * Notification API client.
 *
 * Single layer that talks to the Notification endpoints.
 * Screens must use these helpers instead of calling the endpoints directly.
 *
 * Backend routes (see backend/routes/notifications.py):
 *   GET  /api/notifications
 *   GET  /api/notifications/{notification_id}
 *   POST /api/notifications/{notification_id}/read
 *   GET  /api/notifications/unread/count
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 */

import { API_V1_BASE_URL } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

export type NotificationType =
  | "expense_added"
  | "settlement_completed"
  | "group_invitation"
  | "group_comment"
  | "trip_report_ready"
  | "budget_alert"
  | "member_joined_group"
  | "bill_image_updated"
  | "group_settings_updated"
  | "system";

export interface BackendNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  related_group_id: string | null;
  related_expense_id: string | null;
  related_settlement_id: string | null;
  related_user_id: string | null;
  attachment_reference: string | null;
  metadata: Record<string, unknown> | null;
}

export interface FetchNotificationsParams {
  type?: NotificationType;
  read?: "unread" | "read" | "all";
  limit?: number;
}

export class NotificationApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "NotificationApiError";
    this.status = status;
  }
}

export async function fetchNotifications(
  params: FetchNotificationsParams = {},
): Promise<BackendNotification[]> {
  const headers = await getAuthorizationHeader();
  const search = new URLSearchParams();
  search.set("type", params.type ?? "");
  if (params.read) search.set("read", params.read);
  if (params.limit) search.set("limit", String(params.limit));

  let response: Response;
  try {
    response = await fetch(
      `${API_V1_BASE_URL}/notifications?${search.toString()}`,
      { headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    throw new NotificationApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    throw new NotificationApiError(
      `Notification request failed with status ${response.status}.`,
      response.status,
    );
  }

  const body = (await response.json()) as { items: BackendNotification[] };
  return Array.isArray(body.items) ? body.items : [];
}

export async function fetchNotificationById(
  id: string,
): Promise<BackendNotification> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}/notifications/${id}`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new NotificationApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    throw new NotificationApiError(
      `Notification detail request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as BackendNotification;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<BackendNotification> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(
      `${API_V1_BASE_URL}/notifications/${notificationId}/read`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    throw new NotificationApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    throw new NotificationApiError(
      `Mark notification as read failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as BackendNotification;
}

export async function fetchUnreadCount(): Promise<{
  unread_count: number;
}> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}/notifications/unread/count`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new NotificationApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }

  if (!response.ok) {
    throw new NotificationApiError(
      `Unread count request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as {
    unread_count: number;
  };
}