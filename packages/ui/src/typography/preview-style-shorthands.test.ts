import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  previewStyleDeclarations,
  type PreviewSlotStyle,
} from "./preview-styles";

/*
 * The inspector sets a side of the padding, a corner of the radius, a colour of
 * the background, one at a time, and takes each away again. React warns when a
 * longhand is removed while a shorthand for the same thing is set ("Removing a
 * style property during rerender (backgroundColor) when a conflicting property
 * (background) is set"), and the result is a style that does not come back.
 * The warning is development only, so the production build the end-to-end suite
 * runs against never shows it; the cause is checked here, at the source.
 */

const SHORTHANDS = [
  "background",
  "border",
  "borderRadius",
  "padding",
  "paddingBlock",
  "paddingInline",
  "margin",
  "inset",
  "gap",
] as const;

/** Every property name the inspector can write. */
function writtenProperties(): string[] {
  const every: PreviewSlotStyle = {
    gap: 1,
    padding: { top: 1, right: 1, bottom: 1, left: 1 },
    opacity: 50,
    radius: {
      topLeft: "a",
      topRight: "a",
      bottomRight: "a",
      bottomLeft: "a",
    },
    fill: "action.primary",
    stroke: { tokenId: "border.default", position: "inside", weight: 1 },
    shadow: "low",
  };
  return Object.keys(previewStyleDeclarations(every, [], "button"));
}

const ROOT = resolve(__dirname, "..", "..", "..", "..");

describe("the inspector's styles and the styles under them", () => {
  it("are written as longhands, which nothing shorthand sits beneath", () => {
    const written = writtenProperties();
    /* Padding by side and radius by corner: the shorthands are not written. */
    expect(written).toEqual(
      expect.arrayContaining([
        "paddingTop",
        "paddingLeft",
        "borderTopLeftRadius",
        "backgroundColor",
        "boxShadow",
      ]),
    );
    for (const shorthand of ["padding", "borderRadius", "background"]) {
      expect(written).not.toContain(shorthand);
    }
  });

  it("have no shorthand beneath them on a button", () => {
    /* What a button draws before the inspector adds to it. A shorthand here
       conflicts with a longhand above it. Gap is written whole, so it is
       exempt: there is no longhand of it that the inspector sets. */
    const source = readFileSync(
      join(
        ROOT,
        "apps",
        "playground",
        "components",
        "preview",
        "Inspectable.tsx",
      ),
      "utf8",
    );
    const style = source.slice(
      source.indexOf("const CONTROL_INSET_STYLE"),
      source.indexOf("export function slot"),
    );
    const fill = source.slice(
      source.indexOf("const fill = invert"),
      source.indexOf("/* The label is set in its block"),
    );
    for (const shorthand of SHORTHANDS.filter((each) => each !== "gap")) {
      const used = new RegExp(`(^|[\\s{,])${shorthand}\\s*:`, "m");
      expect(used.test(style), `${shorthand} in the control inset`).toBe(false);
      expect(used.test(fill), `${shorthand} in the button fill`).toBe(false);
    }
  });
});
