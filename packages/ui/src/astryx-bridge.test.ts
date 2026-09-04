import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_PALETTE_TRACKS } from "./workspace/seed-project";

/*
 * What the bridge is allowed to assume.
 *
 * The bridge maps Blueprint's roles onto the variable names Astryx's
 * components read, and it is the one file an app installing the export shares
 * with the studio. That makes its assumptions everybody's assumptions: a name
 * it reaches for that the export does not define is not an error anywhere, it
 * is a declaration that quietly drops and an Astryx token that keeps
 * theme-neutral's value. Nothing warns. The page just looks slightly wrong.
 *
 * See docs/roadmap/foundations-handover.md.
 */

const BRIDGE = readFileSync(join(__dirname, "astryx-bridge.css"), "utf8");

/** Every `var(--color-<track>-<weight>)` in the file, with its track. */
function primitiveReferences(): Array<{ name: string; track: string }> {
  return [...BRIDGE.matchAll(/var\((--color-([a-z]+)-\d+)\)/g)].map(
    (match) => ({ name: match[1]!, track: match[2]! }),
  );
}

describe("the Astryx bridge", () => {
  it("assumes no primitive track a workspace does not seed", () => {
    /* `secondary` and `tertiary` were here, feeding Astryx's cyan and purple
       families. Both are defined in the studio's own theme.css and in no
       project anybody has ever saved — the six seeded tracks are primary,
       neutral, success, warning, error and info — so those sixteen lines were
       dead in every app that installed the export rather than reading
       theme.css, and dead in a way nothing could report.

       The rule is about what the bridge may take for granted, which is only
       what `seedWorkspaceProject` produces. It is deliberately checked against
       that constant rather than a list written here, so a track leaving the
       seed set fails this test rather than rotting quietly. */
    const seeded = new Set(SEED_PALETTE_TRACKS.map((track) => track.name));
    const strangers = [
      ...new Set(
        primitiveReferences()
          .filter((reference) => !seeded.has(reference.track))
          .map((reference) => reference.name),
      ),
    ].sort();

    expect(strangers, strangers.join("\n")).toEqual([]);
  });

  it("still reaches for a primitive where no role exists yet, and this is the count", () => {
    /* Not approval — a ratchet. Sixty-four references remain, all of them in
       the two blocks that feed Astryx's four-part status sets and its colour
       families: a background, a border, an icon and a text colour per status,
       where the layer has one `status.success` and no opinion about the tint
       behind it.

       They cannot move to roles today without either inventing values the
       layer does not hold or changing what the studio looks like, and the
       roles to hold them are stage 2's argument, not this file's. What this
       does hold is the direction: the number may go down and may not go up.
       Every one of these still assumes a client's palette names its tracks
       `success`, `warning`, `error` and `primary`, which is the same
       assumption cyan and purple were removed for — only true so far because
       the studio seeds those names. */
    expect(primitiveReferences()).toHaveLength(64);
  });
});
