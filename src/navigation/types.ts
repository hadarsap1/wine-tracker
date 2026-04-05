import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { WineType } from "@/types/index";
import type { ParsedLabelData } from "@/utils/parseLabelText";
import type { ParsedOrderItem } from "@/utils/parseOrderText";

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
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  AddWine: { prefillName?: string; prefillType?: string } | undefined;
  WineDetail: { itemId: string; wineId: string };
  EditWine: { wineId: string; itemId: string };
  ImportOrder: undefined;
  ImportOrderReview: { items: ParsedOrderItem[]; rawText: string };
};

export type DiaryStackParamList = {
  DiaryList: undefined;
  AddEntry: { selectedWine?: SelectedWine } | undefined;
  EntryDetail: { entryId: string };
  EditEntry: { entryId: string };
  SelectWine: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ManageHousehold: undefined;
  JoinHousehold: undefined;
  Help: undefined;
};

export type SearchStackParamList = {
  SearchMain: undefined;
  SearchWineDetail: { itemId: string; wineId: string };
};

export type ScanStackParamList = {
  ScanMain: undefined;
  ScanReview: { parsedData: ParsedLabelData; imageUri: string; rawText: string };
};

export type MainTabsParamList = {
  Diary: NavigatorScreenParams<DiaryStackParamList>;
  Inventory: NavigatorScreenParams<InventoryStackParamList>;
  Scan: NavigatorScreenParams<ScanStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};

// ─── Screen Props ───────────────────────────────────────────────────────────

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export type InventoryListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<InventoryStackParamList, "InventoryList">,
  BottomTabScreenProps<MainTabsParamList>
>;
export type AddWineScreenProps = NativeStackScreenProps<InventoryStackParamList, "AddWine">;
export type WineDetailScreenProps = NativeStackScreenProps<InventoryStackParamList, "WineDetail">;
export type EditWineScreenProps = NativeStackScreenProps<InventoryStackParamList, "EditWine">;
export type ImportOrderScreenProps = NativeStackScreenProps<InventoryStackParamList, "ImportOrder">;
export type ImportOrderReviewScreenProps = NativeStackScreenProps<InventoryStackParamList, "ImportOrderReview">;

export type DiaryListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<DiaryStackParamList, "DiaryList">,
  BottomTabScreenProps<MainTabsParamList>
>;
export type AddEntryScreenProps = NativeStackScreenProps<DiaryStackParamList, "AddEntry">;
export type EntryDetailScreenProps = NativeStackScreenProps<DiaryStackParamList, "EntryDetail">;
export type EditEntryScreenProps = NativeStackScreenProps<DiaryStackParamList, "EditEntry">;
export type SelectWineScreenProps = NativeStackScreenProps<DiaryStackParamList, "SelectWine">;

export type ProfileMainScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "ProfileMain">,
  BottomTabScreenProps<MainTabsParamList>
>;
export type EditProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, "EditProfile">;
export type ManageHouseholdScreenProps = NativeStackScreenProps<ProfileStackParamList, "ManageHousehold">;
export type JoinHouseholdScreenProps = NativeStackScreenProps<ProfileStackParamList, "JoinHousehold">;
export type HelpScreenProps = NativeStackScreenProps<ProfileStackParamList, "Help">;

export type SearchMainScreenProps = CompositeScreenProps<
  NativeStackScreenProps<SearchStackParamList, "SearchMain">,
  BottomTabScreenProps<MainTabsParamList>
>;
export type SearchWineDetailScreenProps = NativeStackScreenProps<SearchStackParamList, "SearchWineDetail">;

export type ScanMainScreenProps = NativeStackScreenProps<ScanStackParamList, "ScanMain">;
export type ScanReviewScreenProps = NativeStackScreenProps<ScanStackParamList, "ScanReview">;
