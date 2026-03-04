import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import type { DiaryStackParamList } from "./types";
import DiaryListScreen from "@screens/Diary/DiaryListScreen";
import AddEntryScreen from "@screens/Diary/AddEntryScreen";
import EntryDetailScreen from "@screens/Diary/EntryDetailScreen";
import EditEntryScreen from "@screens/Diary/EditEntryScreen";
import SelectWineScreen from "@screens/Diary/SelectWineScreen";

const Stack = createNativeStackNavigator<DiaryStackParamList>();

export default function DiaryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="DiaryList"
        component={DiaryListScreen}
        options={{ title: "My Diary" }}
      />
      <Stack.Screen
        name="AddEntry"
        component={AddEntryScreen}
        options={{ title: "New Entry" }}
      />
      <Stack.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
        options={{ title: "Entry Details" }}
      />
      <Stack.Screen
        name="EditEntry"
        component={EditEntryScreen}
        options={{ title: "Edit Entry" }}
      />
      <Stack.Screen
        name="SelectWine"
        component={SelectWineScreen}
        options={{ title: "Select Wine" }}
      />
    </Stack.Navigator>
  );
}
