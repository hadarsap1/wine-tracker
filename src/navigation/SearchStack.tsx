import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import type { SearchStackParamList } from "./types";
import SearchMainScreen from "@screens/Search/SearchMainScreen";
import WineDetailScreen from "@screens/Inventory/WineDetailScreen";

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="SearchMain"
        component={SearchMainScreen}
        options={{ title: "Search" }}
      />
      <Stack.Screen
        name="SearchWineDetail"
        component={WineDetailScreen as any}
        options={{ title: "Wine Details" }}
      />
    </Stack.Navigator>
  );
}
