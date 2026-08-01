import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { I18nManager, Platform, StyleSheet, Text, View } from "react-native";
import * as Font from "expo-font";
import { paperTheme, navigationTheme } from "@config/theme";
import { useAuthStore } from "@stores/authStore";
import { validateEnv } from "@config/env";
import { firebaseInitError } from "@config/firebase";
import { t } from "@i18n/index";
import { RootNavigator } from "@navigation/index";
import GlobalSnackbar from "@components/common/GlobalSnackbar";
import ErrorBoundary from "@components/common/ErrorBoundary";
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
  // fixing label animation direction and other RTL layout in TextInput.
  (I18nManager as unknown as Record<string, unknown>).isRTL = true;
  (I18nManager as unknown as Record<string, unknown>).getConstants = () => ({ isRTL: true });

  // react-native-paper's TextInput label uses `position: absolute; left: 0` (physical CSS,
  // not logical), so dir="rtl" alone doesn't flip it. We target the label elements by their
  // default testID ("text-input-flat") which react-native-web renders as data-testid.
  // :has() selects the width-constrained parent div and pushes it to the right edge.
  const rtlStyle = document.createElement("style");
  rtlStyle.textContent = `
    html[dir="rtl"] [data-testid="text-input-flat-label-active"],
    html[dir="rtl"] [data-testid="text-input-flat-label-inactive"] {
      left: auto !important;
      right: 0 !important;
      text-align: right !important;
    }
    html[dir="rtl"] div:has(> [data-testid="text-input-flat-label-active"]) {
      margin-left: auto !important;
    }
  `;
  document.head.appendChild(rtlStyle);
}

const missingEnv = validateEnv();
if (missingEnv.length > 0) {
  console.error(
    `[Wine Tracker] Missing required env vars:\n  ${missingEnv.join("\n  ")}\n` +
    `Copy .env.example to .env.local and fill in the values.`
  );
}

/**
 * Shown when Firebase can't start (missing/malformed config). Previously this
 * situation produced a blank white screen with only a console error, because the
 * failure happens during module evaluation — before any error boundary exists.
 */
function ConfigErrorScreen({ detail }: { detail: string }) {
  return (
    <View style={configErrorStyles.container}>
      <Text style={configErrorStyles.title}>{t.configErrorTitle}</Text>
      <Text style={configErrorStyles.message}>{t.configErrorMsg}</Text>
      <Text style={configErrorStyles.detail}>{detail}</Text>
    </View>
  );
}

const configErrorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: { color: "#c9a84c", fontSize: 20, fontWeight: "bold", textAlign: "center" },
  message: { color: "#a0a0c0", fontSize: 14, textAlign: "center", marginTop: 12 },
  detail: { color: "#6b6b8a", fontSize: 11, textAlign: "center", marginTop: 20 },
});

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

  // Surface a bad/missing Firebase config instead of a silent blank page.
  if (firebaseInitError || missingEnv.length > 0) {
    const detail = firebaseInitError
      ? firebaseInitError.message
      : `Missing: ${missingEnv.join(", ")}`;
    return <ConfigErrorScreen detail={detail} />;
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
