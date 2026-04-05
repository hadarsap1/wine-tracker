import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { I18nManager, Platform, View } from "react-native";
import * as Font from "expo-font";
import { paperTheme, navigationTheme } from "@config/theme";
import { useAuthStore } from "@stores/authStore";
import { validateEnv } from "@config/env";
import { RootNavigator } from "@navigation/index";
import GlobalSnackbar from "@components/common/GlobalSnackbar";

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Set RTL and language for web at module load time
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "he");
}

if (__DEV__) {
  const missing = validateEnv();
  if (missing.length > 0) {
    console.error(
      `[Wine Tracker] Missing required env vars:\n  ${missing.join("\n  ")}\n` +
      `Copy .env.example to .env.local and fill in the values.`
    );
  }
}

function AppContent() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return <RootNavigator />;
}

export default function App() {
  const [fontsReady, setFontsReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const fontUrl: string = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf");

    const load = async () => {
      // Populate expo-font's isLoaded cache so Icon components start with fontIsLoaded=true.
      // On iOS/Safari expo-font bypasses FontObserver and resolves instantly (no font-bytes wait).
      await Font.loadAsync({ "material-community": fontUrl }).catch(() => {});

      // Use FontFace API which actually waits for the font bytes to download.
      // This works reliably on iOS Safari (supported since iOS 12).
      if (typeof FontFace !== "undefined") {
        try {
          const face = new FontFace(
            "material-community",
            `url(${fontUrl}) format('truetype')`
          );
          document.fonts.add(face);
          await face.load();
        } catch {
          // ignore — expo-font cache above is still populated
        }
      }
    };

    load().finally(() => setFontsReady(true));
  }, []);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: "#1a1a2e" }} />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          <AppContent />
          <GlobalSnackbar />
          <StatusBar style="light" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
