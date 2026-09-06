import { describe, expect, it } from "vitest";
import { generatePalettes } from "./palette";
import { usedBy } from "./role-consumers";
import {
  deleteTokens,
  duplicateTokens,
  moveToGroup,
  repointTokens,
} from "./selection-ops";
import { seedSemanticTokens, type SemanticToken } from "./semantic";
import type { ColorTrack } from "./types";

const LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

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
    lightnessValues: LIGHTNESS,
  });
}

/**
 * A small hand-written layer.
 *
 * The seed set has seventy-two rows and two of them are deletable, which makes
 * it the wrong thing to reason about order and collisions in. `action.primary`
 * is here because it is the load-bearing case; the rest are ids nothing reads.
 */
function layer(): SemanticToken[] {
  const reference = (weight: number, alpha?: number) =>
    alpha === undefined
      ? { trackId: "t-neutral", weight }
      : { trackId: "t-neutral", weight, alpha };

  return [
    {
      id: "action.primary",
      name: "Action primary",
      description: "",
      light: { trackId: "t-primary", weight: 550 },
      dark: { trackId: "t-primary", weight: 450 },
    },
    {
      id: "brand.wash",
      name: "Brand wash",
      description: "",
      light: reference(100, 0.12),
      dark: reference(900, 0.12),
    },
    {
      id: "brand.rule",
      name: "Brand rule",
      description: "",
      light: reference(300),
      dark: reference(700),
    },
    {
      id: "extra.scrim",
      name: "Scrim",
      description: "",
      light: reference(950, 0.5),
      dark: reference(50, 0.5),
    },
  ];
}

const ids = (tokens: SemanticToken[]) => tokens.map((token) => token.id);

