import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContrastIcon } from "./ContrastIcon";

describe("ContrastIcon", () => {
  it("is drawn in currentColor, so it follows its parent's text colour", () => {
    const html = renderToStaticMarkup(<ContrastIcon />);
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toMatch(/#[0-9a-f]{3,8}|fill="white"/i);
  });

  it("is decoration unless a caller says otherwise, and takes a size and a class", () => {
    expect(renderToStaticMarkup(<ContrastIcon />)).toContain(
      'aria-hidden="true"',
    );
    const html = renderToStaticMarkup(
      <ContrastIcon className="size-3.5" aria-hidden={false} width={14} />,
    );
    expect(html).toContain('class="size-3.5"');
    expect(html).toContain('width="14"');
    expect(html).toContain('viewBox="0 0 11 11"');
  });
});
