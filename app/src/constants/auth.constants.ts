/**
 * Centralized authentication constants.
 *
 * No auth string literal (storage key, API path, route) should be
 * duplicated across screens/services — import from here.
 *
 * Backend contract:
 * - FastAPI application base: API_URL
 * - Authentication prefix: /api/auth
 * - User prefix: /api/users
 * - Health endpoint: /api/health
 *
 * Current implemented backend endpoint:
 * - POST /api/auth/signup
 *
 * Additional authentication endpoints should only be used once their
 * corresponding backend routes are implemented.
 */

import { API_URL } from "../config/api";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Root backend URL.
 *
 * Example:
 * http://192.168.1.100:8000
 */
export const API_BASE_URL = API_URL;

/**
 * Current backend API prefix.
 *
 * IMPORTANT:
 * The current FastAPI main.py registers authentication routes under
 * /api/auth, NOT /api/v1/auth.
 */
export const API_PREFIX = "/api";

/**
 * Base URL for the current API.
 *
 * Example:
 * http://192.168.1.100:8000/api
 */
export const API_V1_BASE_URL = `${API_URL}${API_PREFIX}`;

// ---------------------------------------------------------------------------
// Authentication API paths
// ---------------------------------------------------------------------------

/**
 * Authentication endpoint paths.
 *
 * These paths are relative to API_V1_BASE_URL.
 *
 * Therefore:
 *
 * SIGNUP:
 *   ${API_V1_BASE_URL}${AUTH_API_PATHS.SIGNUP}
 *   -> http://host:8000/api/auth/signup
 */
export const AUTH_API_PATHS = {
  SIGNUP: "/auth/signup",
  LOGIN: "/auth/login",
  GOOGLE: "/auth/google",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",

  SEND_OTP: "/auth/send-otp",
  SEND_EMAIL_VERIFICATION: "/auth/send-email-verification",
  VERIFY_OTP: "/auth/verify-otp",
  VERIFY_EMAIL: "/auth/verify-email",

  CURRENT_USER: "/users/me",
} as const;

// ---------------------------------------------------------------------------
// Proposed authentication paths
// ---------------------------------------------------------------------------

/**
 * Proposed authentication endpoints.
 *
 * These remain reserved for provider flows not implemented yet.
 */
export const AUTH_PROPOSED_PATHS = {
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  GOOGLE: "/auth/google",
  APPLE: "/auth/apple",
} as const;

// ---------------------------------------------------------------------------
// Secure storage keys
// ---------------------------------------------------------------------------

/**
 * Authentication storage keys.
 *
 * Sensitive credentials:
 *   SecureStore
 *
 * Non-sensitive cached profile:
 *   AsyncStorage
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "jodtod.auth.access_token",
  REFRESH_TOKEN: "jodtod.auth.refresh_token",
  SESSION_ID: "jodtod.auth.session_id",

  USER_CACHE: "jodtod.auth.cached_user",

  /**
   * Reserved for persistent device identification.
   *
   * The actual device ID should be generated/resolved by the
   * authentication service, not hardcoded.
   */
  DEVICE_ID: "jodtod.auth.device_id",

  /**
   * Timestamp of the last successful online authentication.
   * Used for offline session eligibility policy.
   */
  LAST_ONLINE_AUTHENTICATION: "jodtod.auth.last_online_auth",

} as const;

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export const TOKEN_TYPE_BEARER = "bearer";

// ---------------------------------------------------------------------------
// Expo Router routes
// ---------------------------------------------------------------------------

/**
 * Authentication routes.
 *
 * The `(auth)` route group is not part of the URL.
 *
 * Example:
 * app/(auth)/login.tsx
 * -> /login
 */
export const AUTH_ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  VERIFY_EMAIL: "/verify-email",
} as const;

/**
 * Application routes.
 */
export const APP_ROUTES = {
  TABS: "/(tabs)",
  HOME: "/(tabs)",
  ONBOARDING: "/onboarding",
  INDEX: "/",
} as const;

// ---------------------------------------------------------------------------
// Timeouts
// ---------------------------------------------------------------------------

export const AUTH_TIMEOUTS = {
  /**
   * Maximum time allowed for an individual authentication request.
   */
  REQUEST_TIMEOUT_MS: 15_000,

  /**
   * Maximum time allowed for token refresh.
   */
  REFRESH_TIMEOUT_MS: 15_000,

  /**
   * Maximum time allowed for restoring a persisted session.
   */
  RESTORE_TIMEOUT_MS: 20_000,
} as const;

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export const AUTH_REFRESH_CONFIG = {
  /**
   * Retry the original authenticated request at most once
   * after successful token refresh.
   */
  MAX_RETRIES: 1,
} as const;

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------

/**
 * OTP configuration.
 *
 * These values should remain aligned with the backend configuration.
 */
export const OTP_CONFIG = {
  /**
   * OTP length.
   */
  LENGTH: 6,

  /**
   * UI resend countdown.
   */
  RESEND_SECONDS: 30,

  /**
   * OTP validity period.
   */
  EXPIRE_SECONDS: 300,

  /**
   * Maximum verification attempts.
   */
  MAX_ATTEMPTS: 5,

  /**
   * Backend resend cooldown.
   */
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export const NETWORK_CONFIG = {
  /**
   * Backend health endpoint used for reachability checks.
   *
   * Example:
   * http://host:8000/api/health
   */
  REACHABILITY_URL: `${API_URL}/api/health`,

  /**
   * Maximum time allowed for reachability check.
   */
  REACHABILITY_TIMEOUT_MS: 8_000,

  /**
   * Polling interval used only when the native NetInfo listener
   * is unavailable.
   */
  POLL_INTERVAL_MS: 30_000,
} as const;
