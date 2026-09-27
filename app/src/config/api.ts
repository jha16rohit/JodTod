import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/**
 * Backend base URL resolution.
 *
 * Rules:
 * - No LAN IP is ever hardcoded. A DHCP lease changes, and a baked-in
 *   address silently points a physical device at the wrong host. The dev
 *   host is always read from the Metro/Expo host URI at runtime.
 * - Production is driven by EXPO_PUBLIC_API_URL. When it is missing the
 *   misconfiguration is reported through `apiConfigurationError` instead
 *   of being hidden behind a placeholder domain that would 404 at runtime.
 */

const API_PORT = '5001';

/**
 * The production API origin, e.g. `https://api.jodtod.com`.
 *
 * Set EXPO_PUBLIC_API_URL in app/.env (see app/.env.example). The value
 * must be the scheme + host only — no trailing /api, no trailing slash.
 */
const CONFIGURED_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

/**
 * Resolve the dev-server host from the Expo host URI (e.g.
 * `10.0.2.2:8081` -> `10.0.2.2`).
 *
 * Returns null for Expo Go tunnels/manifests that do not expose one.
 */
function devServerIp(): string | null {
  try {
    const hostUri: unknown =
      Constants.expoConfig?.hostUri ??
      (
        Constants as unknown as {
          manifest2?: { extra?: { expoClient?: { hostUri?: unknown } } };
        }
      ).manifest2?.extra?.expoClient?.hostUri;

    if (typeof hostUri !== 'string' || !hostUri) return null;

    const host = hostUri.split(':')[0]?.trim();

    if (!host || host === 'localhost' || host === '127.0.0.1') return null;

    return host;
  } catch {
    return null;
  }
}

/**
 * Android emulator reaches the host machine through 10.0.2.2.
 */
function androidEmulatorBaseUrl(): string | null {
  if (Platform.OS !== 'android') return null;
  if (Device.isDevice) return null;
  return `http://10.0.2.2:${API_PORT}`;
}

function devBaseUrl(): string | null {
  const emulator = androidEmulatorBaseUrl();
  if (emulator) return emulator;

  const host = devServerIp();
  if (host) return `http://${host}:${API_PORT}`;

  return null;
}

function resolveApiUrl(): string {
  if (__DEV__) {
    const dev = devBaseUrl();
    if (dev) return dev;
    return `http://localhost:${API_PORT}`;
  }

  return CONFIGURED_API_URL;
}

/**
 * Non-null when the API base URL could not be resolved.
 *
 * The app stays usable (the auth gate and error states render) and the
 * request layer surfaces this instead of firing requests at a host that
 * does not exist.
 */
export const apiConfigurationError: string | null = (() => {
  if (CONFIGURED_API_URL) {
    if (/^https?:\/\//i.test(CONFIGURED_API_URL)) return null;
    return `EXPO_PUBLIC_API_URL must start with http:// or https:// (received "${CONFIGURED_API_URL}").`;
  }

  if (!__DEV__) {
    return 'EXPO_PUBLIC_API_URL is not set. Add it to app/.env so release builds reach the JodTod API.';
  }

  if (!devBaseUrl()) {
    return 'Could not resolve the Expo dev-server host. Start the app through "expo start" or set EXPO_PUBLIC_API_URL explicitly.';
  }

  return null;
})();

export const API_URL = resolveApiUrl();
