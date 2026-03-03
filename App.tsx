import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { paperTheme, navigationTheme } from "@config/theme";
import { useAuthStore } from "@stores/authStore";
import { RootNavigator } from "@navigation/index";

function AppContent() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          <AppContent />
          <StatusBar style="light" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
