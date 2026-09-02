import { describe, expect, it } from "vitest";
import {
  clearLineHeightEdit,
  commitLineHeightEdit,
  resetLineHeightEdit,
  settleLineHeightEdit,
  typeLineHeight,
} from "./line-height-edit";

describe("what a blur is allowed to write", () => {
  it("writes nothing when the field was only visited", () => {
    /* The case the dirty flag exists for. Tabbing through the row holds a
       number in every field it passes; committing them would pin each one. */
    const { edit, config } = commitLineHeightEdit(resetLineHeightEdit(1.5));

    expect(config).toBeNull();
    expect(edit.draft).toBe(1.5);
  });

  it("writes the number that was typed", () => {
    const { config } = commitLineHeightEdit(typeLineHeight(1.25));

    expect(config).toEqual({ mode: "ratio", value: 1.25 });
  });

  it("reads a number above the ratio range as a pixel height", () => {
    /* 28 is not a ratio anybody means. One field, two ranges — the parser
       tells them apart by size rather than by a unit control. */
    const { config } = commitLineHeightEdit(typeLineHeight(28));

    expect(config).toEqual({ mode: "px", value: 28 });
  });

  it("writes auto for a field emptied and then blurred", () => {
    const { config } = commitLineHeightEdit({ draft: null, isDirty: true });

    expect(config).toEqual({ mode: "auto" });
  });

  it("settles the edit, so a second blur does not write again", () => {
    const first = commitLineHeightEdit(typeLineHeight(1.25));
    const second = commitLineHeightEdit(first.edit);

    expect(first.config).not.toBeNull();
    expect(second.config).toBeNull();
  });

  it("settles an unparseable draft rather than retrying it", () => {
    /* 0.5 is below the ratio range and far below any pixel height, so it is
       neither and guessing would be worse than declining. */
    const { edit, config } = commitLineHeightEdit(typeLineHeight(0.5));

    expect(config).toBeNull();
    expect(edit.isDirty).toBe(false);
  });
});

describe("the edits themselves", () => {
  it("marks a typed number as somebody's", () => {
    expect(typeLineHeight(28)).toEqual({ draft: 28, isDirty: true });
  });

  it("leaves an emptied field clean, because clearing commits on the spot", () => {
    /* Dirty here would write auto a second time when focus left. */
    expect(clearLineHeightEdit()).toEqual({ draft: null, isDirty: false });
  });

  it("follows the model when it moves underneath, dropping the draft", () => {
    expect(resetLineHeightEdit(24)).toEqual({ draft: 24, isDirty: false });
  });

  it("keeps the number when settling, and only drops the claim to it", () => {
    expect(settleLineHeightEdit(typeLineHeight(28))).toEqual({
      draft: 28,
      isDirty: false,
    });
  });

  it("returns a clean edit unchanged, so React can bail out of the render", () => {
    const clean = resetLineHeightEdit(1.5);

    expect(settleLineHeightEdit(clean)).toBe(clean);
  });
});
