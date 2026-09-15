import "../../global.css";

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { NavigationBar } from "expo-navigation-bar";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    try {
      NavigationBar.setHidden(false);
      NavigationBar.setStyle("light");
    } catch (e) {
      console.warn("Navigation bar configuration warning:", e);
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts/assets here if needed
      } catch (e) {
        console.warn("App preparation warning:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}