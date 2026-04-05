import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { DiaryStackParamList } from "./types";
import HeaderBackButton from "@components/common/HeaderBackButton";
import DiaryListScreen from "@screens/Diary/DiaryListScreen";
import AddEntryScreen from "@screens/Diary/AddEntryScreen";
import EntryDetailScreen from "@screens/Diary/EntryDetailScreen";
import EditEntryScreen from "@screens/Diary/EditEntryScreen";
import SelectWineScreen from "@screens/Diary/SelectWineScreen";

const Stack = createNativeStackNavigator<DiaryStackParamList>();

export default function DiaryStack() {
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
        name="DiaryList"
        component={DiaryListScreen}
        options={{ title: t.stackTitles.diaryList }}
      />
      <Stack.Screen
        name="AddEntry"
        component={AddEntryScreen}
        options={{ title: t.stackTitles.addEntry }}
      />
      <Stack.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
        options={{ title: t.stackTitles.entryDetail }}
      />
      <Stack.Screen
        name="EditEntry"
        component={EditEntryScreen}
        options={{ title: t.stackTitles.editEntry }}
      />
      <Stack.Screen
        name="SelectWine"
        component={SelectWineScreen}
        options={{ title: t.stackTitles.selectWine }}
      />
    </Stack.Navigator>
  );
}
