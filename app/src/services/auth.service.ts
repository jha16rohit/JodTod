/**
 * Authentication service — orchestration layer (API + storage).
 *
 * Responsibilities:
 * - Validate authentication inputs.
 * - Resolve device/session context.
 * - Call auth.api.ts.
 * - Persist authentication tokens.
 * - Persist cached user profile.
 * - Restore and clear sessions.
 *
 * Non-responsibilities:
 * - No UI.
 * - No navigation.
 * - No React state.
 * - No direct fetch() calls.
 *
 * Architecture:
 *
 * UI
 *   ↓
 * AuthContext
 *   ↓
 * auth.service.ts
 *   ↓
 * auth.api.ts
 *   ↓
 * FastAPI backend
 */

import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  apiForgotPassword,
  apiGetCurrentUser,
  apiLogin,
  apiLoginWithGoogle,
  apiLogout,
  apiRefresh,
  apiResetPassword,
  apiSendOTP,
  apiSendEmailVerification,
  apiSignup,
  apiVerifyEmail,
  apiVerifyOTP,
} from "./auth.api";

import {
  clearAuthentication,
  getAuthTokens,
  getCachedUser,
  hasPersistedSession,
  saveAuthTokens,
  saveCachedUser,
  saveLastOnlineAuthentication,
  getLastOnlineAuthentication,
} from "./auth.storage";

import { AuthError } from "../types/auth.types";

import type {
  AuthResponse,
  AuthUser,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResult,
  MessageResponse,
  OAuthLoginRequest,
  OTPResponse,
  ResetPasswordRequest,
  SendOTPRequest,
  SignupRequest,
  TokenResponse,
  VerifyEmailRequest,
  VerifyOTPRequest,
} from "../types/auth.types";
import type { StoredAuthTokens } from "./auth.storage";

/**
 * Maximum age (ms) for a local offline session to be considered eligible.
 * After this age, the session is considered stale and the user must re-authenticate online.
 * This is separate from backend refresh-token expiration.
 */
export const OFFLINE_SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Checks whether a local offline session is eligible for use.
 *
 * A session is eligible when ALL of the following hold:
 *   - A persisted refresh token exists (session may be restorable).
 *   - A cached user profile exists.
 *   - The session has not exceeded OFFLINE_SESSION_MAX_AGE.
 *   - The device was previously authenticated online (lastOnlineAuthentication is set).
 *
 * This function does NOT contact the backend — it only inspects local storage.
 */
function isOfflineSessionEligible(
  storedTokens: StoredAuthTokens,
  cachedUser: AuthUser | null,
  lastOnlineAuthAt: number | null
): boolean {
  if (!storedTokens.refreshToken) return false;
  if (!cachedUser) return false;
  if (!lastOnlineAuthAt) return false;
  const age = Date.now() - lastOnlineAuthAt;
  if (age > OFFLINE_SESSION_MAX_AGE) return false;
  return true;
}

/**
 * Password flows
 */
// Device identification
// ---------------------------------------------------------------------------

/**
 * Resolve the device identifier used when creating a backend session.
 *
 * Priority:
 * 1. Explicit device ID supplied by the caller.
 * 2. Expo device model + operating system.
 *
 * The backend Session model requires a non-null device_id.
 *
 * This function intentionally does not generate or invent a fake
 * identifier such as "mobile" or "unknown-device".
 */
async function resolveDeviceId(
  explicit?: string | null,
): Promise<string | undefined> {
  if (explicit?.trim()) {
    return explicit.trim();
  }

  try {
    const model = Device.modelName ?? Device.deviceName ?? null;

    const os = Device.osName ?? null;

    const resolved = [model, os]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" · ");

    if (resolved) {
      return resolved;
    }
  } catch {
    // Device information is best-effort.
  }

  return undefined;
}

/**
 * Resolve a device ID and fail clearly if the backend session
 * requirement cannot be satisfied.
 *
 * We do not silently send an invalid/fake device ID.
 */
async function requireDeviceId(explicit?: string | null): Promise<string> {
  const deviceId = await resolveDeviceId(explicit);

  if (!deviceId) {
    throw new AuthError(
      "Unable to identify this device. Please restart the app and try again.",
      "VALIDATION_ERROR",
    );
  }

  return deviceId;
}

