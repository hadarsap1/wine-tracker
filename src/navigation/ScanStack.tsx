import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { ScanStackParamList } from "./types";
import HeaderBackButton from "@components/common/HeaderBackButton";
import ScanMainScreen from "@screens/Scan/ScanMainScreen";
import ScanReviewScreen from "@screens/Scan/ScanReviewScreen";

const Stack = createNativeStackNavigator<ScanStackParamList>();

export default function ScanStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        headerTitleAlign: "center",
        headerLeft: ({ canGoBack, tintColor }) =>
          canGoBack ? (
            <HeaderBackButton
              onPress={() => navigation.goBack()}
              tintColor={tintColor}
            />
          ) : null,
      })}
    >
      <Stack.Screen
        name="ScanMain"
        component={ScanMainScreen}
        options={{ title: t.stackTitles.scanMain }}
      />
      <Stack.Screen
        name="ScanReview"
        component={ScanReviewScreen}
        options={{ title: t.stackTitles.scanReview }}
      />
    </Stack.Navigator>
  );
}
