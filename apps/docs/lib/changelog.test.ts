import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_WORKSPACE_FILE_VERSION,
  SUPPORTED_WORKSPACE_FILE_VERSIONS,
} from "@blueprint/ui";
import { CHANGELOG } from "../content/guides/whats-new";
import { changelogBadge, compareVersions } from "./changelog";

/* The studio's package.json, read the way scripts/handover.ts reads it. A file
   read in a test, not an import, so no workspace reaches into another's code. */
const ROOT = resolve(__dirname, "..", "..", "..");
const STUDIO_VERSION = JSON.parse(
  readFileSync(resolve(ROOT, "apps", "playground", "package.json"), "utf8"),
).version as string;

/*
 * The changelog, against the things it claims.
 *
 * Every part of a badge is a fact this repository holds — a date, the studio
 * version in apps/playground/package.json, and the workspace file version —
 * rather than a number somebody remembers to maintain. That only stays true
 * if something checks, so this does.
 *
 * The first two tests are the load-bearing ones. One fails when the studio is
 * released with no entry beside it; the other when the workspace format is
 * bumped with none. Either is exactly the day a changelog stops being worth
 * reading.
 */

describe("the changelog", () => {
  it("names the current studio version in its newest entry", () => {
    expect(
      CHANGELOG[0]!.version,
      `apps/playground/package.json is at ${STUDIO_VERSION} and the newest entry says ${CHANGELOG[0]!.version}`,
    ).toBe(STUDIO_VERSION);
  });

  it("never goes backwards in studio version as it goes forwards in time", () => {
    /* Read newest to oldest, the version may repeat but must not rise. A
       release numbered below the one before it is either a typo or a
       rollback, and neither belongs in a changelog unannounced. */
    for (let at = 1; at < CHANGELOG.length; at += 1) {
      const newer = CHANGELOG[at - 1]!;
      const older = CHANGELOG[at]!;
      expect(
        compareVersions(older.version, newer.version),
        `${older.date} claims ${older.version}, after ${newer.date} at ${newer.version}`,
      ).toBeLessThanOrEqual(0);
    }
  });

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
        version: "0.2.0",
        schema: 8,
        title: "…",
        changes: [],
      }),
    ).toBe("22 September 2026 · v0.2.0 · Schema v8");
  });

  it("does not depend on where the build ran", () => {
    /* Rendered at build time into a page that ships in an archive. A machine
       in another locale or another zone must not produce a different date, and
       a date one day earlier is exactly what an unqualified `new Date(...)`
       gives west of UTC. */
    expect(
      changelogBadge({
        date: "2026-01-01",
        version: "0.2.0",
        schema: 8,
        title: "…",
        changes: [],
      }),
    ).toBe("1 January 2026 · v0.2.0 · Schema v8");
  });
});

describe("comparing versions", () => {
  it("orders by number, not by text", () => {
    /* The case a string comparison gets wrong. */
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("0.9.0", "0.10.0")).toBeLessThan(0);
  });

  it("weighs major over minor over patch", () => {
    expect(compareVersions("1.0.0", "0.99.99")).toBeGreaterThan(0);
    expect(compareVersions("0.2.0", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("0.2.1", "0.2.0")).toBeGreaterThan(0);
    expect(compareVersions("0.2.0", "0.2.0")).toBe(0);
  });

  it("refuses anything that is not major.minor.patch", () => {
    expect(() => compareVersions("0.2", "0.1.0")).toThrow();
    expect(() => compareVersions("v0.2.0", "0.1.0")).toThrow();
  });
});
