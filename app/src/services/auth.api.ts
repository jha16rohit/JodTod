/**
 * Centralized authentication API client.
 *
 * This is the SINGLE layer that talks to authentication endpoints.
 *
 * Screens and React context must never call authentication endpoints
 * directly. They must go through auth.service.ts.
 *
 * Architecture:
 *
 * Screen
 *   ↓
 * AuthContext
 *   ↓
 * auth.service.ts
 *   ↓
 * auth.api.ts
 *   ↓
 * FastAPI backend
 *
 * Backend API base:
 *   API_URL + /api
 *
 * Current authentication routes:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/google
 *   POST /api/auth/refresh
 *   POST /api/auth/logout
 *   POST /api/auth/send-otp
 *   POST /api/auth/verify-otp
 *   POST /api/auth/verify-email
 *   GET  /api/users/me
 *
 * Refresh architecture:
 * - 401 on an authenticated request triggers one refresh attempt.
 * - Concurrent refresh attempts share a single promise.
 * - The original request is retried only once.
 * - Failed refresh clears persisted authentication state.
 *
 * IMPORTANT:
 * - Never store raw refresh tokens on the backend.
 * - Never log access tokens or refresh tokens.
 * - Never bypass this module with direct fetch() calls from screens.
 */

import {
  API_V1_BASE_URL,
  AUTH_API_PATHS,
  AUTH_TIMEOUTS,
  TOKEN_TYPE_BEARER,
} from "../constants/auth.constants";

import {
  AuthError,
  type AuthErrorCode,
  type AuthResponse,
  type CurrentUserResponse,
  type EmailVerificationResponse,
  type LoginRequest,
  type LoginStatusResponse,
  type LogoutRequest,
  type MessageResponse,
  type OAuthLoginRequest,
  type OTPResponse,
  type RefreshTokenRequest,
  type ResetPasswordRequest,
  type SendOTPRequest,
  type SignupRequest,
  type TokenResponse,
  type VerifyEmailRequest,
  type VerifyOTPRequest,
} from "../types/auth.types";

import {
  clearAuthentication,
  getAuthTokens,
  saveAuthTokens,
} from "./auth.storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method: HttpMethod;

  /**
   * Attach:
   *
   * Authorization: Bearer <access-token>
   *
   * when authentication is required.
   */
  authenticated?: boolean;

  body?: unknown;

  /**
   * Internal retry flag.
   *
   * Prevents infinite refresh/retry loops.
   */
  _retried?: boolean;

  timeoutMs?: number;
}

/**
 * Device information required when creating a backend session.
 *
 * device_id is the important field because the backend Session model
 * requires it.
 */
export interface SignupApiInput extends SignupRequest {
  device_id?: string | null;
}

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

function toAuthError(
  status: number,
  payload: unknown,
  fallback: string,
): AuthError {
  let detail = fallback;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === "string" && record.detail.trim()) {
      detail = record.detail;
    } else if (typeof record.message === "string" && record.message.trim()) {
      detail = record.message;
    }
  }

  let code: AuthErrorCode = "UNKNOWN";

  if (status === 400) {
    code = "VALIDATION_ERROR";
  } else if (status === 401) {
    code = "UNAUTHORIZED";
  } else if (status === 403) {
    code = "FORBIDDEN";
  } else if (status === 404) {
    code = "NOT_FOUND";
  } else if (status === 409) {
    code = "CONFLICT";
  } else if (status === 422) {
    code = "VALIDATION_ERROR";
  } else if (status === 429) {
    code = "RATE_LIMITED";
  } else if (status >= 500) {
    code = "SERVER_ERROR";
  }

  return new AuthError(detail, code, status);
}

// ---------------------------------------------------------------------------
// Safe JSON parsing
// ---------------------------------------------------------------------------

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    const text = await response.text();

    if (!text) {
      return null;
    }

    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Refresh handling
// ---------------------------------------------------------------------------

let inFlightRefresh: Promise<TokenResponse> | null = null;

function isRefreshPath(path: string): boolean {
  return path === AUTH_API_PATHS.REFRESH;
}

/**
 * Perform one refresh request.
 *
 * IMPORTANT:
 * The refresh endpoint does not receive an Authorization header.
 * It receives the refresh token in the request body.
 */
