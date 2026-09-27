/**
 * Root index route — decides initial navigation AFTER auth bootstrap.
 *
 * - While AuthProvider is restoring the session: keep the splash
 *   animation on screen (never flash login).
 * - As soon as auth restoration AND the intro's own assets resolve:
 *   navigate.
 *
 * There is deliberately NO minimum splash duration. The previous
 * MIN_SPLASH_MS = 3700 timer blocked navigation unconditionally, adding
 * a 3.7 s floor to EVERY cold start no matter how fast the device, the
 * app, and the network actually were.
 *
 * Navigation now waits only for genuine readiness:
 *   1. auth restoration completes (the authoritative signal — it is
 *      either an in-memory session, a SecureStore restore, or a network
 *      revalidation, and none of them should be hidden behind a clock),
 *   2. the intro's bundled assets have finished loading (reported by
 *      AnimatedIntro, which also reports asset failure as "ready" so a
 *      missing asset can never deadlock startup).
 *
 * The intro animation is unchanged and still plays; it simply no longer
 * holds the user hostage for a fixed duration.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AnimatedIntro from "../components/splash/AnimatedIntro";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated, isVerificationPending } = useAuth();
  const [assetsReady, setAssetsReady] = useState(false);

  const onAssetsReady = useCallback(() => {
    setAssetsReady(true);
  }, []);

  // Ready = auth restored AND the intro's assets settled. No timers.
  const ready = !isLoading && assetsReady;

  useEffect(() => {
    if (!ready) return;
    if (isVerificationPending) {
      router.replace("/verify-email" as any);
    } else if (isAuthenticated) {
      router.replace("/(tabs)");
    } else {
      router.replace("/onboarding");
    }
  }, [ready, isAuthenticated, isVerificationPending, router]);

  return <AnimatedIntro onAssetsReady={onAssetsReady} />;
}
