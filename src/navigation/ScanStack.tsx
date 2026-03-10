import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import type { ScanStackParamList } from "./types";
import ScanMainScreen from "@screens/Scan/ScanMainScreen";
import ScanReviewScreen from "@screens/Scan/ScanReviewScreen";

const Stack = createNativeStackNavigator<ScanStackParamList>();

export default function ScanStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="ScanMain"
        component={ScanMainScreen}
        options={{ title: "Scan Label" }}
      />
      <Stack.Screen
        name="ScanReview"
        component={ScanReviewScreen}
        options={{ title: "Review Wine" }}
      />
    </Stack.Navigator>
  );
}
