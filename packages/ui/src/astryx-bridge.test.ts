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
const THEME = readFileSync(join(__dirname, "theme.css"), "utf8");

/** Every `var(--color-<track>-<weight>)` in the file, with its track. */
function primitiveReferences(): Array<{ name: string; track: string }> {
  return [...BRIDGE.matchAll(/var\((--color-([a-z]+)-\d+)\)/g)].map(
    (match) => ({ name: match[1]!, track: match[2]! }),
  );
}

describe("the Astryx bridge", () => {
  it("names only roles the studio's own chrome defines", () => {
    /* The other half of the gap the docs-export guard holds. That one asks
       whether a client's export carries every name the bridge feeds a token
       from; this one asks the same of theme.css, which is what the playground
       renders against.

       Both halves are needed, and finding that out cost a measurement:
       pointing the status blocks at `status.success-surface` and its
       neighbours made the export correct and left the studio with three
       Astryx tokens resolving to nothing, because theme.css had the fill and
       not the parts. Neither file errors, neither warns, and the studio just
       renders Astryx's own green instead of the project's. */
    const referenced = new Set(
      [...BRIDGE.matchAll(/var\((--color-[a-z0-9-]+)\)/g)].map((m) => m[1]!),
    );
    const defined = new Set(
      [...THEME.matchAll(/^\s*(--color-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]!),
    );

    const undefinedNames = [...referenced]
      .filter((name) => !defined.has(name))
      .sort();

    expect(undefinedNames, undefinedNames.join("\n")).toEqual([]);
  });

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
    /* Not approval — a ratchet. Eight references remain, and they are one
       block: Astryx's blue family, whose four values are the accent's soft
       ground, its edge, its icon and its text. The layer has two accent roles,
       a fill and a muted tint, and neither is a surface to put text on — so
       unlike the status blocks, which moved onto roles the moment each status
       gained a surface, a foreground and a border, this one has nothing to
       point at. Inventing the values here would put four decisions in a
       stylesheet the Semantics tab cannot edit.

       It was sixty-four before the status sub-roles landed. Every one of these
       eight still assumes a client's palette names a track `primary`, which is
       the same assumption cyan and purple were removed for and true only
       because the studio seeds that name. The number may go down and may not
       go up. */
    expect(primitiveReferences()).toHaveLength(8);
  });
});
