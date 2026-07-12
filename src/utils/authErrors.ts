import { t } from "@i18n/index";

/**
 * Maps a Firebase Auth / Functions error to a localized, user-facing message.
 * Firebase throws English codes like "auth/invalid-credential"; showing those
 * raw in a Hebrew UI is poor UX, so we translate the common ones and fall back
 * to a generic message for anything unmapped.
 */
export function authErrorMessage(error: unknown): string {
  // Our own sentinel errors (thrown as Error, not Firebase codes)
  if (error instanceof Error && error.message === "google_signin_web_only") {
    return t.authGoogleWebOnly;
  }

  const code = extractCode(error);
  switch (code) {
    case "auth/invalid-email":
      return t.invalidEmail;
    case "auth/user-disabled":
      return t.authUserDisabled;
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return t.authInvalidCredentials;
    case "auth/email-already-in-use":
      return t.authEmailInUse;
    case "auth/weak-password":
      return t.passwordTooShort;
    case "auth/too-many-requests":
      return t.authTooManyRequests;
    case "auth/network-request-failed":
      return t.authNetworkError;
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return t.authPopupClosed;
    case "auth/requires-recent-login":
      return t.authRequiresRecentLogin;
    default:
      return t.authGenericError;
  }
}

function extractCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}
