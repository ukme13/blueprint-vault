import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shadowLayerEdges } from "../../../scale/elevation-edit";
import { ShadowLayerIcon } from "./ShadowLayerIcon";

interface Bar {
  edge: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

/** The heavier edges drawn for a layer with these offsets. */
function bars(type: "drop" | "inner", offsetXPx: number, offsetYPx: number) {
  const html = renderToStaticMarkup(
    <ShadowLayerIcon
      edges={shadowLayerEdges({ type, offsetXPx, offsetYPx })}
      inner={type === "inner"}
    />,
  );
  // React writes an SVG rect with a closing tag, not self-closed.
  return [...html.matchAll(/<rect ([^>]*data-shadow-edge[^>]*?)\/?>/g)].map(
    ([, attributes]): Bar => {
      const read = (name: string) =>
        new RegExp(`${name}="([^"]*)"`).exec(attributes!)?.[1] ?? "";
      return {
        edge: read("data-shadow-edge"),
        x: Number(read("x")),
        y: Number(read("y")),
        width: Number(read("width")),
        height: Number(read("height")),
        opacity: Number(read("fill-opacity")),
      };
    },
  );
}

/* The box runs from 5 to 19. */
const BOX_FROM = 5;
const BOX_TO = 19;

describe("ShadowLayerIcon", () => {
  it("thickens a drop shadow's edge outward, against the box", () => {
    const [bottom] = bars("drop", 0, 4);
    expect(bottom!.edge).toBe("bottom");
    // It starts on the box's bottom edge, so the edge reads heavier; it is
    // not a second line with a gap.
    expect(bottom!.y).toBe(BOX_TO);
    expect(bottom!.x).toBe(BOX_FROM);
    expect(bottom!.width).toBe(BOX_TO - BOX_FROM);
  });

  it("thickens an inner shadow's edge inward, along the top", () => {
    const [top] = bars("inner", 0, 4);
    expect(top!.edge).toBe("top");
    expect(top!.y).toBe(BOX_FROM);
  });

  it("thickens both edges a diagonal shadow falls on", () => {
    expect(bars("drop", 3, 4).map((each) => each.edge)).toEqual([
      "right",
      "bottom",
    ]);
  });

  it("thickens every edge at half strength when there is no offset", () => {
    const even = bars("drop", 0, 0);
    expect(even).toHaveLength(4);
    expect(even.every((each) => each.opacity === 0.5)).toBe(true);
    expect(bars("drop", 0, 4)[0]!.opacity).toBe(1);
  });

  it("draws in currentColor, so it follows its parent's text colour", () => {
    const html = renderToStaticMarkup(
      <ShadowLayerIcon
        edges={shadowLayerEdges({ offsetXPx: 0, offsetYPx: 1 })}
      />,
    );
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
