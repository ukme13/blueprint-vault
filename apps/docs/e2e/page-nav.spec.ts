import { expect, test } from "./fixtures";

/*
 * The column on the right, and the one thing about it that needs a browser.
 *
 * Everything else on these pages is decided at build time and can be checked
 * by rendering a component. Which section a reader is looking at cannot: it
 * needs a viewport, a scroll position and an IntersectionObserver that has
 * actually run. So it is checked here or it is not checked at all.
 */

const ROUTE = "/foundations/spacing";

test.describe("the on-page nav", () => {
  test("lists the page's sections, in order", async ({ page }) => {
    await page.goto(ROUTE);

    const links = page.locator('nav[aria-label="On this page"] a');
    await expect(links.first()).toBeVisible();

    /* Against the headings actually rendered, not a list written here. The
       nav and the sections come from one array; this is the assertion that
       they still do. */
    const targets = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    );
    const ids = await page
      .locator(".doc-column section[id]")
      .evaluateAll((nodes) => nodes.map((node) => `#${node.id}`));

    expect(targets).toEqual(ids);
  });

  test("marks the section in view, and follows the reader down", async ({
    page,
  }) => {
    await page.goto(ROUTE);

    const current = page.locator(
      'nav[aria-label="On this page"] a[aria-current]',
    );

    /* Nothing is marked until the observer has seen something, so the first
       assertion is that it settles rather than that it starts anywhere. */
    await expect(current).toHaveCount(1);
    const first = await current.getAttribute("href");

    /* Scroll to the end and assert the marker moved *forward*, not that it
       landed on one named section. Which section is current at the bottom of a
       page depends on how tall the last one is and where the observer's band
       falls across it — both real, both nothing to do with whether the spy
       works. Asserting the exact id made this fail while the column was
       behaving correctly. */
    const sections = page.locator(".doc-column section[id]");
    await sections.last().scrollIntoViewIfNeeded();

    await expect
      .poll(async () => current.getAttribute("href"), { timeout: 5000 })
      .not.toBe(first);

    const order = await page
      .locator(".doc-column section[id]")
      .evaluateAll((nodes) => nodes.map((node) => `#${node.id}`));
    const now = await current.getAttribute("href");
    expect(order.indexOf(now!)).toBeGreaterThan(order.indexOf(first!));
  });

  test("scrolls the page itself, not a box inside it", async ({ page }) => {
    /* The half that was actually broken. While the content lived in a scroll
       container, a fragment link moved that container and not the document —
       and `scroll-behavior: smooth` is declared on `html`, which a container
       never reads. So the link working is not the claim; the *document*
       moving is. */
    await page.goto(ROUTE);

    const before = await page.evaluate(() => window.scrollY);
    await page.locator('nav[aria-label="On this page"] a').last().click();

    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(before);
  });

  test("jumps rather than glides for a reader who asked it to", async ({
    page,
  }) => {
    /* This whole suite runs under `reducedMotion: "reduce"`, so the default
       here is the accessible path, and it is worth asserting rather than
       assuming: somebody who has asked their machine for less motion gets a
       jump. The pair below covers the other half. */
    await page.goto(ROUTE);

    const behaviour = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behaviour).toBe("auto");
  });

  test("still navigates with its links, highlight or no", async ({ page }) => {
    /* The part that must survive a browser with no JavaScript, and the part a
       reader in a handover folder depends on. The ids are in the HTML; only
       the marking needs hydration. */
    await page.goto(ROUTE);

    const second = page.locator('nav[aria-label="On this page"] a').nth(1);
    const href = await second.getAttribute("href");
    await second.click();

    await expect(page.locator(`.doc-column ${href}`)).toBeInViewport();
  });
});

test.describe("for a reader who has not asked for less motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("glides to the section", async ({ page }) => {
    /* Asserting the declaration rather than the easing. Watching the scroll
       position ease would be asserting the browser's animation, which is the
       browser's to get right and changes between versions. */
    await page.goto(ROUTE);

    const behaviour = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behaviour).toBe("smooth");
  });
});
