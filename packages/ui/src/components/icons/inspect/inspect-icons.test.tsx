import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as icons from ".";

const ALL = Object.entries(icons);

describe("the inspect panel's icons, from Figma", () => {
  it("are the 21 the design draws", () => {
    expect(ALL.map(([name]) => name).sort()).toEqual([
      "CornerBottomLeftIcon",
      "CornerBottomRightIcon",
      "CornerRadiusIcon",
      "CornerTopLeftIcon",
      "CornerTopRightIcon",
      "DropdownIcon",
      "EyeClosedIcon",
      "EyeIcon",
      "GapIcon",
      "IndividualPaddingIcon",
      "MinusIcon",
      "OpacityIcon",
      "PaddingBottomIcon",
      "PaddingHorizontalIcon",
      "PaddingLeftIcon",
      "PaddingRightIcon",
      "PaddingTopIcon",
      "PaddingVerticalIcon",
      "PlusIcon",
      "StrokeWeightIcon",
      "TokenIcon",
    ]);
  });

  it.each(ALL)(
    "%s draws in the colour its parent sets, and says nothing to a reader",
    (_name, Icon) => {
      const markup = renderToStaticMarkup(<Icon />);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain("currentColor");
      /* Never a literal colour: the panel's white, or a toggle's blue. */
      expect(markup).not.toMatch(/(fill|stroke)="(white|#[0-9a-f]{3,8})"/i);
      expect(markup).not.toContain("clip-path");
      expect(markup).not.toContain("<defs");
    },
  );

  it.each(ALL)("%s takes a size and a class from its caller", (_name, Icon) => {
    const markup = renderToStaticMarkup(
      <Icon className="size-3.5" width="14" height="14" />,
    );
    expect(markup).toContain('class="size-3.5"');
    expect(markup).toContain('width="14"');
    expect(markup).toContain('height="14"');
  });

  it("keep the boxes the design draws them in", () => {
    const box = (Icon: (props: object) => React.ReactElement) =>
      renderToStaticMarkup(<Icon />).match(/viewBox="([^"]+)"/)?.[1];
    expect(box(icons.GapIcon)).toBe("0 0 24 24");
    expect(box(icons.DropdownIcon)).toBe("0 0 23 24");
    expect(box(icons.TokenIcon)).toBe("0 0 12 12");
  });
});
