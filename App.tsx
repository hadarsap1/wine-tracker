import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { I18nManager, Platform, View } from "react-native";
import * as Font from "expo-font";
import { paperTheme, navigationTheme } from "@config/theme";
import { useAuthStore } from "@stores/authStore";
import { validateEnv } from "@config/env";
import { RootNavigator } from "@navigation/index";
import GlobalSnackbar from "@components/common/GlobalSnackbar";
import * as analytics from "@services/analytics";

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Set RTL and language for web at module load time
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "he");

  // react-native-web's I18nManager is a no-op (forceRTL does nothing, isRTL always false).
  // Patch the singleton so react-native-paper's internal RTL checks return true,
  // fixing floating label positions and other RTL layout in TextInput, etc.
  (I18nManager as unknown as Record<string, unknown>).isRTL = true;
  (I18nManager as unknown as Record<string, unknown>).getConstants = () => ({ isRTL: true });
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
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string | undefined>(undefined);
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
          (document.fonts as FontFaceSet & { add: (f: FontFace) => void }).add(face);
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
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={() => {
            routeNameRef.current = navigationRef.getCurrentRoute()?.name;
          }}
          onStateChange={() => {
            const current = navigationRef.getCurrentRoute()?.name;
            if (current && current !== routeNameRef.current) {
              analytics.screenView(current);
              routeNameRef.current = current;
            }
          }}
        >
          <AppContent />
          <GlobalSnackbar />
          <StatusBar style="light" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