/**
 * Resolve optional device metadata for the initial backend session.
 *
 * These values are derived by the app — the user is never asked to
 * enter them. An explicit caller-supplied value wins; otherwise the
 * Expo device/platform/app configuration is used. Values are truncated
 * to the backend column limits (device_name 255, platform 32,
 * app_version 64) and omitted when unavailable.
 */
function resolveDeviceName(explicit?: string | null): string | undefined {
  if (explicit?.trim()) {
    return explicit.trim().slice(0, 255);
  }

  try {
    const name = Device.deviceName ?? Device.modelName ?? null;

    if (name?.trim()) {
      return name.trim().slice(0, 255);
    }
  } catch {
    // Device information is best-effort.
  }

  return undefined;
}

function resolvePlatform(explicit?: string | null): string | undefined {
  if (explicit?.trim()) {
    return explicit.trim().slice(0, 32);
  }

  try {
    const os = Device.osName ?? Platform.OS ?? null;

    if (os?.trim()) {
      return os.trim().slice(0, 32);
    }
  } catch {
    if (Platform.OS?.trim()) {
      return Platform.OS.trim().slice(0, 32);
    }
  }

  return undefined;
}

function resolveAppVersion(explicit?: string | null): string | undefined {
  if (explicit?.trim()) {
    return explicit.trim().slice(0, 64);
  }

  try {
    const version =
      Constants.expoConfig?.version ??
      (Constants as { nativeAppVersion?: string | null }).nativeAppVersion ??
      null;

    if (version?.trim()) {
      return version.trim().slice(0, 64);
    }
  } catch {
    // App version is best-effort.
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Password flows
// ---------------------------------------------------------------------------

/**
 * Create a new user account.
 *
 * Flow:
 *
 * 1. Validate identifier.
 * 2. Validate password.
 * 3. Resolve device ID.
 * 4. Send signup request.
 * 5. Backend creates User + Session.
 * 6. Backend returns access + refresh tokens.
 * 7. Persist tokens locally.
 * 8. Cache authenticated user.
 */
export async function signup(input: SignupRequest): Promise<AuthResponse> {
  // ---------------------------------------------------------
  // Identifier validation
  // ---------------------------------------------------------

  if (!input.email && !input.phone) {
    throw new AuthError(
      "Enter an email address or phone number to sign up.",
      "VALIDATION_ERROR",
    );
  }

  const phone = input.phone?.trim() || undefined;

  if (phone && (phone.length < 7 || phone.length > 20)) {
    throw new AuthError(
      "Enter a valid phone number.",
      "VALIDATION_ERROR",
    );
  }

  // ---------------------------------------------------------
  // Password validation
  // ---------------------------------------------------------

  if (!input.password || input.password.length < 8) {
    throw new AuthError(
      "Password must be at least 8 characters.",
      "VALIDATION_ERROR",
    );
  }

  // ---------------------------------------------------------
  // Device/session context
  // ---------------------------------------------------------

  const deviceId = await requireDeviceId(input.device_id);

  // ---------------------------------------------------------
  // Normalize input
  // ---------------------------------------------------------

  const response = await apiSignup({
    name: input.name?.trim() || undefined,

    email: input.email?.trim().toLowerCase() || undefined,

    phone,

    password: input.password,

    device_id: deviceId,

    device_name: resolveDeviceName(input.device_name),

    platform: resolvePlatform(input.platform),

    app_version: resolveAppVersion(input.app_version),
  });

  // ---------------------------------------------------------
  // Persist authentication state
  // ---------------------------------------------------------

  await persistAuthenticated(response);

  return response;
}

// ---------------------------------------------------------------------------
// Login (two-step password login)
// ---------------------------------------------------------------------------

function isAuthResponse(value: unknown): value is AuthResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "user" in value &&
    "tokens" in value
  );
}

/**
 * Password login.
 *
 * Flow:
 *
 * 1. Validate identifier + password.
 * 2. Resolve the device ID.
 * 3. POST /auth/login — the backend validates the credentials, opens
 *    the device session, and returns a full AuthResponse.
 * 4. Persist tokens + cached user. The caller navigates to Home.
 *    A legacy "otp_required" response is still mapped for backward
 *    compatibility but normal email login no longer uses login-otp.
 */
