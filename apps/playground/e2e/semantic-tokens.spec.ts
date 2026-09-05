import { expect, test } from "./typography-fixtures";

/*
 * The studio's own semantic tokens, as the browser resolves them.
 *
 * Three things the token layer promises and nothing else pins: that a token
 * takes an opacity modifier, that flipping the theme attribute flips every
 * token, and that Astryx's components read our values through the bridge. All
 * three were measured before being written down here — the first two were
 * assumed once, and one of them turned out to be wrong for a different reason.
 */

type Probe = {
  mixAlpha: number | null;
  fgPrimary: string;
  astryxBorder: string;
  ourBorder: string;
  astryxText: string;
  ourFg: string;
  astryxBody: string;
  astryxHeading: string;
  astryxCode: string;
  ourSans: string;
  ourMono: string;
  /* What Astryx actually renders in, as against what the variable says. */
  buttonFont: string;
  headingFont: string;
  paragraphFont: string;
};

const probe = (
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) =>
  page.evaluate((t): Probe => {
    document.documentElement.setAttribute("data-theme", t);
    const host = document.querySelector("[data-astryx-theme]") as HTMLElement;
    const button = document.querySelector(
      "[data-astryx-theme] button",
    ) as HTMLElement | null;
    /* A heading as well as a button, because Astryx puts
       `font-family: var(--font-family-heading)` on a heading and puts nothing
       on this page's buttons — they inherit. A button therefore reads Inter
       whether the bridge maps the token or not: a true measurement of the
       page and a useless guard for the mapping. Measured with the three lines
       deleted from the bridge, the button stayed Inter and the heading fell
       to Figtree. */
    const heading = document.querySelector(
      "[data-astryx-theme] h1, [data-astryx-theme] h2",
    ) as HTMLElement | null;
    const el = document.createElement("div");
    /* Exactly what Tailwind emits for `bg-surface-raised/50`. */
    el.style.background =
      "color-mix(in srgb, var(--color-surface-raised) 50%, transparent)";
    el.style.color = "var(--color-fg-primary)";
    host.appendChild(el);
    const cs = getComputedStyle(el);
    const hcs = getComputedStyle(host);
    const alpha = cs.backgroundColor.match(/\/\s*([0-9.]+)\)$/);
    const out: Probe = {
      mixAlpha: alpha ? Number(alpha[1]) : null,
      fgPrimary: cs.color,
      astryxBorder: hcs.getPropertyValue("--color-border").trim(),
      ourBorder: hcs.getPropertyValue("--color-border-default").trim(),
      astryxText: hcs.getPropertyValue("--color-text-primary").trim(),
      ourFg: hcs.getPropertyValue("--color-fg-primary").trim(),
      astryxBody: hcs.getPropertyValue("--font-family-body").trim(),
      astryxHeading: hcs.getPropertyValue("--font-family-heading").trim(),
      astryxCode: hcs.getPropertyValue("--font-family-code").trim(),
      ourSans: hcs.getPropertyValue("--font-sans").trim(),
      ourMono: hcs.getPropertyValue("--font-mono").trim(),
      buttonFont: button ? getComputedStyle(button).fontFamily : "",
      headingFont: heading ? getComputedStyle(heading).fontFamily : "",
      paragraphFont: getComputedStyle(document.body).fontFamily,
    };
    el.remove();
    return out;
  }, theme);

test.describe("The studio's typeface", () => {
  test("is what Astryx's components read, in all three roles", async ({
    seededPage: page,
  }) => {
    /* Astryx reads these three names and nothing else. Without the bridge
       mapping they keep theme-neutral's defaults, and the studio renders its
       own text in one font and every control beside it in another — which is
       what it did: measured before this, a paragraph came back Figtree and a
       button beside it came back Geist. Neither had been chosen.

       The variables are compared rather than the rendered families, because a
       rendered family is the first name in a stack that the browser could
       load, and the point here is that the stack is ours at all. */
    const seen = await probe(page, "light");

    expect(seen.ourSans).not.toBe("");
    expect(seen.astryxBody).toBe(seen.ourSans);
    expect(seen.astryxHeading).toBe(seen.ourSans);
    expect(seen.astryxCode).toBe(seen.ourMono);
  });

  test("is the one font a page and its controls are both drawn in", async ({
    seededPage: page,
  }) => {
    /* The half a variable cannot prove. What Astryx renders and what the page
       around it renders have to resolve to the same first family.

       The heading is the one that depends on the bridge, and the one that was
       wrong before it: with the mapping deleted it draws in Figtree beside a
       page drawn in Inter. */
    const seen = await probe(page, "light");

    expect(seen.headingFont).not.toBe("");
    expect(first(seen.headingFont)).toBe(first(seen.paragraphFont));
    expect(seen.buttonFont).not.toBe("");
    expect(first(seen.buttonFont)).toBe(first(seen.paragraphFont));
    /* And it is Inter rather than whatever any of the three defaulted to. */
    expect(first(seen.headingFont)).toMatch(/Inter/i);
  });
});

/** The family a browser actually chose, out of the stack it was given. */
function first(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

test.describe("The studio's semantic tokens", () => {
  test("take an opacity modifier in both modes", async ({
    seededPage: page,
  }) => {
    const dark = await probe(page, "dark");
    const light = await probe(page, "light");
    /* `light-dark()` is a colour like any other to `color-mix`, so the
       modifier lands as alpha rather than falling back to the raw token. */
    expect(dark.mixAlpha).toBeCloseTo(0.5, 2);
    expect(light.mixAlpha).toBeCloseTo(0.5, 2);
  });

  test("follow the theme attribute", async ({ seededPage: page }) => {
    const dark = await probe(page, "dark");
    const light = await probe(page, "light");
    /* The whole layer, not one token: the same probe reads a foreground and
       the mixed surface, and both have to move. */
    expect(dark.fgPrimary).not.toBe(light.fgPrimary);
  });

  test("are what Astryx reads through the bridge", async ({
    seededPage: page,
  }) => {
    const seen = await probe(page, "dark");
    /* Astryx defines these names itself, inside its own theme layer. The
       bridge is what makes ours win, and the only proof is the resolved value
       on the element Astryx scopes to. */
    expect(seen.astryxBorder).toBe(seen.ourBorder);
    expect(seen.astryxText).toBe(seen.ourFg);
    expect(seen.ourBorder).not.toBe("");
  });
});
