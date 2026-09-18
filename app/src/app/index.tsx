/**
 * Root index route — decides initial navigation AFTER auth bootstrap.
 *
 * - While AuthProvider is restoring the session: keep the splash
 *   animation on screen (never flash login).
 * - After the minimum splash time + auth ready:
 *   authenticated → protected app, otherwise → onboarding.
 */
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AnimatedIntro from "../components/splash/AnimatedIntro";
import { useAuth } from "../context/AuthContext";

const MIN_SPLASH_MS = 3700;

export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated, isVerificationPending } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !splashDone) return;
    if (isVerificationPending) {
      router.replace("/verify-email");
    } else if (isAuthenticated) {
      router.replace("/(tabs)");
    } else {
      router.replace("/onboarding");
    }
  }, [isLoading, isAuthenticated, isVerificationPending, splashDone, router]);

  return <AnimatedIntro autoNavigate={false} />;
}
