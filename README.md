# Wine Tracker

**Personal wine collection & tasting diary app** | Built with [Claude Code](https://claude.ai/claude-code)

A cross-platform mobile app for managing your wine inventory, logging tastings with ratings and photos, and scanning receipts with OCR. Built with Expo, React Native, and Firebase.

## Features

### Wine Inventory
- Full CRUD for wine collection
- Detailed profiles: name, type (Red/White/Rosé/Sparkling/Dessert/Fortified/Orange), producer, region, country, vintage, grape variety
- Quantity tracking, storage location, purchase date & price
- Search and filter by name or type

### Tasting Diary
- Log tastings with 5-star ratings, notes, and photos
- Link entries to inventory items
- Sort by date (newest first)
- Edit and delete with image cleanup

### Receipt Scanning (OCR)
- Capture receipts via device camera
- Google Cloud Vision API for text extraction
- Status tracking: pending → processing → parsed → confirmed
- Match parsed items to existing wines

### Multi-User & Household
- Email/password authentication
- User profiles with preferences (default wine type, currency, theme)
- Household model with admin/member roles (architecture ready)
- Shared inventory and diary within households

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 54 + React Native 0.81 |
| Runtime | React 19 |
| Language | TypeScript 5.9 |
| UI | React Native Paper 5 (Material Design 3) |
| State | Zustand 5 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Cloud Storage |
| OCR | Google Cloud Vision API |
| Navigation | React Navigation (tabs + stacks) |

## Project Structure

```
src/
├── screens/
│   ├── Auth/           # Sign up, login
│   ├── Inventory/      # Wine list, add, edit, detail
│   ├── Diary/          # Tasting log, add entry, select wine
│   ├── Scan/           # Receipt/label scanning, review
│   ├── Search/         # Search and filter
│   └── Profile/        # User preferences, sign out
├── components/         # Reusable UI components
├── services/
│   ├── auth.ts         # Firebase Auth
│   ├── inventory.ts    # Wine CRUD operations
│   ├── diary.ts        # Tasting diary operations
│   ├── household.ts    # Household management
│   ├── storage.ts      # Image upload/delete
│   └── vision.ts       # Google Cloud Vision OCR
├── stores/
│   ├── authStore.ts
│   ├── inventoryStore.ts
│   └── diaryStore.ts
├── navigation/         # Tab & stack navigators
├── types/              # TypeScript interfaces
├── hooks/              # Custom React hooks
└── config/             # Firebase, theme, env
```

## Getting Started

```bash
npm install
npm start              # Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run web            # Web version
```

### Environment Variables

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY=...
```

## Data Model (Firestore)

```
users/{uid}                          # Profile, preferences, household IDs
households/{householdId}/
  ├── members/{memberId}             # Roles (admin/member)
  ├── wines/{wineId}                 # Wine master data
  ├── inventoryItems/{itemId}        # Quantities, locations, purchase info
  ├── diaryEntries/{entryId}         # Tastings with ratings & photos
  └── receipts/{receiptId}           # OCR'd receipts with parsed items
```

## Design

- Dark theme (navy/crimson color scheme)
- Material Design 3 via React Native Paper
- Supports iOS, Android, and Web
