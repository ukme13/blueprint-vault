import { expect, test } from "./fixtures";

/*
 * What the suite is emulating, asserted rather than assumed.
 *
 * The export dialog's buttons travel for 366ms after it opens, and the helpers
 * click one the moment it appears; reduced motion is what stops Playwright's
 * actionability check waiting on a moving target. That setting shipped once as
 * a top-level `reducedMotion` key in the config, which is not a key Playwright
 * 1.62 has — it type-errored, and at runtime it was ignored. The suite went on
 * running with animation, the flake it was meant to remove was still there,
 * and nothing said so.
 *
 * A configuration option that can be silently absent needs a test, because the
 * failure mode is not an error: it is the old behaviour, quietly.
 */

test.describe("What the browser is told", () => {
  test("prefers reduced motion", async ({ seededPage: page }) => {
    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduced).toBe(true);
  });

  test("holds the export dialog still enough to click", async ({
    seededPage: page,
  }) => {
    /* The measurement the setting exists for, kept as a test rather than as a
       number in a commit message. With motion on, this button moves about
       23px over 366ms; with it reduced it is where it lands on the first
       frame. Sampling two frames is what Playwright's own stability check
       does. */
    await page.getByRole("button", { name: "Export palette" }).click();

    const travelled = await page.evaluate(async () => {
      const button = () =>
        [...document.querySelectorAll("button")]
          .find((each) => each.textContent?.trim() === "CSS")
          ?.getBoundingClientRect();

      const first = button();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const second = button();
      if (!first || !second) return null;
      return (
        Math.abs(first.left - second.left) + Math.abs(first.top - second.top)
      );
    });

    expect(travelled).not.toBeNull();
    expect(travelled).toBeLessThan(1);
  });
});
