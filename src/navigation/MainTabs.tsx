import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "@config/theme";
import InventoryStack from "./InventoryStack";
import DiaryStack from "./DiaryStack";
import ProfileStack from "./ProfileStack";
import SearchStack from "./SearchStack";
import type { MainTabsParamList } from "./types";

// ─── Placeholder Screen ─────────────────────────────────────────────────────

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text variant="headlineSmall" style={styles.placeholderText}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.comingSoon}>
        Coming soon
      </Text>
    </View>
  );
}

// ─── Tab Screens ────────────────────────────────────────────────────────────

function ScanScreen() {
  return <PlaceholderScreen title="Scan" />;
}
// ─── Tab Navigator ──────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<keyof MainTabsParamList, string> = {
  Diary: "book-open-variant",
  Inventory: "bottle-wine",
  Scan: "camera",
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
            name={TAB_ICONS[route.name]}
            color={color}
            size={size}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      })}
    >
      <Tab.Screen
        name="Diary"
        component={DiaryStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Search" component={SearchStack} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.text,
  },
  comingSoon: {
    color: colors.textSecondary,
    marginTop: 8,
  },
});
