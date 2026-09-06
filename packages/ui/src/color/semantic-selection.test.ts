import { describe, expect, it } from "vitest";
import {
  describeRefusals,
  EMPTY_SELECTION,
  filterSemanticTokens,
  selectAllVisible,
  selectionAfterClick,
  selectionWithin,
  semanticGroupCounts,
  type Selection,
} from "./semantic-selection";
import type { SemanticToken } from "./semantic";

const VISIBLE = ["a", "b", "c", "d", "e"];

function layer(): SemanticToken[] {
  const reference = (weight: number) => ({ trackId: "t-neutral", weight });
  return [
    ["action.primary", "Action primary"],
    ["action.secondary", "Action secondary"],
    ["surface.base", "Page canvas"],
    ["surface.raised", "Raised card"],
    ["brand.wash", "Brand wash"],
  ].map(([id, name]) => ({
    id: id!,
    name: name!,
    description: "",
    light: reference(200),
    dark: reference(800),
  }));
}

describe("semanticGroupCounts", () => {
  it("counts every group and labels the ones that have a label", () => {
    expect(semanticGroupCounts(layer())).toEqual([
      { group: "action", label: "Actions", count: 2 },
      { group: "surface", label: "Surfaces", count: 2 },
      /* A group somebody invented has no label of its own and shows the
         prefix, which is still what they typed. */
      { group: "brand", label: "brand", count: 1 },
    ]);
  });

  it("follows the layer's order rather than the alphabet", () => {
    /* The order somebody arranged is theirs, and the export writes it the same
       way. A sidebar sorted alphabetically would disagree with the file. */
    const reversed = [...layer()].reverse();
    expect(semanticGroupCounts(reversed).map((each) => each.group)).toEqual([
      "brand",
      "surface",
      "action",
    ]);
  });

  it("is empty for an empty layer", () => {
    expect(semanticGroupCounts([])).toEqual([]);
  });
});

describe("filterSemanticTokens", () => {
  it("keeps everything when nothing is asked for", () => {
    expect(filterSemanticTokens(layer())).toHaveLength(5);
  });

  it("narrows to one group", () => {
    const only = filterSemanticTokens(layer(), { group: "surface" });
    expect(only.map((token) => token.id)).toEqual([
      "surface.base",
      "surface.raised",
    ]);
  });

  it("matches the id and the name, which are different search terms", () => {
    /* Somebody looking for `--color-fg-muted` types "fg"; somebody looking at
       their own vocabulary types "muted text". Both are the same row. */
    expect(
      filterSemanticTokens(layer(), { query: "surface" }).map((t) => t.id),
    ).toEqual(["surface.base", "surface.raised"]);
    expect(
      filterSemanticTokens(layer(), { query: "canvas" }).map((t) => t.id),
    ).toEqual(["surface.base"]);
  });

  it("ignores case and surrounding space", () => {
    /* A trailing space from a paste emptying the table is the kind of thing
       somebody reports as "search is broken". */
    expect(filterSemanticTokens(layer(), { query: "  BRAND " })).toHaveLength(
      1,
    );
  });

  it("applies the group and the query together", () => {
    expect(
      filterSemanticTokens(layer(), { group: "action", query: "primary" }).map(
        (t) => t.id,
      ),
    ).toEqual(["action.primary"]);
  });
});