describe("deleteTokens", () => {
  it("deletes what nothing reads and refuses the rest, in one pass", () => {
    /* The mixed case, which is the only one worth having. Refusing the whole
       selection because one row is load-bearing abandons the rows that were
       fine, and doing it silently is worse still. */
    const result = deleteTokens(layer(), [
      "brand.wash",
      "action.primary",
      "brand.rule",
    ]);

    expect(ids(result.layer)).toEqual(["action.primary", "extra.scrim"]);
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.id).toBe("action.primary");
    expect(result.refusals[0]!.usedBy).toContain("Button primary tone");
    expect(result.refusals[0]!.reason).toContain("Repoint it instead");
    /* The two it did delete, for the removed-seed list to record. */
    expect(result.removed).toEqual(["brand.wash", "brand.rule"]);
  });

  it("never throws, whatever it is handed", () => {
    const result = deleteTokens(layer(), ["nothing.here", "action.primary"]);

    expect(ids(result.layer)).toEqual(ids(layer()));
    expect(result.refusals.map((each) => each.id)).toEqual([
      "nothing.here",
      "action.primary",
    ]);
    expect(result.refusals[0]!.usedBy).toEqual([]);
  });

  it("leaves the layer alone for an empty selection", () => {
    const before = layer();
    const result = deleteTokens(before, []);
    expect(result.layer).toEqual(before);
    expect(result.refusals).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});

describe("duplicateTokens", () => {
  it("copies alpha and sits the copy under its source", () => {
    /* Order is the thing a duplicate gets wrong: appended to the end, it is a
       row somebody then has to go and find in seventy-two. */
    const result = duplicateTokens(layer(), ["brand.wash"]);

    expect(ids(result.layer)).toEqual([
      "action.primary",
      "brand.wash",
      "brand.wash-copy",
      "brand.rule",
      "extra.scrim",
    ]);

    const copy = result.layer.find((token) => token.id === "brand.wash-copy")!;
    expect(copy.light.alpha).toBe(0.12);
    expect(copy.dark.alpha).toBe(0.12);
    expect(copy.light.trackId).toBe("t-neutral");
    expect(result.added).toEqual(["brand.wash-copy"]);
  });

  it("gives the copy a name nothing reads", () => {
    /* Which is what makes duplicate the escape hatch for a load-bearing role:
       copy it, edit the copy, repoint the original when you are ready. */
    const result = duplicateTokens(layer(), ["action.primary"]);
    expect(usedBy("action.primary-copy")).toEqual([]);
    expect(result.refusals).toEqual([]);
  });

  it("does not collide with a copy that is already there", () => {
    const before = duplicateTokens(layer(), ["brand.wash"]).layer;
    const result = duplicateTokens(before, ["brand.wash"]);

    expect(ids(result.layer)).toEqual([
      "action.primary",
      "brand.wash",
      "brand.wash-copy-2",
      "brand.wash-copy",
      "brand.rule",
      "extra.scrim",
    ]);
  });

  it("numbers a copy of a copy from the original", () => {
    /* `brand.wash-copy-copy` is what a naive suffix gives and nobody wants to
       read the third one. */
    const once = duplicateTokens(layer(), ["brand.wash"]).layer;
    const twice = duplicateTokens(once, ["brand.wash-copy"]).layer;

    expect(ids(twice)).toContain("brand.wash-copy-2");
    expect(ids(twice).join(" ")).not.toContain("copy-copy");
  });

  it("keeps two copies made at once apart", () => {
    const result = duplicateTokens(layer(), ["brand.wash", "brand.rule"]);
    expect(result.added).toEqual(["brand.wash-copy", "brand.rule-copy"]);
    expect(new Set(ids(result.layer)).size).toBe(result.layer.length);
  });
});

describe("moveToGroup", () => {
  it("renames the prefix and keeps everything else", () => {
    const result = moveToGroup(layer(), ["brand.wash", "extra.scrim"], "wash");

    expect(ids(result.layer)).toEqual([
      "action.primary",
      "wash.wash",
      "brand.rule",
      "wash.scrim",
    ]);
    /* The reference, the name and the alpha are untouched: this is a rename. */
    const moved = result.layer.find((token) => token.id === "wash.scrim")!;
    expect(moved.name).toBe("Scrim");
    expect(moved.light.alpha).toBe(0.5);
    expect(result.refusals).toEqual([]);
  });

  it("refuses a move that would collide", () => {
    /* Two tokens on one custom property, and the later one silently wins. */
    const result = moveToGroup(layer(), ["extra.scrim"], "brand");
    const withScrim = moveToGroup(result.layer, ["brand.rule"], "extra").layer;
    const second = moveToGroup(
      [
        ...withScrim,
        {
          id: "other.scrim",
          name: "Other scrim",
          description: "",
          light: { trackId: "t-neutral", weight: 900 },
          dark: { trackId: "t-neutral", weight: 100 },
        },
      ],
      ["other.scrim"],
      "brand",
    );

    expect(second.refusals).toHaveLength(1);
    expect(second.refusals[0]!.id).toBe("other.scrim");
    expect(second.refusals[0]!.reason).toContain("already a token called");
    expect(second.refusals[0]!.usedBy).toEqual([]);
    expect(ids(second.layer)).toContain("other.scrim");
  });

  it("refuses to move a role something reads by name", () => {
    /* The id is the exported name. Moving `action.primary` to `brand` is
       `--color-brand-primary`, and the Button is still asking for
       `--color-action-primary` — which is deleting it with extra steps. */
    const result = moveToGroup(layer(), ["action.primary"], "brand");

    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]!.usedBy).toContain("Astryx bridge");
    expect(result.refusals[0]!.reason).toContain("moved to another group");
    expect(ids(result.layer)).toContain("action.primary");
  });

  it("does nothing to a token already in that group", () => {
    const result = moveToGroup(layer(), ["brand.wash"], "brand");
    expect(ids(result.layer)).toEqual(ids(layer()));
    expect(result.refusals).toEqual([]);
  });
});

