const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact relative time ("3m ago", "2h ago", "5d ago"). Falls back to a locale
 * date for anything older than a week. Accepts Date | string | number.
 */
export function timeAgo(input: Date | string | number): string {
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(then).toLocaleDateString();
}

/** Full timestamp for titles/tooltips. */
export function formatDateTime(input: Date | string | number): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}
