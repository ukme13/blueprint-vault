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
};

const probe = (
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) =>
  page.evaluate((t): Probe => {
    document.documentElement.setAttribute("data-theme", t);
    const host = document.querySelector("[data-astryx-theme]") as HTMLElement;
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
    };
    el.remove();
    return out;
  }, theme);

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
