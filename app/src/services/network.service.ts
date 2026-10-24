/**
 * Network/offline service — single place for connectivity state.
 *
 * Uses @react-native-community/netinfo (Expo-compatible, subscription
 * support) with a fetch-probe fallback so the module never crashes when
 * the native listener is unavailable (e.g. web without native module).
 *
 * Screens must NOT create their own NetInfo listeners — subscribe here
 * (AuthContext owns the app-level subscription).
 */

import { NETWORK_CONFIG } from "../constants/auth.constants";
import type { NetworkStatus } from "../types/auth.types";

export type NetworkChangeListener = (status: NetworkStatus) => void;
export type Unsubscribe = () => void;

let NetInfoModule: typeof import("@react-native-community/netinfo") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NetInfoModule = require("@react-native-community/netinfo");
} catch {
  NetInfoModule = null;
}

function toNetworkStatus(raw: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
  type?: string;
}): NetworkStatus {
  return {
    isConnected: raw.isConnected ?? false,
    isInternetReachable: raw.isInternetReachable ?? null,
    type: raw.type ?? null,
  };
}

export function isOnlineStatus(status: NetworkStatus): boolean {
  if (status.isInternetReachable !== null) return status.isInternetReachable;
  return status.isConnected;
}

// ---------------------------------------------------------------------------
// One-shot checks
// ---------------------------------------------------------------------------

export async function getNetworkState(): Promise<NetworkStatus> {
  if (NetInfoModule) {
    try {
      const state = await NetInfoModule.fetch();
      return toNetworkStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    } catch {
      // Fall through to probe.
    }
  }
  return probeReachability();
}

export async function isOnline(): Promise<boolean> {
  const state = await getNetworkState();
  return isOnlineStatus(state);
}

/**
 * True for bundle-reload / unmount fetch cancelation (Hermes surfaces a
 * generic "fetch failed: Fetch request has been canceled", not AbortError).
 * Kept local so network.service stays independent of auth.api.
 */
function isProbeCanceled(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  if (typeof name === "string" && name === "AbortError") {
    return true;
  }
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") {
    const lower = message.toLowerCase();
    if (
      lower.includes("canceled") ||
      lower.includes("cancelled") ||
      lower.includes("aborted")
    ) {
      return true;
    }
  }
  return false;
}

/** Lightweight HTTP probe used as fallback / confirmation. */
async function probeReachability(): Promise<NetworkStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_CONFIG.REACHABILITY_TIMEOUT_MS);
  try {
    const res = await fetch(NETWORK_CONFIG.REACHABILITY_URL, {
      method: "GET",
      signal: controller.signal,
    });
    const reachable = res.ok;
    return { isConnected: reachable, isInternetReachable: reachable, type: "probe" };
  } catch (error) {
    // Canceled bootstrap probe: stay neutral (assume last-known online)
    // so callers don't flash a false offline banner during bundle reload.
    if (isProbeCanceled(error)) {
      return { isConnected: true, isInternetReachable: null, type: "probe-canceled" };
    }
    return { isConnected: false, isInternetReachable: false, type: "probe" };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Subscription (single shared listener fan-out when native unavailable)
// ---------------------------------------------------------------------------

const fallbackListeners = new Set<NetworkChangeListener>();
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let lastFallbackOnline: boolean | null = null;

function ensureFallbackPolling(): void {
  if (fallbackTimer || NetInfoModule) return;
  const poll = async () => {
    const state = await probeReachability();
    const online = isOnlineStatus(state);
    if (lastFallbackOnline === null || online !== lastFallbackOnline) {
      lastFallbackOnline = online;
      fallbackListeners.forEach((listener) => {
        try {
          listener(state);
        } catch {
          // Listener errors must not break polling.
        }
      });
    }
  };
  void poll();
  fallbackTimer = setInterval(poll, NETWORK_CONFIG.POLL_INTERVAL_MS);
  // Avoid keeping Node-style handles alive in tests.
  if (typeof (fallbackTimer as unknown as { unref?: () => void }).unref === "function") {
    (fallbackTimer as unknown as { unref: () => void }).unref();
  }
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function
 * that MUST be called on cleanup (AuthContext does this once).
 */
export function subscribeToNetworkChanges(listener: NetworkChangeListener): Unsubscribe {
  if (NetInfoModule) {
    const unsubscribe = NetInfoModule.addEventListener((state) => {
      listener(
        toNetworkStatus({
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
        })
      );
    });
    return () => unsubscribe();
  }
  fallbackListeners.add(listener);
  ensureFallbackPolling();
  return () => {
    fallbackListeners.delete(listener);
    if (fallbackListeners.size === 0 && fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
      lastFallbackOnline = null;
    }
  };
}
