import { Timestamp, FieldValue } from "firebase/firestore";

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum WineType {
  Red = "Red",
  White = "White",
  Rosé = "Rosé",
  Sparkling = "Sparkling",
  Dessert = "Dessert",
  Fortified = "Fortified",
  Orange = "Orange",
  Other = "Other",
}

export enum HouseholdRole {
  Admin = "admin",
  Member = "member",
}

export enum ReceiptStatus {
  Pending = "pending",
  Processing = "processing",
  Parsed = "parsed",
  Confirmed = "confirmed",
  Error = "error",
}

// ─── Literal Types ───────────────────────────────────────────────────────────

export type Rating = 1 | 2 | 3 | 4 | 5;

// ─── Base Interface ──────────────────────────────────────────────────────────

export interface FirestoreDoc {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Utility Types ───────────────────────────────────────────────────────────

/** Recursively converts Timestamp fields to Date (for app-layer reads). */
export type WithDates<T> = {
  [K in keyof T]: T[K] extends Timestamp
    ? Date
    : T[K] extends Timestamp | undefined
      ? Date | undefined
      : T[K] extends object
        ? WithDates<T[K]>
        : T[K];
};

/** Allows FieldValue for Timestamp fields and omits `id` (for Firestore writes). */
export type WithFieldValues<T> = Omit<
  {
    [K in keyof T]: T[K] extends Timestamp
      ? Timestamp | FieldValue
      : T[K] extends Timestamp | undefined
        ? Timestamp | FieldValue | undefined
        : T[K];
  },
  "id"
>;

// ─── Embedded Objects ────────────────────────────────────────────────────────

export interface UserPreferences {
  defaultWineType?: WineType;
  currency: string;
  theme: "light" | "dark" | "system";
}

export interface VivinoData {
  score: number;
  ratings: number;
  imageUrl?: string;
  wineName?: string;
  wineUrl?: string;
  /** WineType enum value extracted from Vivino (e.g. "Red", "White") */
  wineType?: string;
  /** Producer/winery name from Vivino */
  producerName?: string;
  region?: string;
  country?: string;
  fetchedAt: Timestamp;
}

export interface ReceiptParsedItem {
  wineName: string;
  quantity: number;
  price?: number;
  matched: boolean;
  matchedWineId?: string;
}

// ─── Document Interfaces ─────────────────────────────────────────────────────

export interface UserProfile extends FirestoreDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  householdIds: string[];
  preferences: UserPreferences;
}

export interface Household extends FirestoreDoc {
  name: string;
  createdBy: string;
  memberCount: number;
}

export interface HouseholdMember extends FirestoreDoc {
  userId: string;
  displayName: string;
  email: string;
  role: HouseholdRole;
  joinedAt: Timestamp;
}

export interface Wine extends FirestoreDoc {
  name: string;
  nameNormalized: string;
  type: WineType;
  producer?: string;
  region?: string;
  country?: string;
  vintage?: number;
  grape?: string;
  vivinoData?: VivinoData;
  imageUrl?: string;
  notes?: string;
}

export type InventoryStatus = "in_stock" | "on_the_way";

export type StorageUnitType = "fridge" | "rack";

export interface StorageUnit extends FirestoreDoc {
  name: string;
  type: StorageUnitType;
  rows: number;
  cols: number;
}
export type AppStorageUnit = WithDates<StorageUnit>;
export type CreateStorageUnit = WithFieldValues<StorageUnit>;

export interface InventoryItem extends FirestoreDoc {
  wineId: string;
  wineName: string;
  wineType: WineType;
  producerName?: string;
  quantity: number;
  status: InventoryStatus;
  location?: string;
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  receiptId?: string;
  storageUnitId?: string;
  storageRow?: number;
  storageCol?: number;
}

export interface DiaryEntry extends FirestoreDoc {
  wineId: string;
  wineName: string;
  wineType: WineType;
  rating: Rating | null;
  notes?: string;
  imageUrls: string[];
  tastingDate: Timestamp;
  inventoryItemId?: string;
  wantToOrder?: boolean;
}

export interface HouseholdInvite extends FirestoreDoc {
  householdId: string;
  createdBy: string;
  expiresAt: Timestamp;
  used: boolean;
}

export interface Receipt extends FirestoreDoc {
  imageUrl: string;
  ocrText?: string;
  status: ReceiptStatus;
  parsedItems: ReceiptParsedItem[];
  storeName?: string;
  purchaseDate?: Timestamp;
  totalAmount?: number;
  errorMessage?: string;
}

// ─── App-Layer Aliases (Timestamp → Date) ────────────────────────────────────

export type AppUserProfile = WithDates<UserProfile>;
export type AppHousehold = WithDates<Household>;
export type AppHouseholdMember = WithDates<HouseholdMember>;
export type AppWine = WithDates<Wine>;
export type AppInventoryItem = WithDates<InventoryItem>;
export type AppDiaryEntry = WithDates<DiaryEntry>;
export type AppReceipt = WithDates<Receipt>;

// ─── Write-Layer Aliases (allow FieldValue, omit id) ─────────────────────────

export type CreateUserProfile = WithFieldValues<UserProfile>;
export type CreateHousehold = WithFieldValues<Household>;
export type CreateHouseholdMember = WithFieldValues<HouseholdMember>;
export type CreateWine = WithFieldValues<Wine>;
export type CreateInventoryItem = WithFieldValues<InventoryItem>;
export type CreateDiaryEntry = WithFieldValues<DiaryEntry>;
export type CreateReceipt = WithFieldValues<Receipt>;

// ─── Collection Path Constants ───────────────────────────────────────────────

export const COLLECTIONS = {
  users: "users",
  households: "households",
  members: "members",
  wines: "wines",
  inventoryItems: "inventoryItems",
  diaryEntries: "diaryEntries",
  receipts: "receipts",
  invites: "invites",
  storageUnits: "storageUnits",
} as const;
