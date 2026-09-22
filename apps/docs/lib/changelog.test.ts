import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_WORKSPACE_FILE_VERSION,
  SUPPORTED_WORKSPACE_FILE_VERSIONS,
} from "@blueprint/ui";
import { CHANGELOG } from "../content/guides/whats-new";
import { changelogBadge } from "./changelog";

/*
 * The changelog, against the things it claims.
 *
 * The version scheme was chosen because both halves of a badge are facts this
 * repository holds — a date and a file version — rather than a release number
 * somebody maintains. That only stays true if something checks, so this does.
 *
 * The first test is the load-bearing one. It fails when the workspace format
 * is bumped and nobody writes an entry beside it, which is exactly the day a
 * changelog stops being worth reading.
 */

describe("the changelog", () => {
  it("names the current schema version in its newest entry", () => {
    expect(
      CHANGELOG[0]!.schema,
      `the format is at v${BLUEPRINT_WORKSPACE_FILE_VERSION} and the newest entry says v${CHANGELOG[0]!.schema}`,
    ).toBe(BLUEPRINT_WORKSPACE_FILE_VERSION);
  });

  it("names only schema versions this build can open", () => {
    for (const entry of CHANGELOG) {
      expect(
        SUPPORTED_WORKSPACE_FILE_VERSIONS,
        `${entry.date} claims v${entry.schema}`,
      ).toContain(entry.schema);
    }
  });

  it("runs newest first", () => {
    const dates = CHANGELOG.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("never goes backwards in schema as it goes forwards in time", () => {
    /* Read newest to oldest, the version may repeat but must not rise. A
       format version that went down with the date is an entry filed under the
       wrong day. */
    for (let at = 1; at < CHANGELOG.length; at += 1) {
      expect(
        CHANGELOG[at]!.schema,
        `${CHANGELOG[at]!.date} claims v${CHANGELOG[at]!.schema}, after ${CHANGELOG[at - 1]!.date} at v${CHANGELOG[at - 1]!.schema}`,
      ).toBeLessThanOrEqual(CHANGELOG[at - 1]!.schema);
    }
  });

  it("gives every entry a title and something to say", () => {
    for (const entry of CHANGELOG) {
      expect(entry.title.length, entry.date).toBeGreaterThan(0);
      expect(entry.changes.length, entry.date).toBeGreaterThan(0);
    }
  });
});

describe("the badge", () => {
  it("writes the agreed shape", () => {
    expect(
      changelogBadge({
        date: "2026-09-22",
        schema: 8,
        title: "…",
        changes: [],
      }),
    ).toBe("22 September 2026 · Schema v8");
  });

  it("does not depend on where the build ran", () => {
    /* Rendered at build time into a page that ships in an archive. A machine
       in another locale or another zone must not produce a different date, and
       a date one day earlier is exactly what an unqualified `new Date(...)`
       gives west of UTC. */
    expect(
      changelogBadge({
        date: "2026-01-01",
        schema: 8,
        title: "…",
        changes: [],
      }),
    ).toBe("1 January 2026 · Schema v8");
  });
});
