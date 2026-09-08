import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUTTON_TONES } from "../button-tones";
import { generatePalettes } from "./palette";
import {
  ASTRYX_BRIDGE_ROLE_VARIABLES,
  isLoadBearing,
  STUDIO_CHROME_ROLE_VARIABLES,
  usedBy,
} from "./role-consumers";
import { seedSemanticTokens } from "./semantic";
import type { ColorTrack } from "./types";

/*
 * Two claims, and they need different kinds of test.
 *
 * That `usedBy` answers correctly is an ordinary unit test. That its two
 * hardcoded lists still describe the stylesheets they were taken from is not:
 * this module is bundled for a browser and cannot read a file, so the lists
 * are copies, and a copy is only as good as the thing that catches it drifting.
 * That is what the first block is. It reads the same files the bridge guard
 * reads and prints the list to paste when they disagree.
 */

const UI = join(__dirname, "..");

/** Every `var(--color-…)` in a file that is a role rather than a primitive. */
function roleReferences(file: string): string[] {
  const source = readFileSync(join(UI, file), "utf8");
  const all = [...source.matchAll(/var\(\s*(--color-[a-z0-9-]+)\s*[,)]/g)].map(
    (match) => match[1]!,
  );
  /* A primitive is `--color-<track>-<weight>`, and a weight is all digits.
     Everything else in this shape is a role. */
  return [...new Set(all.filter((name) => !/-\d+$/.test(name)))].sort();
}

