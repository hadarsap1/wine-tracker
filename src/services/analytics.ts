/**
 * Product analytics via PostHog REST API.
 * Zero native dependencies — uses fetch directly.
 *
 * Setup:
 *  1. Create a free account at https://posthog.com
 *  2. Copy your Project API Key from Project Settings → Project API Key
 *  3. Add EXPO_PUBLIC_POSTHOG_API_KEY=phc_... to your .env.local
 *
 * PostHog auto-enriches every event with IP-based geo (country, city, region).
 * Use the PostHog dashboard for:
 *   - User counts, signups, retention, DAU/WAU/MAU
 *   - Funnels (e.g. scan → wine added)
 *   - Feature usage (which events fire most/least)
 *   - Alerts (Project Settings → Alerts) when event counts drop unexpectedly
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { env } from '@config/env';

// Use your PostHog region's ingest host.
// US: https://us.i.posthog.com  |  EU: https://eu.i.posthog.com
const POSTHOG_HOST = 'https://us.i.posthog.com';

const BASE_PROPS = {
  $lib: 'wine-tracker',
  $os: Platform.OS,
  $app_version: (Constants.expoConfig?.version ?? '1.0.0') as string,
};

let _distinctId: string | null = null;

function post(body: Record<string, unknown>): void {
  if (!env.posthogApiKey) return;
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {}); // fire-and-forget; silent on network errors
}

function capture(event: string, properties: Record<string, unknown> = {}): void {
  post({
    api_key: env.posthogApiKey,
    event,
    distinct_id: _distinctId ?? 'anonymous',
    timestamp: new Date().toISOString(),
    properties: { ...BASE_PROPS, ...properties },
  });
}

/**
 * Call immediately after login or signup.
 * Stores the userId for all subsequent events and syncs profile traits to PostHog.
 */
export function identify(
  userId: string,
  traits: { email?: string; name?: string; createdAt?: Date }
): void {
  _distinctId = userId;
  post({
    api_key: env.posthogApiKey,
    event: '$identify',
    distinct_id: userId,
    timestamp: new Date().toISOString(),
    properties: {
      ...BASE_PROPS,
      $set: {
        ...(traits.email ? { email: traits.email } : {}),
        ...(traits.name ? { name: traits.name } : {}),
        ...(traits.createdAt ? { created_at: traits.createdAt.toISOString() } : {}),
      },
    },
  });
}

/** Call on logout. Clears the stored user ID so subsequent events are anonymous. */
export function reset(): void {
  _distinctId = null;
}

/** Track a screen view. Wire to React Navigation's onStateChange in App.tsx. */
export function screenView(screenName: string): void {
  capture('$screen', { $screen_name: screenName });
}

/**
 * Capture an error. Shows up in PostHog → Error Tracking.
 * For full crash reporting with stack traces and source maps, also add Sentry:
 *   npx expo install @sentry/react-native
 *   Add "@sentry/react-native/expo" to app.json plugins
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  capture('$exception', {
    $exception_type: error.constructor.name,
    $exception_message: error.message,
    $exception_stack_trace_raw: error.stack ?? '',
    ...context,
  });
}

/** Every tracked user action in the app — add new events here as the app grows. */
export const track = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  accountCreated: (method: 'email' | 'google') =>
    capture('account_created', { method }),

  signedIn: (method: 'email' | 'google') =>
    capture('signed_in', { method }),

  signedOut: () => capture('signed_out'),

  // ── Household ─────────────────────────────────────────────────────────────
  householdCreated: (isAdditional: boolean) =>
    capture('household_created', { is_additional: isAdditional }),

  inviteGenerated: () => capture('invite_generated'),

  householdJoined: () => capture('household_joined'),

  // ── Wine / Inventory ──────────────────────────────────────────────────────
  wineAdded: (props: {
    wineType: string;
    hasVintage: boolean;
    hasStorage: boolean;
    quantity: number;
  }) =>
    capture('wine_added', {
      wine_type: props.wineType,
      has_vintage: props.hasVintage,
      has_storage: props.hasStorage,
      quantity: props.quantity,
    }),

  wineDeleted: () => capture('wine_deleted'),

  bottleOpened: () => capture('bottle_opened'),

  // ── Diary ─────────────────────────────────────────────────────────────────
  diaryEntryCreated: (props: {
    hasRating: boolean;
    hasNotes: boolean;
    photoCount: number;
  }) =>
    capture('diary_entry_created', {
      has_rating: props.hasRating,
      has_notes: props.hasNotes,
      photo_count: props.photoCount,
    }),

  diaryEntryDeleted: () => capture('diary_entry_deleted'),

  // ── Scan ──────────────────────────────────────────────────────────────────
  scanCompleted: (method: 'ai' | 'vision', confidence: string) =>
    capture('scan_completed', { method, confidence }),

  scanFailed: (reason: string) => capture('scan_failed', { reason }),

  // ── Order import ──────────────────────────────────────────────────────────
  orderImported: (itemCount: number) =>
    capture('order_imported', { item_count: itemCount }),
};
