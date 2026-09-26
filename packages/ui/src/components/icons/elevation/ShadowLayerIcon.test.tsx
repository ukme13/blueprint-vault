import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shadowLayerEdges } from "../../../scale/elevation-edit";
import { ShadowLayerIcon } from "./ShadowLayerIcon";

/** The mark's path, as drawn for a layer with these offsets. */
function mark(type: "drop" | "inner", offsetXPx: number, offsetYPx: number) {
  const html = renderToStaticMarkup(
    <ShadowLayerIcon
      edges={shadowLayerEdges({ type, offsetXPx, offsetYPx })}
      inner={type === "inner"}
    />,
  );
  const path =
    /<path d="([^"]*)" data-shadow-edges=""[^>]*stroke-opacity="([\d.]+)"/.exec(
      html,
    );
  return { d: path?.[1] ?? "", opacity: Number(path?.[2]) };
}

describe("ShadowLayerIcon", () => {
  it("marks a drop shadow below the box, outside it", () => {
    // The box's bottom edge is at 18; the mark runs at 21, apart from it.
    expect(mark("drop", 0, 4).d).toBe("M8 21H16");
  });

  it("keeps a drop mark 3 units clear of the box, not on its edge", () => {
    /* At 2 units, less the strokes, the mark sat about a pixel off the box
       and read as a thick border on it, like a stroke drawn inside. */
    const html = renderToStaticMarkup(
      <ShadowLayerIcon
        edges={shadowLayerEdges({ offsetXPx: 0, offsetYPx: 4 })}
      />,
    );
    const box = /<rect height="(\d+)"[^>]*y="(\d+)"/.exec(html)!;
    const bottom = Number(box[2]) + Number(box[1]);
    expect(21 - bottom).toBeGreaterThanOrEqual(3);
  });

  it("marks an inner shadow along the top, inside the box", () => {
    expect(mark("inner", 0, 4).d).toBe("M9 9H15");
  });

  it("joins two marked sides at their corner, as one L", () => {
    // Down and right: the bottom runs to x 21, the right side down to y 21.
    expect(mark("drop", 3, 4).d).toBe("M8 21H21M21 8V21");
  });

  it("marks every side at half strength when there is no offset", () => {
    const even = mark("drop", 0, 0);
    expect(even.d.match(/M/g)).toHaveLength(4);
    expect(even.opacity).toBe(0.5);
    expect(mark("drop", 0, 4).opacity).toBe(1);
  });

  it("draws in currentColor, so it follows its parent's text colour", () => {
    const html = renderToStaticMarkup(
      <ShadowLayerIcon
        edges={shadowLayerEdges({ offsetXPx: 0, offsetYPx: 1 })}
      />,
    );
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