async function performRefresh(refreshToken: string): Promise<TokenResponse> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    AUTH_TIMEOUTS.REFRESH_TIMEOUT_MS,
  );

  try {
    const body: RefreshTokenRequest = {
      refresh_token: refreshToken,
    };

    const response = await fetch(
      `${API_V1_BASE_URL}${AUTH_API_PATHS.REFRESH}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw toAuthError(response.status, payload, "Session refresh failed.");
    }

    /**
     * Backend may return:
     *
     * {
     *   access_token,
     *   refresh_token,
     *   ...
     * }
     *
     * or:
     *
     * {
     *   tokens: {
     *     access_token,
     *     refresh_token,
     *     ...
     *   }
     * }
     */
    const parsed = payload as
      | TokenResponse
      | {
          tokens?: TokenResponse;
        };

    const normalized =
      "tokens" in parsed && parsed.tokens
        ? parsed.tokens
        : (parsed as TokenResponse);

    if (!normalized?.access_token || !normalized?.refresh_token) {
      throw new AuthError("Session refresh failed.", "SESSION_EXPIRED", 401);
    }

    await saveAuthTokens({
      accessToken: normalized.access_token,
      refreshToken: normalized.refresh_token,
      sessionId: normalized.session_id ?? null,
    });

    return normalized;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AuthError("Session refresh timed out.", "TIMEOUT");
    }

    throw new AuthError(
      "Could not reach the authentication server. Check your connection and that the backend is running.",
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Single-flight refresh.
 *
 * If multiple requests receive 401 simultaneously,
 * only ONE refresh request is sent.
 */
export async function refreshTokensWithDedup(
  refreshToken: string,
): Promise<TokenResponse> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh(refreshToken).finally(() => {
      inFlightRefresh = null;
    });
  }

  try {
    return await inFlightRefresh;
  } catch (error) {
    await clearAuthentication();

    if (error instanceof AuthError) {
      if (error.code === "UNAUTHORIZED" || error.code === "UNKNOWN") {
        throw new AuthError(
          "Your session has expired. Please log in again.",
          "SESSION_EXPIRED",
          401,
        );
      }

      throw error;
    }

    throw new AuthError(
      "Your session has expired. Please log in again.",
      "SESSION_EXPIRED",
      401,
    );
  }
}

// ---------------------------------------------------------------------------
// Core authentication request
// ---------------------------------------------------------------------------

async function authRequest<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const {
    method,
    authenticated = false,
    body,
    _retried = false,
    timeoutMs,
  } = options;

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs ?? AUTH_TIMEOUTS.REQUEST_TIMEOUT_MS,
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ---------------------------------------------------------
  // Authorization
  // ---------------------------------------------------------

  if (authenticated && !isRefreshPath(path)) {
    const tokens = await getAuthTokens();

    if (tokens.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_V1_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    console.error('Auth API Network Error:', error);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AuthError(
        "The request timed out. Please try again.",
        "TIMEOUT",
      );
    }

    throw new AuthError(
      "Could not reach the authentication server. Check your connection and that the backend is running.",
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }

  // ---------------------------------------------------------
  // Automatic access-token refresh
  // ---------------------------------------------------------

  if (
    response.status === 401 &&
    authenticated &&
    !_retried &&
    !isRefreshPath(path)
  ) {
    const stored = await getAuthTokens();

    if (stored.refreshToken) {
      await refreshTokensWithDedup(stored.refreshToken);

      return authRequest<T>(path, {
        ...options,
        _retried: true,
      });
    }

    await clearAuthentication();

    throw new AuthError(
      "Your session has expired. Please log in again.",
      "SESSION_EXPIRED",
      401,
    );
  }

  // ---------------------------------------------------------
  // Response handling
  // ---------------------------------------------------------

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    console.error('Auth API Response Error:', {
      status: response.status,
      statusText: response.statusText,
    });

    /**
     * Login gets a UI-friendly invalid-credentials error.
     */
    if (response.status === 401 && path === AUTH_API_PATHS.LOGIN) {
      const generic = toAuthError(
        response.status,
        payload,
        "Invalid email/phone or password.",
      );

      throw new AuthError(generic.message, "INVALID_CREDENTIALS", 401);
    }

    throw toAuthError(
      response.status,
      payload,
      "Authentication request failed.",
    );
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Authentication response normalization
// ---------------------------------------------------------------------------

function normalizeAuthResponse(
  payload: AuthResponse | TokenResponse,
): AuthResponse {
  if ((payload as AuthResponse).user && (payload as AuthResponse).tokens) {
    return payload as AuthResponse;
  }

  throw new AuthError(
    "Unexpected authentication response from server.",
    "SERVER_ERROR",
  );
}

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

/**
 * Create a new account.
 *
 * Backend endpoint:
 *
 * POST /api/auth/signup
 *
 * The service layer is responsible for resolving the device ID.
 * This function only sends the already-resolved request to the backend.
 */
export async function apiSignup(input: SignupApiInput): Promise<AuthResponse> {
  const payload = await authRequest<AuthResponse>(AUTH_API_PATHS.SIGNUP, {
    method: "POST",
    body: input,
  });

  return normalizeAuthResponse(payload);
}

// ---------------------------------------------------------------------------
// Login (two-step: credentials -> pending OTP -> verify-otp opens session)
// ---------------------------------------------------------------------------

function isAuthResponse(payload: unknown): payload is AuthResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "user" in payload &&
    "tokens" in payload
  );
}

export async function apiLogin(
  input: LoginRequest,
): Promise<AuthResponse | LoginStatusResponse> {
  const payload = await authRequest<AuthResponse | LoginStatusResponse>(
    AUTH_API_PATHS.LOGIN,
    {
      method: "POST",
      body: input,
    },
  );

  if (isAuthResponse(payload) || payload?.status === "otp_required") {
    return payload;
  }

  throw new AuthError(
    "Unexpected authentication response from server.",
    "SERVER_ERROR",
  );
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

export async function apiLoginWithGoogle(
  input: Omit<OAuthLoginRequest, "provider">,
): Promise<AuthResponse> {
  const payload = await authRequest<AuthResponse>(AUTH_API_PATHS.GOOGLE, {
    method: "POST",
    body: input,
  });

  return normalizeAuthResponse(payload);
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

export async function apiRefresh(refreshToken: string): Promise<TokenResponse> {
  return refreshTokensWithDedup(refreshToken);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function apiLogout(input?: LogoutRequest): Promise<void> {
  const tokens = await getAuthTokens();

  const body: LogoutRequest = {
    session_id: input?.session_id ?? tokens.sessionId ?? undefined,
  };

  try {
    await authRequest<unknown>(AUTH_API_PATHS.LOGOUT, {
      method: "POST",
      authenticated: true,
      body,
    });
  } catch {
    /**
     * Logout remains best-effort.
     *
     * auth.service.ts always clears local authentication
     * regardless of backend availability.
     */
  }
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export async function apiGetCurrentUser(): Promise<CurrentUserResponse> {
  return authRequest<CurrentUserResponse>(AUTH_API_PATHS.CURRENT_USER, {
    method: "GET",
    authenticated: true,
  });
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------

export async function apiSendOTP(input: SendOTPRequest): Promise<OTPResponse> {
  return authRequest<OTPResponse>(AUTH_API_PATHS.SEND_OTP, {
    method: "POST",
    body: input,
  });
}

export async function apiSendEmailVerification(email: string): Promise<OTPResponse> {
  return authRequest<OTPResponse>(AUTH_API_PATHS.SEND_EMAIL_VERIFICATION, {
    method: "POST",
    body: { email },
  });
}

export async function apiVerifyOTP(
  input: VerifyOTPRequest,
): Promise<AuthResponse | OTPResponse> {
  const payload = await authRequest<AuthResponse | OTPResponse>(
    AUTH_API_PATHS.VERIFY_OTP,
    {
      method: "POST",
      body: input,
    },
  );

  // Login purposes (email_login / phone_login) return a full AuthResponse
  // with fresh tokens; all other purposes return an OTPResponse.
  return isAuthResponse(payload) ? payload : (payload as OTPResponse);
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function apiVerifyEmail(
  input: VerifyEmailRequest,
): Promise<EmailVerificationResponse> {
  return authRequest<EmailVerificationResponse>(AUTH_API_PATHS.VERIFY_EMAIL, {
    method: "POST",
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function apiForgotPassword(
  identifier: string,
): Promise<MessageResponse> {
  return authRequest<MessageResponse>(AUTH_API_PATHS.FORGOT_PASSWORD, {
    method: "POST",
    body: { identifier },
  });
}

export async function apiResetPassword(
  input: ResetPasswordRequest,
): Promise<MessageResponse> {
  return authRequest<MessageResponse>(AUTH_API_PATHS.RESET_PASSWORD, {
    method: "POST",
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Authorization helper
// ---------------------------------------------------------------------------

/**
 * Authorization header helper for non-authenticated API modules.
 *
 * Other API services should reuse this instead of implementing their
 * own token-reading logic.
 */
export async function getAuthorizationHeader(): Promise<
  Record<string, string>
> {
  const tokens = await getAuthTokens();

  if (!tokens.accessToken) {
    return {};
  }

  const type = TOKEN_TYPE_BEARER;

  return {
    Authorization:
      `${type.charAt(0).toUpperCase()}${type.slice(1)} ` + tokens.accessToken,
  };
}
