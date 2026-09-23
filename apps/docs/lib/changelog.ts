import type { ChangelogEntry } from "../content/guides/whats-new";

/**
 * An entry's badge: "23 September 2026 · v0.2.0 · Schema v8".
 *
 * The date, the studio version, and the workspace file version. The file
 * version says whether this build can open a given file; the studio version
 * tells releases apart, which the file version cannot, since several ship at
 * the same schema. Each half is held against the repository by a test, so
 * none of them depends on somebody remembering to bump it.
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
  return `${date} · v${entry.version} · Schema v${entry.schema}`;
}

/**
 * Order two `major.minor.patch` versions: negative, zero, or positive.
 *
 * Numeric per part, so 0.10.0 sorts after 0.9.0, which a string comparison
 * gets wrong. Throws on anything else rather than guessing, because a badge
 * with a malformed version is an entry nobody checked.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string): [number, number, number] => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
    if (!match) throw new Error(`"${value}" is not major.minor.patch`);
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };
  const left = parse(a);
  const right = parse(b);
  for (let part = 0; part < 3; part += 1) {
    const difference = left[part]! - right[part]!;
    if (difference !== 0) return difference;
  }
  return 0;
}
