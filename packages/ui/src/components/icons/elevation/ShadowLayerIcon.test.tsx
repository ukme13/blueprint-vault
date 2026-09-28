import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShadowLayerIcon } from "./ShadowLayerIcon";

/** The square's inline style, as rendered for a layer with these offsets. */
function square(type: "drop" | "inner", offsetXPx: number, offsetYPx: number) {
  const html = renderToStaticMarkup(
    <ShadowLayerIcon layer={{ type, offsetXPx, offsetYPx }} />,
  );
  return /data-shadow-icon="" style="([^"]*)"/.exec(html)?.[1] ?? "";
}

describe("ShadowLayerIcon", () => {
  it("casts a real shadow in the layer's direction", () => {
    expect(square("drop", 0, 4)).toContain(
      "box-shadow:0px 2px 0 0 currentColor",
    );
  });

  it("casts an inset shadow for an inner layer", () => {
    expect(square("inner", 0, 4)).toContain(
      "box-shadow:inset 0px 2px 0 0 currentColor",
    );
  });

  it("is an outline in currentColor, so it follows its parent's text colour", () => {
    const style = square("drop", 0, 4);
    expect(style).toContain("border:1.5px solid currentColor");
    expect(style).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it("is hidden from assistive technology, beside the row's own label", () => {
    const html = renderToStaticMarkup(
      <ShadowLayerIcon layer={{ offsetXPx: 0, offsetYPx: 1 }} />,
    );
    expect(html).toMatch(/^<span aria-hidden="true"/);
  });
});
