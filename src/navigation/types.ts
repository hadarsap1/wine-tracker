import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";

// ─── Param Lists ────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabsParamList = {
  Diary: undefined;
  Inventory: undefined;
  Scan: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};

// ─── Screen Props ───────────────────────────────────────────────────────────

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;
export type SignUpScreenProps = NativeStackScreenProps<AuthStackParamList, "SignUp">;
