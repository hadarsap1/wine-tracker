import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { InventoryStackParamList } from "./types";
import HeaderBackButton from "@components/common/HeaderBackButton";
import InventoryListScreen from "@screens/Inventory/InventoryListScreen";
import AddWineScreen from "@screens/Inventory/AddWineScreen";
import WineDetailScreen from "@screens/Inventory/WineDetailScreen";
import EditWineScreen from "@screens/Inventory/EditWineScreen";
import ImportOrderScreen from "@screens/Inventory/ImportOrderScreen";
import ImportOrderReviewScreen from "@screens/Inventory/ImportOrderReviewScreen";
import StorageMapScreen from "@screens/Inventory/StorageMapScreen";

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
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
        name="InventoryList"
        component={InventoryListScreen}
        options={{ title: t.stackTitles.inventoryList }}
      />
      <Stack.Screen
        name="AddWine"
        component={AddWineScreen}
        options={{ title: t.stackTitles.addWine }}
      />
      <Stack.Screen
        name="WineDetail"
        component={WineDetailScreen}
        options={{ title: t.stackTitles.wineDetail }}
      />
      <Stack.Screen
        name="EditWine"
        component={EditWineScreen}
        options={{ title: t.stackTitles.editWine }}
      />
      <Stack.Screen
        name="ImportOrder"
        component={ImportOrderScreen}
        options={{ title: t.stackTitles.importOrder }}
      />
      <Stack.Screen
        name="ImportOrderReview"
        component={ImportOrderReviewScreen}
        options={{ title: t.stackTitles.importOrderReview }}
      />
      <Stack.Screen
        name="StorageMap"
        component={StorageMapScreen}
        options={{ title: t.stackTitles.storageMap }}
      />
    </Stack.Navigator>
  );
}
