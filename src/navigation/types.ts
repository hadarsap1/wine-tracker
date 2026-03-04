import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { WineType } from "@/types/index";

// ─── Selected Wine (for Diary flow) ─────────────────────────────────────────

export type SelectedWine = {
  wineId: string;
  wineName: string;
  wineType: WineType;
  inventoryItemId?: string;
};

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

export type DiaryStackParamList = {
  DiaryList: undefined;
  AddEntry: { selectedWine?: SelectedWine } | undefined;
  EntryDetail: { entryId: string };
  EditEntry: { entryId: string };
  SelectWine: undefined;
};

export type MainTabsParamList = {
  Diary: NavigatorScreenParams<DiaryStackParamList>;
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

export type DiaryListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<DiaryStackParamList, "DiaryList">,
  BottomTabScreenProps<MainTabsParamList>
>;
export type AddEntryScreenProps = NativeStackScreenProps<DiaryStackParamList, "AddEntry">;
export type EntryDetailScreenProps = NativeStackScreenProps<DiaryStackParamList, "EntryDetail">;
export type EditEntryScreenProps = NativeStackScreenProps<DiaryStackParamList, "EditEntry">;
export type SelectWineScreenProps = NativeStackScreenProps<DiaryStackParamList, "SelectWine">;
