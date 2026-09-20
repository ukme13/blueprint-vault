import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./format-time";

describe("formatRelativeTime", () => {
  const now = 1_700_000_000_000;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  it("handles empty or missing timestamps", () => {
    expect(formatRelativeTime(undefined)).toBeNull();
    expect(formatRelativeTime(null)).toBeNull();
    expect(formatRelativeTime(0)).toBeNull();
  });

  it("formats very recent timestamps as 'Edited just now'", () => {
    expect(formatRelativeTime(now - 30 * 1000, now)).toBe("Edited just now");
  });

  it("formats minutes ago", () => {
    expect(formatRelativeTime(now - 1 * minute, now)).toBe(
      "Edited 1 minute ago",
    );
    expect(formatRelativeTime(now - 15 * minute, now)).toBe(
      "Edited 15 minutes ago",
    );
  });

  it("formats hours ago", () => {
    expect(formatRelativeTime(now - 1 * hour, now)).toBe("Edited 1 hour ago");
    expect(formatRelativeTime(now - 2 * hour, now)).toBe("Edited 2 hours ago");
  });

  it("formats yesterday", () => {
    expect(formatRelativeTime(now - 1 * day, now)).toBe("Edited yesterday");
  });

  it("formats days ago", () => {
    expect(formatRelativeTime(now - 20 * day, now)).toBe("Edited 20 days ago");
  });

  it("formats months ago", () => {
    expect(formatRelativeTime(now - 2 * month, now)).toBe(
      "Edited 2 months ago",
    );
  });

  it("formats years ago", () => {
    expect(formatRelativeTime(now - 1 * year, now)).toBe("Edited 1 year ago");
  });
});
