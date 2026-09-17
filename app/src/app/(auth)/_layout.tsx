/**
 * Unauthenticated route group: login, signup, forgot-password, login-otp,
 * verify-email.
 * - While auth bootstrap is running: show loading (no redirect, no flash).
 * - If authenticated: redirect out to the protected app.
 * - If unauthenticated/offline-without-session: allow auth screens.
 * - Verification is driven by explicit navigation: signup routes to
 *   verify-email, while completed login OTP routes straight to the app.
 */
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import AuthLoadingScreen from "../../components/auth/AuthLoadingScreen";

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen message="Checking your session…" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="login-otp" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
