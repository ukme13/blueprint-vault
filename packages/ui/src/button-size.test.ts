import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

/**
 * A button is the height of the field it sits beside.
 *
 * Astryx sizes its inputs by --size-element-sm/md/lg: 28, 32 and 36px. The
 * Tailwind heights here are the same numbers, h-7, h-8 and h-9, so a small
 * button beside a small TextInput, or a default one beside a default one,
 * shares its top and bottom edges. medium used to be h-9 and large h-11, a
 * step taller than their fields.
 */
const HEIGHTS = { small: "h-7", medium: "h-8", large: "h-9" } as const;

function classesAt(size?: keyof typeof HEIGHTS): string[] {
  const markup = renderToStaticMarkup(
    createElement(Button, size === undefined ? {} : { size }, "Label"),
  );
  const match = /class="([^"]*)"/.exec(markup);
  return (match?.[1] ?? "").split(/\s+/);
}

describe("Button heights", () => {
  for (const [size, height] of Object.entries(HEIGHTS)) {
    it(`draws ${size} at the matching input height, ${height}`, () => {
      const classes = classesAt(size as keyof typeof HEIGHTS);
      expect(classes).toContain(height);
      expect(
        classes.filter((each) => /^h-\d/.test(each)),
        "one height only",
      ).toEqual([height]);
    });
  }

  it("defaults to medium, the default input's height", () => {
    expect(classesAt()).toContain("h-8");
  });
});
