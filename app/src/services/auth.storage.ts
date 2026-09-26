/**
 * Secure authentication storage — the ONLY module that touches
 * SecureStore/AsyncStorage keys for auth.
 *
 * Rules enforced here:
 * - access token, refresh token, session ID → Expo SecureStore
 * - cached user (non-sensitive profile) → AsyncStorage
 * - never log token values
 * - reads fail gracefully (return null); writes surface typed errors
 * - clearing is atomic-ish (all keys removed together)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { AUTH_STORAGE_KEYS } from "../constants/auth.constants";
import type { AuthUser } from "../types/auth.types";

export interface StoredAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
}

/**
 * Cached offline-session metadata.
 *
 * Contains the timestamp of the last successful online authentication,
 * used to determine whether local offline access is still eligible.
 */
export interface OfflineSessionMetadata {
  lastOnlineAuthentication: number; // epoch ms
}

export interface SaveAuthTokensInput {
  accessToken: string;
  refreshToken: string;
  sessionId?: string | null;
}

export class AuthStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthStorageError";
  }
}

async function safeSecureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSecureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    throw new AuthStorageError(`Failed to persist authentication state.`);
  }
}

async function safeSecureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Missing key / platform quirk — treat as cleared.
  }
}

// ---------------------------------------------------------------------------
// Tokens (SecureStore only)
// ---------------------------------------------------------------------------

export async function saveAuthTokens(input: SaveAuthTokensInput): Promise<void> {
  if (!input.accessToken || !input.refreshToken) {
    throw new AuthStorageError("Cannot persist incomplete auth tokens.");
  }
  await safeSecureSet(AUTH_STORAGE_KEYS.ACCESS_TOKEN, input.accessToken);
  await safeSecureSet(AUTH_STORAGE_KEYS.REFRESH_TOKEN, input.refreshToken);
  if (input.sessionId) {
    await safeSecureSet(AUTH_STORAGE_KEYS.SESSION_ID, input.sessionId);
  } else {
    await safeSecureDelete(AUTH_STORAGE_KEYS.SESSION_ID);
  }
}

export async function getAuthTokens(): Promise<StoredAuthTokens> {
  const [accessToken, refreshToken, sessionId] = await Promise.all([
    safeSecureGet(AUTH_STORAGE_KEYS.ACCESS_TOKEN),
    safeSecureGet(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
    safeSecureGet(AUTH_STORAGE_KEYS.SESSION_ID),
  ]);
  return { accessToken, refreshToken, sessionId };
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    safeSecureDelete(AUTH_STORAGE_KEYS.ACCESS_TOKEN),
    safeSecureDelete(AUTH_STORAGE_KEYS.REFRESH_TOKEN),
    safeSecureDelete(AUTH_STORAGE_KEYS.SESSION_ID),
  ]);
}

/**
 * Save the timestamp of the last successful online authentication.
 */
export async function saveLastOnlineAuthentication(timestamp: number): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.LAST_ONLINE_AUTHENTICATION, String(timestamp));
  } catch {
    throw new AuthStorageError("Failed to persist offline session metadata.");
  }
}

/**
 * Get the timestamp of the last successful online authentication.
 */
export async function getLastOnlineAuthentication(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.LAST_ONLINE_AUTHENTICATION);
    if (!raw) return null;
    return parseInt(raw, 10);
  } catch {
    return null;
  }
}

/**
 * Clear the offline-session metadata.
 */
export async function clearLastOnlineAuthentication(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.LAST_ONLINE_AUTHENTICATION);
  } catch {
    // Treat as cleared.
  }
}

// ---------------------------------------------------------------------------
// Cached user (AsyncStorage — non-sensitive profile only, never tokens)
// ---------------------------------------------------------------------------

export async function saveCachedUser(user: AuthUser): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER_CACHE, JSON.stringify(user));
  } catch {
    throw new AuthStorageError("Failed to cache user profile.");
  }
}

export async function getCachedUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.USER_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearCachedUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.USER_CACHE);
  } catch {
    // Treat as cleared.
  }
}

// ---------------------------------------------------------------------------
// Combined helpers
// ---------------------------------------------------------------------------

/** Remove every persisted auth artifact (tokens + cached user). */
export async function clearAuthentication(): Promise<void> {
  await Promise.all([clearAuthTokens(), clearCachedUser()]);
}

/** True when a refresh token is persisted (session may be restorable). */
export async function hasPersistedSession(): Promise<boolean> {
  const tokens = await getAuthTokens();
  return Boolean(tokens.refreshToken);
}
