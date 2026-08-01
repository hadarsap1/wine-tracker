/**
 * Date formatting for the Hebrew UI.
 *
 * `toLocaleDateString()` with no locale follows the *device* locale, so Hebrew
 * users on an en-US device were shown American month/day order (10/15/2024
 * instead of 15/10/2024). These helpers pin the app's locale explicitly.
 */

const LOCALE = "he-IL";

/** Short numeric date, e.g. 15.10.2024 */
export function formatDate(date: Date | undefined | null): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleDateString(LOCALE);
}

/** Long form with month name, e.g. 15 באוקטובר 2024 */
export function formatDateLong(date: Date | undefined | null): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Friendly relative label for recent dates ("היום" / "אתמול" / "לפני N ימים"),
 * falling back to a numeric date beyond a week. Tasting entries are usually
 * recent, and a relative label reads faster than a raw date.
 */
export function formatDateRelative(date: Date | undefined | null): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  if (days > 1 && days < 7) return `לפני ${days} ימים`;
  return formatDate(date);
}
