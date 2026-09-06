import {
  COLOUR_MODE_KEY,
  expect,
  FOUNDATION_ROUTES,
  openInMode,
  test,
} from "./fixtures";

/*
 * Every page, in every mode, and the mode the reader chose.
 *
 * The unit tests render a component twice with a value changed; this checks
 * the built site. A page can pass every render test and still fail here — a
 * stylesheet that did not ship, a client component that throws on hydration,
 * a mode attribute nothing applies.
 */

const MODES = ["light", "dark", "system"] as const;

test.describe("every foundation page renders", () => {
  for (const route of FOUNDATION_ROUTES) {
    for (const mode of MODES) {
      test(`${route} in ${mode}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));

        await openInMode(page, route, mode);

        /* A title, a table and no thrown error. Each of the three catches a
           different way a page can be there and be useless. */
        /* The page's own title, by name. Not "the only h1": the typography
           page renders the h1 role as a real h1, twice, which is the plan's
           instruction and leaves three level-one headings on that page. */
        await expect(
          page.getByRole("heading", { level: 1 }).first(),
        ).toBeVisible();
        await expect(page.locator("table").first()).toBeVisible();
        expect(errors, errors.join("\n")).toEqual([]);

        /* The mode actually reached the document rather than being stored
           and ignored. `system` deliberately leaves the attribute off: that is
           what hands the decision to `color-scheme` and the reader's machine,
           and it is the one mode whose correctness is an absence. */
        const attribute = await page.evaluate(() =>
          document.documentElement.getAttribute("data-theme"),
        );
        expect(attribute).toBe(mode === "system" ? null : mode);
      });
    }
  }
});

test.describe("the mode the reader chose", () => {
  test("survives a reload", async ({ page }) => {
    await openInMode(page, "/foundations/colour", "light");

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.getAttribute("data-theme"),
        ),
      )
      .toBe("dark");

    await page.reload();
    /* Applied before first paint, not after hydration: the attribute is on the
       element the moment the document exists. */
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      ),
    ).toBe("dark");
  });

  test("is the same choice the studio writes", async ({ page }) => {
    /* The cross-application contract, checked from this side. Both apps keep
       the mode under one key so somebody moving between them keeps their
       choice — so this writes the key exactly as the studio does and asserts
       the documentation honours it. Running both servers to click one and read
       the other would test the same fact and need twice the machinery.

       The constant is duplicated deliberately: a test that imported the key
       from the same module the app reads would pass if somebody changed it. */
    await page.addInitScript(() => {
      window.localStorage.setItem("blueprint.colour-mode.v1", "dark");
    });
    await page.goto("/foundations/colour");

    expect(COLOUR_MODE_KEY).toBe("blueprint.colour-mode.v1");
    expect(
      await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      ),
    ).toBe("dark");
  });
});
