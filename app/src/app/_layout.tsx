import "../../global.css";

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as NavigationBar from "expo-navigation-bar";

import { AuthProvider } from "../context/AuthContext";
import OfflineIndicator from "../components/auth/OfflineIndicator";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      try {
        void NavigationBar.setStyle("dark");
      } catch (error) {
        console.warn(
          "Android navigation bar configuration warning:",
          error
        );
      }
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload fonts/assets here if needed.
        // Authentication bootstrap is handled by AuthProvider.
      } catch (error) {
        console.warn("App preparation warning:", error);
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
      <OfflineIndicator />
    </AuthProvider>
  );
}