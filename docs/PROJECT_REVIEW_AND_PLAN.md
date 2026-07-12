# Wine Tracker — Full Project Review & Improvement Plan

**Date:** 2026-07-12
**Scope:** Security, QA/engineering quality, UX/UI
**Codebase reviewed:** `master` @ `538b766`

This document lists every finding from a full review of the app (Expo/React Native + Firebase), ranked by severity, followed by a phased execution plan.

---

## 1. Security findings

### 🔴 S1 — CRITICAL: Any signed-in user can join (and become admin of) any household

`firestore.rules` → `/households/{householdId}/members/{memberId}`:

```
allow create: if isSignedIn()
  && (isAdmin(householdId) || incomingData().userId == request.auth.uid)
  && ...
  && incomingData().role in ['admin', 'member'];
```

The `incomingData().userId == request.auth.uid` branch (added to let the household creator bootstrap their own membership) allows **any authenticated user** to create a member document for themselves in **any household** — with `role: 'admin'` if they choose. All invite validation (`used`, `expiresAt`, matching household) happens **client-side only** in `src/services/invite.ts`, so it protects nothing.

Impact: full read/write access to any household's wines, inventory, diary, receipts, and storage — the attacker only needs a household ID. Household IDs leak through invite docs (`/invites/{id}` is readable by any signed-in user) and any shared link/screenshot.

**Fix (recommended):** move invite redemption to a Cloud Function (`redeemInvite` callable using the Admin SDK) that atomically validates the invite (exists, unused, unexpired), creates the member doc with `role: 'member'`, updates the user profile, and marks the invite used. Then tighten the rules:
- Member self-create allowed **only** when `memberId == request.auth.uid`, `role == 'member'` is removed entirely (creation goes through the function), **or** keep a narrow bootstrap branch: `incomingData().role == 'admin'` only when the household doc's `createdBy == request.auth.uid` and no members exist yet.
- Alternatively (rules-only fix): require the self-create to reference a valid invite doc via `get()` — harder to get right; the Cloud Function approach is safer.

### 🔴 S2 — HIGH: `ensureMemberExists` bootstraps every user as `admin`

`src/services/household.ts:110` writes `role: HouseholdRole.Admin` for any household in the user's `householdIds` when the member doc is missing. Combined with S1, a user can add any household ID to their own profile (`users/{uid}` update rule allows arbitrary `householdIds`) and the app itself will then create an **admin** member doc for them on next launch. Even for legitimate users, joined-as-member accounts can be silently re-created as admin.

**Fix:** bootstrap with `role: 'member'` unless the household's `createdBy == uid`; after S1 is fixed, restrict the rule so self-created member docs can never carry `role: 'admin'`.

### 🔴 S3 — HIGH: Invite rules — no expiry check, and anyone can burn any invite

`/invites/{inviteId}` update rule only checks `used: false → true`. Consequences:
1. Expired invites can still be redeemed (expiry checked client-side only).
2. Any signed-in user who learns an invite ID can mark it used without joining — griefing/denial of invites.

**Fix:** enforce `request.time < resource.data.expiresAt` in rules; once redemption moves server-side (S1), disallow client updates to invites entirely. Add a TTL policy on `expiresAt` so stale invites are auto-deleted.

### 🟠 S4 — MEDIUM-HIGH: Unmetered paid APIs — `detectLabelText` and `vivinoProxy` have no rate limit

`functions/src/index.ts` rate-limits only `analyzeLabel` (GPT-4o). The comment in `src/config/firebase.ts` claims rate limiting guards `detectLabelText`, but it does not — any signed-in user can hammer Google Cloud Vision (billed per call) and the Vivino proxy without limit. There is also no size cap on `imageBase64` for either function (an attacker can send multi-MB payloads; OpenAI/Vision cost scales with input).

