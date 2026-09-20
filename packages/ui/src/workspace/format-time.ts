/**
 * Format an epoch timestamp into a human-readable relative time string.
 *
 * Examples:
 * - "Edited just now"
 * - "Edited 5 minutes ago"
 * - "Edited 2 hours ago"
 * - "Edited yesterday"
 * - "Edited 20 days ago"
 * - "Edited 2 months ago"
 * - "Edited 1 year ago"
 */
export function formatRelativeTime(
  timestamp: number | undefined | null,
  now = Date.now(),
): string | null {
  if (typeof timestamp !== "number" || isNaN(timestamp) || timestamp <= 0) {
    return null;
  }
  const diffMs = Math.max(0, now - timestamp);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) {
    return "Edited just now";
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? "Edited 1 minute ago"
      : `Edited ${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1
      ? "Edited 1 hour ago"
      : `Edited ${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return "Edited yesterday";
  }
  if (diffDays < 30) {
    return `Edited ${diffDays} days ago`;
  }
  if (diffMonths < 12) {
    return diffMonths === 1
      ? "Edited 1 month ago"
      : `Edited ${diffMonths} months ago`;
  }
  return diffYears === 1
    ? "Edited 1 year ago"
    : `Edited ${diffYears} years ago`;
}
