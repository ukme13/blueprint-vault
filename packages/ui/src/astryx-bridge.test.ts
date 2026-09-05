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

  it("reaches for no primitive at all", () => {
    /* It was eighty when this file was one block of a stylesheet, sixty-four
       once the status tones existed, and eight while Astryx's blue family had
       no accent surface, border or foreground to point at. The tone pattern
       gave it all three.

       Zero is the point rather than a milestone: every name in this file is
       now a role somebody can edit in the Semantics tab, which means a client
       whose palette names its tracks differently gets a working bridge, and
       the studio no longer holds four decisions a designer cannot reach. */
    const referenced = primitiveReferences().map((each) => each.name);
    expect(referenced, referenced.join(", ")).toEqual([]);
  });
});
