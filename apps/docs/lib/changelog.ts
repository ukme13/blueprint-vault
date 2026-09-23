import type { ChangelogEntry } from "../content/guides/whats-new";

/**
 * An entry's badge: "22 September 2026 · Schema v8".
 *
 * The agreed version scheme, and the argument for it is in the badge itself —
 * both halves are facts the repository holds, so neither can drift from what
 * is true while somebody forgets to bump a number.
 *
 * `en-GB` explicitly rather than the machine's locale. This string is rendered
 * at build time into a page that ships in an archive, so it must not depend on
 * where the build ran.
 *
 * Here rather than in `packages/ui` for the same reason `headingSlug` is: it
 * describes how this application writes a date, and nothing outside the
 * documentation has a use for it.
 */
export function changelogBadge(entry: ChangelogEntry): string {
  const date = new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
  return `${date} · Schema v${entry.schema}`;
}
