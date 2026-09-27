/**
 * Support API client (Pages 10-11: Help & Support, FAQs, requests).
 *
 * Single layer for FAQ reads + support-request create/list. Screens
 * must use these helpers instead of calling endpoints directly.
 *
 * Backend routes (see backend/routes/support.py — identity comes from
 * the Bearer session, never from client input):
 *   GET    /api/support/faqs?q=&category=
 *   POST   /api/support/requests
 *   GET    /api/support/requests
 *
 * Auth reuses the sanctioned helper from auth.api.ts
 * (getAuthorizationHeader) so token handling stays in one place.
 * FAQ caching reuses AsyncStorage (same mechanism as auth.storage);
 * the database stays the source of truth.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_V1_BASE_URL } from "../constants/auth.constants";
import { getAuthorizationHeader } from "./auth.api";

const FAQS_PATH = "/support/faqs";
const REQUESTS_PATH = "/support/requests";

// ---------------------------------------------------------------------------
// Types (mirror backend/schemas/support.py)
// ---------------------------------------------------------------------------

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

export type SupportRequestType = "support" | "bug" | "feature_request";

export interface SupportRequest {
  id: string;
  type: string;
  subject: string;
  description: string;
  app_version: string | null;
  screen: string | null;
  status: string;
  created_at: string;
}

export interface CreateSupportRequestInput {
  type: SupportRequestType;
  subject: string;
  description: string;
  app_version?: string;
  screen?: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SupportApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "SupportApiError";
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
// Safe parsers (never throw, never return undefined collections)
// ---------------------------------------------------------------------------

function faqOrNull(value: unknown): Faq | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Partial<Faq>;
  if (typeof v.id !== "string" || typeof v.question !== "string") return null;
  if (typeof v.answer !== "string") return null;
  return {
    id: v.id,
    question: v.question,
    answer: v.answer,
    category: typeof v.category === "string" ? v.category : "general",
    display_order: typeof v.display_order === "number" ? v.display_order : 0,
  };
}

export function faqsOrEmpty(value: unknown): Faq[] {
  const list = (value as { faqs?: unknown } | null)?.faqs;
  if (!Array.isArray(list)) return [];
  const out: Faq[] = [];
  for (const item of list) {
    const parsed = faqOrNull(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function matchesFaq(faq: Faq, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    faq.question.toLowerCase().includes(q) ||
    faq.answer.toLowerCase().includes(q) ||
    faq.category.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function fetchFaqs(query?: string, category?: string): Promise<Faq[]> {
  const headers = await getAuthorizationHeader();
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  if (category?.trim()) params.set("category", category.trim());
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${FAQS_PATH}${suffix}`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new SupportApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new SupportApiError(
      detail ?? `FAQ request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  const body = (await response.json()) as unknown;
  return faqsOrEmpty(body);
}

export async function createSupportRequest(
  input: CreateSupportRequestInput,
): Promise<SupportRequest> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${REQUESTS_PATH}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw new SupportApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new SupportApiError(
      detail ?? `Support request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  const body = (await response.json()) as Partial<SupportRequest>;
  if (!body || typeof body !== "object" || typeof body.id !== "string") {
    throw new SupportApiError("Unexpected support response from server.", response.status);
  }
  return body as SupportRequest;
}

export async function fetchMySupportRequests(): Promise<SupportRequest[]> {
  const headers = await getAuthorizationHeader();
  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE_URL}${REQUESTS_PATH}`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new SupportApiError(
      error instanceof Error ? error.message : "Network request failed.",
      null,
    );
  }
  if (!response.ok) {
    const { detail, code } = await parseError(response);
    throw new SupportApiError(
      detail ?? `Support request failed with status ${response.status}.`,
      response.status,
      code ?? null,
    );
  }
  const body = (await response.json()) as { requests?: unknown };
  if (!body || !Array.isArray(body.requests)) return [];
  return body.requests.filter(
    (r): r is SupportRequest =>
      typeof r === "object" && r !== null && typeof (r as { id?: unknown }).id === "string",
  );
}

// ---------------------------------------------------------------------------
// FAQ cache (AsyncStorage — same mechanism as auth.storage).
//
// Instant open + offline safety. Written only after a successful
// server fetch; the backend stays the source of truth.
// ---------------------------------------------------------------------------

const FAQ_CACHE_KEY = "jodtod.support.faqs.cache";

export async function getCachedFaqs(): Promise<Faq[] | null> {
  try {
    const raw = await AsyncStorage.getItem(FAQ_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const faqs = faqsOrEmpty(parsed);
    return faqs.length > 0 ? faqs : null;
  } catch {
    return null;
  }
}

export async function saveCachedFaqs(faqs: Faq[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAQ_CACHE_KEY, JSON.stringify({ faqs }));
  } catch {
    // Cache is best-effort; the backend remains authoritative.
  }
}

export async function clearCachedFaqs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FAQ_CACHE_KEY);
  } catch {
    // Treat as cleared.
  }
}

