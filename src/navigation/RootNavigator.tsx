import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@stores/authStore";
import LoadingScreen from "@screens/Auth/LoadingScreen";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