function palette(): ColorTrack[] {
  return generatePalettes({
    tracks: [
      { id: "t-primary", name: "primary", seedHex: "#7646ab" },
      { id: "t-secondary", name: "secondary", seedHex: "#4a6fa5" },
      { id: "t-neutral", name: "neutral", seedHex: "#737373" },
      { id: "t-success", name: "success", seedHex: "#2f7d32" },
      { id: "t-warning", name: "warning", seedHex: "#b87503" },
      { id: "t-error", name: "error", seedHex: "#b02b1b" },
      { id: "t-info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessValues: [
      97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15,
      10, 5,
    ],
  });
}

describe("the lists this module cannot read for itself", () => {
  it("matches every role the Astryx bridge reads", () => {
    const inFile = roleReferences("astryx-bridge.css");
    expect(
      [...ASTRYX_BRIDGE_ROLE_VARIABLES],
      `astryx-bridge.css and ASTRYX_BRIDGE_ROLE_VARIABLES disagree. Paste:\n${inFile.map((name) => `  "${name}",`).join("\n")}`,
    ).toEqual(inFile);
  });

  it("matches every role the studio's own stylesheet reads", () => {
    /* References, not declarations. theme.css declares all seventy-two so the
       chrome has them whatever a workspace holds — that is the studio
       supplying the names rather than depending on them, and counting those
       would make every seeded role undeletable and the whole feature
       pointless. */
    const inFile = roleReferences("theme.css");
    expect(
      [...STUDIO_CHROME_ROLE_VARIABLES],
      `theme.css and STUDIO_CHROME_ROLE_VARIABLES disagree. Paste:\n${inFile.map((name) => `  "${name}",`).join("\n")}`,
    ).toEqual(inFile);
  });
});

describe("usedBy", () => {
  it("names the Button and the bridge for the primary action", () => {
    const consumers = usedBy("action.primary");

    expect(consumers).toContain("Button primary tone");
    expect(consumers).toContain("Astryx bridge");
    /* And it is one of the four the preview cannot open without, which is a
       different severity and says so. */
    expect(consumers).toContain("Palette preview (required)");
    expect(isLoadBearing("action.primary")).toBe(true);
  });

  it("names nothing for a freshly duplicated token", () => {
    /* The other end of the rule, and the one that makes duplicate useful: a
       copy has a new id, so nothing can have been written against it. */
    expect(usedBy("action.primary-copy")).toEqual([]);
    expect(usedBy("surface.base-copy-2")).toEqual([]);
    expect(usedBy("brand.wash")).toEqual([]);
    expect(isLoadBearing("action.primary-copy")).toBe(false);
  });

  it("names the bridge alone for disabled text", () => {
    /* `fg.disabled` is in the bridge and in nothing else: no button draws with
       it, the preview has no check for it, and it signals nothing. One
       consumer, which is still one. */
    expect(usedBy("fg.disabled")).toEqual(["Astryx bridge"]);
  });

  it("counts the studio's own two, and not the seventy it declares", () => {
    expect(usedBy("action.primary-active")).toContain("Studio chrome");
    expect(usedBy("surface.raised")).toContain("Studio chrome");
    /* Declared in theme.css like every other seed role, read by nothing. */
    expect(usedBy("border.subtle")).toEqual([]);
  });

  it("names nothing for a token somebody just added", () => {
    /* Add token writes `custom.new-token`, or `{folder}.new-token`. A hyphen
       in the short name already keeps it out of the pair grid; the folder
       `new` from typing a dotted name is not a signalling group either. None
       of these ids appear in the Button table, the bridge, or the preview. */
    expect(usedBy("custom.new-token")).toEqual([]);
    expect(usedBy("new.token")).toEqual([]);
    expect(usedBy("action.new-token")).toEqual([]);
    expect(isLoadBearing("custom.new-token")).toBe(false);
    expect(isLoadBearing("new.token")).toBe(false);
  });

  it("does not lock an invented action or status colour", () => {
    /* The pair grid is a rule over the layer, not a reader of a name. A
       custom `action.token` would join the grid if it stayed, and leave it
       if it went — which is not the same as deleting `action.primary` and
       emptying every primary button. */
    expect(usedBy("action.token")).toEqual([]);
    expect(usedBy("status.pending")).toEqual([]);
    expect(isLoadBearing("action.token")).toBe(false);
  });

  it("names the pair grid for a role that signals by colour", () => {
    expect(usedBy("status.success")).toContain("Colour-vision pair grid");
    /* A part of a control is not a signal — it is the ground under one — and
       the grid leaves it out, so deleting it costs the grid nothing. */
    expect(usedBy("status.success-surface")).not.toContain(
      "Colour-vision pair grid",
    );
  });

  it("finds almost the whole seed set load-bearing, which was a surprise", () => {
    /* Written expecting a handful, and measured at seventy of seventy-two.
       That is not a fault in the rule; it is what the seed set is. Every role
       in it was added because something wanted it — seven button tones of
       eight roles each, thirty-four names the bridge feeds Astryx, fifteen the
       preview measures — so a role with no consumer is the exception rather
       than the rule.

       Two have none: `border.subtle` and `border.muted`, which were seeded as
       vocabulary rather than for a caller. They are what makes the removed-seed
       list reachable at all.

       Held as an exact set rather than a count, so a role gaining or losing a
       consumer is a decision somebody makes here rather than a number that
       drifts. */
    const tokens = seedSemanticTokens(palette());
    const free = tokens
      .filter((token) => !isLoadBearing(token.id))
      .map((token) => token.id);

    expect(free).toEqual(["border.subtle", "border.muted"]);
  });

  it("follows the tone table rather than a copy of it", () => {
    /* Every role any scheme reads is load-bearing, checked against the table
       itself — so a seventh tone added there is covered without anybody
       editing this module. */
    for (const scheme of Object.keys(BUTTON_TONES) as Array<
      keyof typeof BUTTON_TONES
    >) {
      for (const value of Object.values(BUTTON_TONES[scheme])) {
        const id = /var\(--color-([a-z0-9-]+)\)/
          .exec(value)?.[1]
          ?.replace(/^([a-z]+)-/, "$1.");
        if (!id) continue;
        expect(usedBy(id), `${scheme}: ${value}`).not.toEqual([]);
      }
    }
  });
});