export async function login(input: LoginRequest): Promise<LoginResult> {
  const identifier = input.identifier.trim();

  if (!identifier) {
    throw new AuthError(
      "Enter your email address or phone number.",
      "VALIDATION_ERROR",
    );
  }

  if (!input.password) {
    throw new AuthError("Enter your password.", "VALIDATION_ERROR");
  }

  const deviceId = await requireDeviceId(input.device_id);

  const response = await apiLogin({
    identifier,
    password: input.password,
    device_id: deviceId,
  });

  if (isAuthResponse(response)) {
    await persistAuthenticated(response);
    return response;
  }

  return {
    status: "otp_required",
    message: response.message,
    destination: response.destination,
    purpose: response.purpose === "phone_login" ? "phone_login" : "email_login",
    deviceId,
  };
}

/**
 * Persist a fully authenticated AuthResponse (tokens + cached user +
 * last-online timestamp).
 */
async function persistAuthenticated(response: AuthResponse): Promise<void> {
  await saveAuthTokens({
    accessToken: response.tokens.access_token,
    refreshToken: response.tokens.refresh_token,
    sessionId: response.tokens.session_id ?? null,
  });
  await saveCachedUser(response.user);
  await saveLastOnlineAuthentication(Date.now());
}

export async function loginWithGoogle(
  input: OAuthLoginRequest,
): Promise<AuthResponse> {
  if (input.provider !== "google" || !input.id_token.trim()) {
    throw new AuthError(
      "Google authentication was not completed.",
      "VALIDATION_ERROR",
    );
  }

  const deviceId = await requireDeviceId(input.device_id);
  const response = await apiLoginWithGoogle({
    id_token: input.id_token,
    device_id: deviceId,
    device_name: resolveDeviceName(input.device_name),
    platform: resolvePlatform(input.platform),
    app_version: resolveAppVersion(input.app_version),
  });

  await persistAuthenticated(response);

  return response;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Refresh the persisted authentication session.
 */
export async function refreshSession(): Promise<TokenResponse> {
  const stored = await getAuthTokens();

  if (!stored.refreshToken) {
    throw new AuthError("No saved session to refresh.", "SESSION_EXPIRED", 401);
  }

  const tokens = await apiRefresh(stored.refreshToken);

  /**
   * apiRefresh already persists the rotated
   * access/refresh token pair.
   */
  return tokens;
}

// ---------------------------------------------------------------------------
// Session restoration
// ---------------------------------------------------------------------------

export interface RestoreSessionResult {
  user: AuthUser | null;
  restored: boolean;
  offline: boolean;
}

/**
 * Restore a persisted session on app launch.
 *
 * Online:
 * - Validate the session through GET /users/me.
 * - auth.api.ts handles access-token refresh when necessary.
 *
 * Offline:
 * - Do not contact the backend.
 * - Use cached user profile for offline UX.
 *
 * No persisted refresh token:
 * - Session cannot be restored.
 */
export async function restoreSession(options?: {
  online?: boolean;
}): Promise<RestoreSessionResult> {
  const hasSession = await hasPersistedSession();

  if (!hasSession) {
    return {
      user: null,
      restored: false,
      offline: false,
    };
  }

  const online = options?.online ?? true;

  const cached = await getCachedUser();
  const storedTokens = await getAuthTokens();
  const lastOnlineAuthAt = await getLastOnlineAuthentication();

  // ---------------------------------------------------------
  // Offline restoration
  // ---------------------------------------------------------

  if (!online) {
    const eligible = isOfflineSessionEligible(storedTokens, cached, lastOnlineAuthAt);
    return {
      user: eligible ? cached : null,
      restored: eligible,
      offline: true,
    };
  }

  // ---------------------------------------------------------
  // Online validation
  // ---------------------------------------------------------

  try {
    const { user } = await apiGetCurrentUser();

    const now = Date.now();
    await saveCachedUser(user);
    await saveLastOnlineAuthentication(now);

    return {
      user,
      restored: true,
      offline: false,
    };
  } catch (error) {
    // -------------------------------------------------------
    // Network unavailable
    // -------------------------------------------------------

    if (error instanceof AuthError && error.code === "NETWORK_ERROR") {
      const eligible = isOfflineSessionEligible(storedTokens, cached, lastOnlineAuthAt);
      return {
        user: eligible ? cached : null,
        restored: eligible,
        offline: true,
      };
    }

    // -------------------------------------------------------
    // Session invalid/expired
    // -------------------------------------------------------

    if (
      error instanceof AuthError &&
      (error.code === "SESSION_EXPIRED" || error.code === "UNAUTHORIZED")
    ) {
      await clearAuthentication();

      return {
        user: null,
        restored: false,
        offline: false,
      };
    }

    // -------------------------------------------------------
    // Other backend failure
    // -------------------------------------------------------

    if (cached) {
      const eligible = isOfflineSessionEligible(storedTokens, cached, lastOnlineAuthAt);
      return {
        user: eligible ? cached : null,
        restored: eligible,
        offline: false,
      };
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logout(sessionId?: string | null): Promise<void> {
  try {
    await apiLogout(
      sessionId
        ? {
            session_id: sessionId,
          }
        : undefined,
    );
  } finally {
    /**
     * Local authentication is always cleared,
     * even when backend logout cannot be reached.
     */
    await clearAuthentication();
  }
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AuthUser> {
  const { user } = await apiGetCurrentUser();

  await saveCachedUser(user);

  return user;
}

// ---------------------------------------------------------------------------
// Authentication state
// ---------------------------------------------------------------------------

export async function isAuthenticated(): Promise<boolean> {
  const stored = await getAuthTokens();

  return Boolean(stored.accessToken && stored.refreshToken);
}

// ---------------------------------------------------------------------------
// OTP / Email verification
// ---------------------------------------------------------------------------

export async function sendOTP(input: SendOTPRequest): Promise<OTPResponse> {
  if (!input.destination.trim()) {
    throw new AuthError(
      "Enter a destination for the verification code.",
      "VALIDATION_ERROR",
    );
  }

  return apiSendOTP(input);
}

/** Send/resend an email-verification OTP through the backend email service. */
export async function sendEmailVerification(email: string): Promise<OTPResponse> {
  if (!email.trim()) {
    throw new AuthError("An email address is required.", "VALIDATION_ERROR");
  }
  return apiSendEmailVerification(email.trim());
}

export async function verifyOTP(
  input: VerifyOTPRequest,
): Promise<AuthResponse | OTPResponse> {
  if (!input.otp.trim()) {
    throw new AuthError("Enter the verification code.", "VALIDATION_ERROR");
  }

  const result = await apiVerifyOTP(input);

  // Login purposes (email_login / phone_login) complete the two-step login:
  // the backend opens a session and returns fresh tokens, which MUST be
  // persisted before the caller reads the current user.
  if (isAuthResponse(result)) {
    await persistAuthenticated(result);
  }

  return result;
}

export async function verifyEmail(
  input: VerifyEmailRequest,
): Promise<EmailVerificationResponse> {
  if (!input.email.trim() || !input.code.trim()) {
    throw new AuthError("Email and verification code are required.", "VALIDATION_ERROR");
  }

  return apiVerifyEmail(input);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Request a password-reset OTP for an existing account.
 *
 * The backend dispatches the code to the identifier (email via SMTP or
 * phone via SMS) and returns a generic success message so callers cannot
 * distinguish existing accounts from unknown identifiers.
 */
export async function requestPasswordReset(
  input: ForgotPasswordRequest,
): Promise<MessageResponse> {
  const identifier = input.identifier.trim();

  if (!identifier) {
    throw new AuthError(
      "Enter your email address or phone number.",
      "VALIDATION_ERROR",
    );
  }

  return apiForgotPassword(identifier);
}

/**
 * Complete the password reset with the code received at the forgot step.
 */
export async function resetPassword(
  input: ResetPasswordRequest,
): Promise<MessageResponse> {
  const identifier = input.identifier.trim();
  const code = input.code.trim();

  if (!identifier) {
    throw new AuthError(
      "Enter your email address or phone number.",
      "VALIDATION_ERROR",
    );
  }

  if (!code) {
    throw new AuthError("Enter the reset code.", "VALIDATION_ERROR");
  }

  if (!input.new_password || input.new_password.length < 8) {
    throw new AuthError(
      "New password must be at least 8 characters.",
      "VALIDATION_ERROR",
    );
  }

  return apiResetPassword({
    identifier,
    code,
    new_password: input.new_password,
  });
}

// ---------------------------------------------------------------------------
// Features without backend contract
// ---------------------------------------------------------------------------

/**
 * These features intentionally fail locally.
 *
 * No request is sent until the backend implements
 * the corresponding endpoint.
 */
const MISSING_CONTRACT = (feature: string): AuthError =>
  new AuthError(
    `${feature} is not available yet: the backend has no implemented endpoint for it. No request was sent and no session was created.`,
    "OAUTH_NOT_IMPLEMENTED",
  );

export async function loginWithApple(
  _input: OAuthLoginRequest,
): Promise<never> {
  throw MISSING_CONTRACT("Apple sign-in");
}
