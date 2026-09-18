/**
 * JodTod mobile authentication contracts.
 *
 * These types mirror the backend Pydantic schemas in:
 * - backend/schemas/auth.py
 * - backend/schemas/user.py
 * - backend/models/otp.py (OTPPurpose)
 * - backend/models/user.py (AccountStatus)
 *
 * Do not change field names/types here without updating the backend
 * schema, route, and service together (see backend/README.md §45).
 */

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export type AccountStatus =
  | "active"
  | "pending"
  | "suspended"
  | "disabled"
  | "deleted";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
  /** Backend-authoritative gate for protected application routes. */
  verification_required: boolean;
  verification_method: "email" | "phone" | null;
}

/** User representation returned after authentication / from GET /users/me. */
export type AuthUser = User;

/** Server-side session identity bound to the token pair. */
export interface AuthSession {
  session_id: string;
  user_id: string;
  device_id?: string | null;
}

// ---------------------------------------------------------------------------
// Requests (mirror backend/schemas/auth.py)
// ---------------------------------------------------------------------------

export interface SignupRequest {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  password?: string | null;
  device_id?: string | null;
  /** Optional device metadata for the initial backend session. */
  device_name?: string | null;
  platform?: string | null;
  app_version?: string | null;
}

export interface LoginRequest {
  /** Email address or phone number. Backend resolves which one it is. */
  identifier: string;
  password: string;
  device_id?: string | null;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  session_id?: string | null;
}

// ---------------------------------------------------------------------------
// Tokens / responses (mirror backend/schemas/auth.py)
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in?: number | null;
  session_id?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: TokenResponse;
}

/**
 * Intermediate step-1 response from POST /auth/login.
 *
 * The backend accepts the password but requires a login OTP before any
 * session is created. No tokens are present in this response.
 */
export interface LoginStatusResponse {
  status: "otp_required";
  message: string;
  destination: string;
  purpose: "email_login" | "phone_login";
  expires_in?: number | null;
}

/**
 * Client-side pending-OTP step of the two-step password login.
 * Extends the backend response with the resolved device id so the
 * verify-otp step can re-attach the exact same device session identity.
 */
export interface LoginPendingOtp extends LoginStatusResponse {
  deviceId: string;
}

/** Result of the two-step password login: full session or pending OTP step. */
export type LoginResult = AuthResponse | LoginPendingOtp;

export interface CurrentUserResponse {
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// OTP (mirror backend/schemas/auth.py + models/otp.py)
// ---------------------------------------------------------------------------

export type OTPPurpose =
  | "phone_signup"
  | "phone_login"
  | "phone_verification"
  | "email_signup"
  | "email_login"
  | "email_verification"
  | "password_reset";

export interface SendOTPRequest {
  destination: string;
  purpose: OTPPurpose;
}

export interface VerifyOTPRequest {
  destination: string;
  otp: string;
  purpose: OTPPurpose;
  /** Device identity required by login purposes (email_login / phone_login). */
  device_id?: string | null;
  device_name?: string | null;
  platform?: string | null;
  app_version?: string | null;
}

export interface OTPResponse {
  message: string;
  expires_at?: string | null;
  retry_after_seconds?: number | null;
  provider?: string | null;
  provider_accepted?: boolean | null;
  delivery_status?: string | null;
}

// ---------------------------------------------------------------------------
// Email verification (mirror backend/schemas/auth.py)
// ---------------------------------------------------------------------------

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface EmailVerificationResponse {
  message: string;
  verified: boolean;
}

// ---------------------------------------------------------------------------
// Password reset (mirror backend/schemas/auth.py + routes/auth_password.py)
//
// Implemented backend contract:
// - POST /auth/forgot-password  { identifier } -> MessageResponse
// - POST /auth/reset-password   { identifier, code, new_password } -> MessageResponse
//
// `identifier` accepts an email address or an international phone number.
// The reset code is the OTP dispatched to the identifier by the forgot
// step and completed at the reset step.
// ---------------------------------------------------------------------------

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  identifier: string;
  code: string;
  new_password: string;
}

// ---------------------------------------------------------------------------
// OAuth credentials are provider-issued ID tokens. The backend validates
// them before issuing the normal JodTod session/token pair.
// ---------------------------------------------------------------------------

export type OAuthProvider = "google" | "apple";

export interface OAuthLoginRequest {
  provider: OAuthProvider;
  /** Raw provider credential — sent to the backend for validation. */
  id_token: string;
  device_id?: string | null;
  device_name?: string | null;
  platform?: string | null;
  app_version?: string | null;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "authenticated-online"
  | "authenticated-offline"
  | "authentication-initializing"
  | "session-refreshing"
  | "session-expired"
  | "session-revoked"
  | "unauthenticated"
  | "offline"
  | "error"
  | "network-unavailable";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "OAUTH_NOT_CONFIGURED"
  | "INVALID_OAUTH_TOKEN"
  | "OAUTH_NOT_IMPLEMENTED"
  | "OTP_FAILED"
  | "UNKNOWN";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status?: number;

  constructor(message: string, code: AuthErrorCode = "UNKNOWN", status?: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}
