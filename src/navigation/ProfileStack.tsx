import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { ProfileStackParamList } from "./types";
import HeaderBackButton from "@components/common/HeaderBackButton";
import ProfileMainScreen from "@screens/Profile/ProfileMainScreen";
import EditProfileScreen from "@screens/Profile/EditProfileScreen";
import ManageHouseholdScreen from "@screens/Profile/ManageHouseholdScreen";
import JoinHouseholdScreen from "@screens/Profile/JoinHouseholdScreen";
import HelpScreen from "@screens/Profile/HelpScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
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
        name="ProfileMain"
        component={ProfileMainScreen}
        options={{ title: t.stackTitles.profileMain }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t.stackTitles.editProfile }}
      />
      <Stack.Screen
        name="ManageHousehold"
        component={ManageHouseholdScreen}
        options={{ title: t.stackTitles.manageHousehold }}
      />
      <Stack.Screen
        name="JoinHousehold"
        component={JoinHouseholdScreen}
        options={{ title: t.stackTitles.joinHousehold }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: t.stackTitles.help }}
      />
    </Stack.Navigator>
  );
}
