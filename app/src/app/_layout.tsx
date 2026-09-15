import "../../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../context/AuthContext";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload fonts/assets here if needed. Auth bootstrap runs
        // inside AuthProvider and gates route decisions via isLoading,
        // so the splash screen must not hide before this resolves.
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    void prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      void SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
