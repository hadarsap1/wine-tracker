import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import InventoryStack from "./InventoryStack";
import DiaryStack from "./DiaryStack";
import ProfileStack from "./ProfileStack";
import SearchStack from "./SearchStack";
import ScanStack from "./ScanStack";
import type { MainTabsParamList } from "./types";

// ─── Tab Navigator ──────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<keyof MainTabsParamList, string> = {
  Inventory: "bottle-wine",
  Diary: "book-open-variant",
  Scan: "line-scan",
  Search: "magnify",
  Profile: "account",
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={TAB_ICONS[route.name] as any}
            color={color}
            size={size}
          />
        ),
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      })}
    >
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{ headerShown: false, tabBarLabel: t.tabInventory }}
      />
      <Tab.Screen
        name="Diary"
        component={DiaryStack}
        options={{ headerShown: false, tabBarLabel: t.tabDiary }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStack}
        options={{ headerShown: false, tabBarLabel: t.tabScan }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ headerShown: false, tabBarLabel: t.tabSearch }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false, tabBarLabel: t.tabProfile }}
      />
    </Tab.Navigator>
  );
}