describe("selectionAfterClick", () => {
  const click = (
    selection: Selection,
    id: string,
    modifiers: { isRange?: boolean; isToggle?: boolean } = {},
  ) => selectionAfterClick(selection, { id, visible: VISIBLE, ...modifiers });

  it("replaces the selection on a plain click", () => {
    const first = click(EMPTY_SELECTION, "b");
    expect(first).toEqual({ ids: ["b"], anchor: "b" });
    expect(click(first, "d")).toEqual({ ids: ["d"], anchor: "d" });
  });

  it("takes the block between the anchor and the row on shift-click", () => {
    const anchored = click(EMPTY_SELECTION, "b");
    expect(click(anchored, "d", { isRange: true })).toEqual({
      ids: ["b", "c", "d"],
      anchor: "b",
    });
  });

  it("reads a range upwards as well as down", () => {
    const anchored = click(EMPTY_SELECTION, "d");
    expect(click(anchored, "b", { isRange: true }).ids).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  it("keeps the anchor, so a second shift-click shrinks the range", () => {
    /* The reason the anchor is separate from the selection. Chaining from the
       last click would make a range only ever grow, and there would be no way
       to make one smaller. */
    const anchored = click(EMPTY_SELECTION, "b");
    const wide = click(anchored, "e", { isRange: true });
    expect(wide.ids).toHaveLength(4);

    expect(click(wide, "c", { isRange: true }).ids).toEqual(["b", "c"]);
  });

  it("treats shift with no anchor as a plain click", () => {
    /* The first click into a table, and the case a range implementation
       usually forgets. */
    expect(click(EMPTY_SELECTION, "c", { isRange: true })).toEqual({
      ids: ["c"],
      anchor: "c",
    });
  });

  it("falls back to a plain click when the anchor has been filtered away", () => {
    const stale: Selection = { ids: ["z"], anchor: "z" };
    expect(click(stale, "c", { isRange: true })).toEqual({
      ids: ["c"],
      anchor: "c",
    });
  });

  it("adds and removes one row on ctrl-click", () => {
    let selection = click(EMPTY_SELECTION, "b");
    selection = click(selection, "d", { isToggle: true });
    expect(selection.ids).toEqual(["b", "d"]);

    selection = click(selection, "b", { isToggle: true });
    expect(selection).toEqual({ ids: ["d"], anchor: "b" });
  });

  it("holds the selection in the order the rows are drawn", () => {
    /* So a range reads as one block wherever it was assembled from, and a
       delete reports the rows in the order somebody sees them. */
    let selection = click(EMPTY_SELECTION, "e");
    selection = click(selection, "a", { isToggle: true });
    selection = click(selection, "c", { isToggle: true });
    expect(selection.ids).toEqual(["a", "c", "e"]);
  });

  it("never reaches a row that is not on screen", () => {
    /* The rule the whole filter-clears-selection behaviour rests on: an
       operation cannot touch a row somebody cannot see. */
    const narrow = ["b", "c"];
    const selection = selectionAfterClick(
      { ids: ["b"], anchor: "b" },
      { id: "c", visible: narrow, isRange: true },
    );
    expect(selection.ids).toEqual(["b", "c"]);
  });
});

describe("selectAllVisible", () => {
  it("takes everything on screen and anchors at the top", () => {
    expect(selectAllVisible(VISIBLE)).toEqual({
      ids: VISIBLE,
      anchor: "a",
    });
  });

  it("is empty for an empty table", () => {
    expect(selectAllVisible([])).toEqual({ ids: [], anchor: null });
  });
});

describe("selectionWithin", () => {
  it("drops rows a filter has hidden", () => {
    const selection: Selection = { ids: ["a", "c", "e"], anchor: "c" };
    expect(selectionWithin(selection, ["a", "b", "c"])).toEqual({
      ids: ["a", "c"],
      anchor: "c",
    });
  });

  it("forgets an anchor that is no longer on screen", () => {
    const selection: Selection = { ids: ["a", "e"], anchor: "e" };
    expect(selectionWithin(selection, ["a", "b"])).toEqual({
      ids: ["a"],
      anchor: null,
    });
  });

  it("changes nothing when the filter hid none of them", () => {
    /* Returned by identity, so a filter that did not touch the selection does
       not re-render the table. */
    const selection: Selection = { ids: ["a", "b"], anchor: "a" };
    expect(selectionWithin(selection, VISIBLE)).toBe(selection);
  });
});

describe("describeRefusals", () => {
  it("says nothing when nothing was refused", () => {
    expect(describeRefusals([])).toBe("");
  });

  it("names each row and the first thing that reads it", () => {
    /* The whole list per row would be four lines of toast for one refusal.
       The first consumer makes the reason concrete; the row's own badge
       carries the rest. */
    expect(
      describeRefusals([
        {
          id: "action.primary",
          reason: "…",
          usedBy: ["Button primary tone", "Astryx bridge"],
        },
        { id: "fg.primary", reason: "…", usedBy: ["Astryx bridge"] },
      ]),
    ).toBe(
      "2 were kept: action.primary (Button primary tone), fg.primary (Astryx bridge).",
    );
  });

  it("counts one row in the singular", () => {
    expect(
      describeRefusals([
        { id: "surface.base", reason: "…", usedBy: ["Astryx bridge"] },
      ]),
    ).toBe("1 row was kept: surface.base (Astryx bridge).");
  });

  it("names a row with no consumer without inventing one", () => {
    /* A collision refusal has an empty usedBy, and "(undefined)" is how that
       reaches a toast if nobody checks. */
    expect(
      describeRefusals([{ id: "brand.wash", reason: "…", usedBy: [] }]),
    ).toBe("1 row was kept: brand.wash.");
  });
});
