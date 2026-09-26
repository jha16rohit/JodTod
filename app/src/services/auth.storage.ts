/**
 * Secure authentication storage — the ONLY module that touches
 * SecureStore/AsyncStorage keys for auth.
 *
 * Rules enforced here:
 * - access token, refresh token, session ID → Expo SecureStore
 *   (AsyncStorage fallback under the SAME keys only where SecureStore
 *   is unavailable, e.g. Expo web — SecureStore is Android/iOS only)
 * - cached user (non-sensitive profile) → AsyncStorage
 * - never store passwords; never log token values
 * - reads fail gracefully (return null); writes surface typed errors
 * - clearing is atomic-ish (all keys removed together, both stores)
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

/**
 * Whether the native SecureStore backend is usable on this platform.
 *
 * SecureStore is Android/iOS only. On Expo web (and any platform
 * without the native module) `isAvailableAsync()` resolves false and
 * every get/set would reject — without a fallback the session could
 * never be restored and the user would face Login on every reload.
 * The result is cached for the process lifetime: one platform, one
 * primary store.
 */
let secureStoreAvailable: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (secureStoreAvailable !== null) return secureStoreAvailable;
  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

async function safeSecureGet(key: string): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) return value;
    } catch {
      // Fall through to the fallback slot below.
    }
    // A value may live in the fallback slot (written while SecureStore
    // was unavailable). Check it before reporting "no session".
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function safeSecureSet(key: string, value: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    } catch (error) {
      throw new AuthStorageError(`Failed to persist authentication state.`);
    }
  }
  // Fallback where SecureStore is unavailable (e.g. Expo web): persist
  // under the SAME key so restore/logout keep working unchanged.
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    throw new AuthStorageError(`Failed to persist authentication state.`);
  }
}

async function safeSecureDelete(key: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Missing key / platform quirk — treat as cleared.
    }
  }
  // Always clear the fallback slot too, so logout/invalidation fully
  // clears the session regardless of where the value was written.
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Treat as cleared.
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

/**
 * Remove every persisted auth artifact (tokens + cached user +
 * offline-session metadata).
 *
 * The offline timestamp MUST be cleared here: otherwise a logout (or an
 * invalid-session wipe) leaves stale "last online" metadata behind and
 * the persisted session is not fully cleared.
 */
export async function clearAuthentication(): Promise<void> {
  await Promise.all([
    clearAuthTokens(),
    clearCachedUser(),
    clearLastOnlineAuthentication(),
  ]);
}

/** True when a refresh token is persisted (session may be restorable). */
export async function hasPersistedSession(): Promise<boolean> {
  const tokens = await getAuthTokens();
  return Boolean(tokens.refreshToken);
}