**Fix:** apply `checkScanRateLimit` (or a per-function variant) to `detectLabelText` and `vivinoProxy`; reject `imageBase64.length > ~4_000_000` (≈3 MB image); consider lowering `SCAN_DAILY_LIMIT` from 500 (that's ~$5–10/user/day of GPT-4o worst case).

### 🟠 S5 — MEDIUM: No Firebase App Check

Acknowledged in `src/config/firebase.ts` comments. Without App Check, the Firebase API key (public by design) lets anyone script against Auth/Firestore/Storage/Functions from outside the app. Combined with S4 this is the main cost-abuse vector.

**Fix:** enable App Check — reCAPTCHA Enterprise/v3 provider on web now (pure JS SDK, no native work), and `@react-native-firebase/app-check` (DeviceCheck/Play Integrity) when native builds ship. Enforce on Functions first, then Firestore/Storage.

### 🟠 S6 — MEDIUM: Storage rules — no size or content-type validation

`storage.rules` lets any household member write **any file of any size** under `households/{id}/**`, and any user under `users/{uid}/**`. Unbounded storage cost and potential for hosting arbitrary content behind download URLs.

**Fix:**
```
allow write: if ... && request.resource.size < 5 * 1024 * 1024
             && request.resource.contentType.matches('image/.*');
```

### 🟡 S7 — MEDIUM: Vulnerable dependencies (`npm audit`: 2 critical, 7 high, 16 moderate)

- `xlsx@0.18.5` — **high, no fix available** (prototype pollution GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9). It parses **user-supplied files** (Excel import), so this is a real attack surface, not a dev-only concern. Migrate to `exceljs`, or install SheetJS's maintained build from cdn.sheetjs.com (0.20.x).
- `protobufjs` (critical, transitive via firebase) and most others resolve with `npm audit fix` / dependency bumps.
- Re-run audit in `functions/` as well and add an audit step to CI.

### 🟡 S8 — LOW-MEDIUM: PII sent to PostHog without consent flow

`analytics.identify()` sends email + name; PostHog auto-captures IP-based geo. There is no privacy policy, consent banner (relevant for web/EU), or opt-out. Also required for App Store/Play privacy declarations later.

**Fix:** add a privacy policy page + a settings toggle to disable analytics; consider hashing or dropping email from `$set`.

### 🟡 S9 — LOW: Misc

- `users/{uid}` update rule lets a user rewrite `email` and `householdIds` freely — after S1's server-side redemption, make `householdIds` writable only by Functions, and pin `email` to `request.auth.token.email`.
- Vivino endpoints are scraped with spoofed browser headers — ToS/fragility risk; add caching (Firestore cache keyed by normalized query, e.g. 30-day TTL) to cut calls and blast radius.
- `analyzeLabel` logs API-key length and verbose internals — trim logs.
- Consider Firestore rules for `rateLimits/*` — currently covered by the catch-all deny (good); keep it that way if new match blocks are added above it.

---

## 2. QA / engineering findings

### 🔴 Q1 — Zero automated tests

No test runner, no unit tests, no rules tests. Highest-value targets, in order:
1. **Firestore security rules tests** (`@firebase/rules-unit-testing` + emulator) — would have caught S1–S3.
2. Pure logic: `parseOrderText.ts`, `parseLabelText.ts`, `matchScore`/`bestMatch` in functions.
3. Store logic (zustand stores are plain functions — easy to test).
4. Smoke E2E on web via Playwright (login → add wine → open bottle → diary entry).

### 🔴 Q2 — CI deploys to production with no quality gates

`.github/workflows/deploy.yml` pushes straight to Firebase Hosting on every push to `master` — no typecheck, no lint, no tests, no audit. Also:
- **Functions and Firestore/Storage rules are not deployed by CI** — rules in the repo can silently drift from what's live (worth verifying the deployed rules match the repo *today*, given S1).
- No PR validation workflow.

**Fix:** add a `ci.yml` running `tsc --noEmit`, ESLint, tests, and `npm audit --omit=dev --audit-level=high` on PRs; extend deploy job to `firebase deploy --only hosting,firestore:rules,storage,functions` so the repo is the single source of truth.

### 🟠 Q3 — No linting/formatting setup

`eslint-disable` comments exist but there is no ESLint config or script in either package. Add `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`, Prettier, and `"typecheck": "tsc --noEmit"` scripts (root + functions), wired into CI.

### 🟠 Q4 — `openBottle` race condition

`src/stores/inventoryStore.ts` reads `quantity` from **client state** and `src/services/inventory.ts:openBottle` decides delete-vs-decrement from that stale value inside a `writeBatch` (not a transaction). Two household members opening the last bottles concurrently can drive quantity negative or double-delete. **Fix:** use `runTransaction` reading the item doc server-side.

### 🟠 Q5 — Google sign-in cannot work on native builds

`src/services/auth.ts` uses `signInWithPopup` — a web-only API that throws on iOS/Android. LoginScreen is currently Google-only, so native app login is fully broken. Also, `SignUpScreen` and email `signIn` exist but are unreachable — no navigation from Login to SignUp and no email form on Login (dead code or missing UI, decide which).

**Fix:** gate by platform — keep popup on web; use `expo-auth-session`/`@react-native-google-signin` + `signInWithCredential` for native. Restore or remove the email/password path deliberately.

### 🟡 Q6 — Data lifecycle gaps

- Deleting an inventory item does not delete the wine doc or its label image → orphaned docs/files (may be intentional for diary history — document the decision).
- `deleteImage()` failures are silent; no cleanup job for orphaned Storage files.
- `wines` delete requires admin but `inventoryItems` delete requires only member — inconsistent.

### 🟡 Q7 — Error handling & observability

- Raw Firebase error messages (`(e as Error).message`, English codes like `auth/invalid-credential`) are stored to state and shown in the Hebrew UI. Map error codes → localized strings.
- No React error boundary — one render crash white-screens the app. Add a top-level boundary that reports via `analytics.captureError` (currently defined but never called anywhere).
- No Sentry/crash reporting.

### 🟡 Q8 — Dead/unused dependencies

`expo-secure-store` is listed but never imported. `@expo/ngrok` in devDeps. Audit and prune.

---

## 3. UX / UI findings

### 🔴 U1 — Missing table-stakes account flows

- **No password reset** (no `sendPasswordResetEmail` anywhere) — email/password users who forget are locked out permanently.
- **No email verification.**
- **No account deletion** — a hard **App Store / Google Play rejection** for apps with account creation, and a GDPR requirement. Needs a Cloud Function that deletes auth user + user doc + sole-member households + storage files.

### 🟠 U2 — Accessibility is essentially absent

Two `accessibilityLabel`s in the entire app. Icon-only buttons (back buttons, FABs, rating stars, storage-grid slots) are invisible to screen readers; the web build ships to real users today. Plan: label all interactive elements, check contrast of `textSecondary`/gold-on-navy combos, respect dynamic font scaling, add web focus states.

### 🟠 U3 — Hebrew-only, hardcoded i18n

`src/i18n/index.ts` is a single hardcoded Hebrew object; `I18nManager.forceRTL(true)` is global. Fine for the current audience, but the structure blocks ever adding a second language, and forced RTL on native requires an app restart to take effect (first-launch layout can render LTR). Migrate to `i18next`/`expo-localization` keyed strings when convenient — low urgency, high touch-count, so do it before the string count grows further.

### 🟡 U4 — No offline story

The service worker is intentionally pass-through and Firestore offline persistence is not enabled. A cellar app is used *in the cellar* — often with poor connectivity. Quick wins:
- `initializeFirestore(app, { localCache: persistentLocalCache() })` on web/native — one-line offline reads + queued writes.
- Precache the app shell in `sw.js` with a versioned cache (keep network-first for `index.html` to preserve the current always-fresh behavior).

### 🟡 U5 — Screen-level polish

- `LoginScreen` shows raw error strings (ties to Q7); no "continue with email" despite the code existing (ties to Q5).
- Several screens are 400–670 lines (`ScanReviewScreen` 666, `StorageSetupScreen` 409) with inline logic — extract components/hooks for maintainability and consistent styling.
- No optimistic-update rollback: e.g. `updateItem` updates Firestore then state, but a mid-flight navigation shows stale data until next `loadItems`; several lists reload fully after single-item writes (`addWine` → `loadItems`) — use targeted state updates or `onSnapshot` listeners for live household sharing (two members currently never see each other's changes without manual refresh).
- Consider skeleton loaders instead of spinners on Inventory/Diary lists.

---

## 4. Phased execution plan

### Phase 0 — Stop-the-bleeding (security hotfixes) · ~1–2 days
| # | Task | Files |
|---|------|-------|
| 0.1 | Server-side `redeemInvite` callable; tighten member-create rule; remove admin self-bootstrap (S1, S2) | `functions/src/index.ts`, `firestore.rules`, `src/services/invite.ts`, `household.ts` |
| 0.2 | Invite expiry enforced in rules + TTL policy; block client invite updates (S3) | `firestore.rules` |
| 0.3 | Rate-limit + payload-size caps on `detectLabelText`, `vivinoProxy`, `analyzeLabel` (S4) | `functions/src/index.ts` |
| 0.4 | Storage rules: 5 MB + `image/*` only (S6) | `storage.rules` |
| 0.5 | Verify deployed rules/functions match repo; add `firestore:rules,storage,functions` to CI deploy (Q2) | `.github/workflows/deploy.yml` |

### Phase 1 — Quality gates & test foundation · ~3–5 days
| # | Task |
|---|------|
| 1.1 | ESLint + Prettier + `typecheck` scripts (root + functions) (Q3) |
| 1.2 | PR CI workflow: typecheck, lint, tests, `npm audit --audit-level=high` (Q2) |
| 1.3 | Firestore rules test suite on emulator — cover S1–S3 regressions (Q1) |
| 1.4 | Unit tests: `parseOrderText`, `parseLabelText`, functions `matchScore`, stores (Q1) |
| 1.5 | Dependency cleanup: `npm audit fix`, replace `xlsx` with `exceljs`/SheetJS 0.20.x, prune unused deps (S7, Q8) |
| 1.6 | Fix `openBottle` with a Firestore transaction (Q4) |

### Phase 2 — Account & trust features · ~1 week
| # | Task |
|---|------|
| 2.1 | Password reset flow (screen + `sendPasswordResetEmail`) (U1) |
| 2.2 | Account deletion (Cloud Function + confirmation UI) — store-compliance blocker (U1) |
| 2.3 | Decide email/password vs Google-only; restore email UI or delete dead code; platform-correct Google sign-in for native (Q5) |
| 2.4 | Localized error-code mapping + top-level error boundary + wire `captureError` (Q7) |
| 2.5 | App Check on web (reCAPTCHA), enforcement on Functions (S5) |
| 2.6 | Privacy policy + analytics opt-out toggle (S8) |

### Phase 3 — UX upgrades · ~1–2 weeks
| # | Task |
|---|------|
| 3.1 | Accessibility pass: labels, roles, contrast, focus states, font scaling (U2) |
| 3.2 | Firestore offline persistence + app-shell precache in SW (U4) |
| 3.3 | Live sync: `onSnapshot` listeners for inventory/diary so household members see each other's changes (U5) |
| 3.4 | Skeleton loaders; optimistic updates with rollback (U5) |
| 3.5 | Refactor 400+-line screens into components/hooks (U5) |
| 3.6 | Vivino result caching in Firestore (S9, also faster UX) |

### Phase 4 — Platform & longevity (as capacity allows)
- i18n migration to keyed strings (`i18next` + `expo-localization`) (U3)
- Native App Check (DeviceCheck / Play Integrity) when EAS builds ship (S5)
- Sentry crash reporting (Q7)
- Playwright smoke E2E on the web build in CI (Q1)
- Storage orphan-cleanup scheduled function (Q6)

---

## 5. Suggested order of PRs

1. `security/rules-hardening` — Phase 0.1–0.4 + rules tests proving the exploit is closed (single reviewable PR, deploy immediately).
2. `ci/quality-gates` — Phase 0.5 + 1.1–1.2.
3. `deps/audit-and-xlsx` — Phase 1.5.
4. `fix/open-bottle-transaction` — Phase 1.6 + tests.
5. One PR per Phase 2 item (each is user-visible and independently shippable).
6. Phase 3+ as normal feature work.

**What NOT to change:** the overall architecture is sound — clean service/store/screen layering, typed models, denormalization choices are reasonable, secrets are correctly server-side, the Firestore data model fits the household concept well. This plan hardens and finishes the product; it does not restructure it.