describe("repointTokens", () => {
  it("keeps each token's own alpha when the new reference has none", () => {
    /* The bug stage 1 found in the editor, as a rule: rebuilding a reference
       from a track and a weight makes a transparent token solid, silently,
       every time somebody changes a shade. */
    const result = repointTokens(
      layer(),
      ["brand.wash", "brand.rule", "extra.scrim"],
      "light",
      { trackId: "t-error", weight: 500 },
    );

    const at = (id: string) => result.layer.find((token) => token.id === id)!;

    expect(at("brand.wash").light).toEqual({
      trackId: "t-error",
      weight: 500,
      alpha: 0.12,
    });
    expect(at("extra.scrim").light).toEqual({
      trackId: "t-error",
      weight: 500,
      alpha: 0.5,
    });
    /* An opaque one stays opaque, and stays opaque by having no field at all
       rather than by carrying a 1 — which is what keeps its export byte for
       byte what it was. */
    expect(at("brand.rule").light).toEqual({
      trackId: "t-error",
      weight: 500,
    });
    expect("alpha" in at("brand.rule").light).toBe(false);
  });

  it("takes the new reference's alpha when it carries one", () => {
    /* "Repoint these and make them all 40%" has to be sayable. */
    const result = repointTokens(
      layer(),
      ["brand.wash", "brand.rule"],
      "dark",
      {
        trackId: "t-info",
        weight: 700,
        alpha: 0.4,
      },
    );

    for (const id of ["brand.wash", "brand.rule"]) {
      expect(
        result.layer.find((token) => token.id === id)!.dark.alpha,
        id,
      ).toBe(0.4);
    }
  });

  it("touches one mode and leaves the other", () => {
    const before = layer();
    const result = repointTokens(before, ["brand.wash"], "light", {
      trackId: "t-error",
      weight: 500,
    });

    expect(
      result.layer.find((token) => token.id === "brand.wash")!.dark,
    ).toEqual(before.find((token) => token.id === "brand.wash")!.dark);
  });

  it("repoints a load-bearing role without complaint", () => {
    /* Repointing is the answer to a refusal, not another one: a role something
       reads keeps its name and changes what it points at, which is the whole
       reason the layer is an indirection. */
    const result = repointTokens(layer(), ["action.primary"], "light", {
      trackId: "t-success",
      weight: 500,
    });

    expect(result.refusals).toEqual([]);
    expect(
      result.layer.find((token) => token.id === "action.primary")!.light
        .trackId,
    ).toBe("t-success");
  });
});

describe("every operation answers in the same shape", () => {
  it("returns a layer, refusals, removed and added", () => {
    /* Item seven of the plan's stage 2: stage 4 has one thing to render, not
       four. A function that returned a bare array here would be the one the
       editor special-cases. */
    const tokens = seedSemanticTokens(palette());
    const answers = [
      deleteTokens(tokens, ["border.subtle"]),
      duplicateTokens(tokens, ["border.subtle"]),
      moveToGroup(tokens, ["border.subtle"], "rule"),
      repointTokens(tokens, ["border.subtle"], "light", {
        trackId: "t-neutral",
        weight: 200,
      }),
    ];

    for (const answer of answers) {
      expect(Object.keys(answer).sort()).toEqual([
        "added",
        "layer",
        "refusals",
        "removed",
      ]);
      expect(Array.isArray(answer.layer)).toBe(true);
      for (const refusal of answer.refusals) {
        expect(Object.keys(refusal).sort()).toEqual(["id", "reason", "usedBy"]);
        expect(refusal.reason.endsWith(".")).toBe(true);
      }
    }
  });

  it("never mutates the layer it was given", () => {
    const before = layer();
    const snapshot = JSON.stringify(before);

    deleteTokens(before, ["brand.wash"]);
    duplicateTokens(before, ["brand.wash"]);
    moveToGroup(before, ["brand.wash"], "wash");
    repointTokens(before, ["brand.wash"], "light", {
      trackId: "t-error",
      weight: 500,
    });

    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
