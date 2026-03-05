import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@config/theme";
import type { ProfileStackParamList } from "./types";
import ProfileMainScreen from "@screens/Profile/ProfileMainScreen";
import EditProfileScreen from "@screens/Profile/EditProfileScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileMainScreen}
        options={{ title: "Profile" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Edit Profile" }}
      />
    </Stack.Navigator>
  );
}
