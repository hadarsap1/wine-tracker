import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

// ─── Param Lists ────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  AddWine: undefined;
  WineDetail: { itemId: string; wineId: string };
  EditWine: { wineId: string; itemId: string };
};

export type MainTabsParamList = {
  Diary: undefined;
  Inventory: NavigatorScreenParams<InventoryStackParamList>;
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

export type InventoryListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<InventoryStackParamList, "InventoryList">,
  BottomTabScreenProps<MainTabsParamList>
>;
export type AddWineScreenProps = NativeStackScreenProps<InventoryStackParamList, "AddWine">;
export type WineDetailScreenProps = NativeStackScreenProps<InventoryStackParamList, "WineDetail">;
export type EditWineScreenProps = NativeStackScreenProps<InventoryStackParamList, "EditWine">;
