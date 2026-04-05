import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { SearchStackParamList } from "./types";
import HeaderBackButton from "@components/common/HeaderBackButton";
import SearchMainScreen from "@screens/Search/SearchMainScreen";
import WineDetailScreen from "@screens/Inventory/WineDetailScreen";

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
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
        name="SearchMain"
        component={SearchMainScreen}
        options={{ title: t.stackTitles.searchMain }}
      />
      <Stack.Screen
        name="SearchWineDetail"
        component={WineDetailScreen as any}
        options={{ title: t.stackTitles.wineDetail }}
      />
    </Stack.Navigator>
  );
}
