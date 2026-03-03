import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import type { InventoryStackParamList } from "./types";
import InventoryListScreen from "@screens/Inventory/InventoryListScreen";
import AddWineScreen from "@screens/Inventory/AddWineScreen";
import WineDetailScreen from "@screens/Inventory/WineDetailScreen";
import EditWineScreen from "@screens/Inventory/EditWineScreen";

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{ title: "My Cellar" }}
      />
      <Stack.Screen
        name="AddWine"
        component={AddWineScreen}
        options={{ title: "Add Wine" }}
      />
      <Stack.Screen
        name="WineDetail"
        component={WineDetailScreen}
        options={{ title: "Wine Details" }}
      />
      <Stack.Screen
        name="EditWine"
        component={EditWineScreen}
        options={{ title: "Edit Wine" }}
      />
    </Stack.Navigator>
  );
}
