import { expect, test, openTheme } from "./fixtures";
import { openPreview } from "./preview-fixtures";

/**
 * The demo page, as a landing site.
 *
 * See docs/roadmap/semantic-tokens.md. That the page reaches for no primitive
 * is checked at the source, in packages/ui — this covers that it renders from
 * the layer, answers to both modes, and that the inspector writes landing
 * copy rather than the scale.
 */

const HERO_TITLE = "Finish the piece in one place";
const ARTICLE_TITLE = "A type scale is a set of decisions, not a set of sizes";

test.describe("The system preview", () => {
  test("draws itself from the seeded semantic layer", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await openPreview(page);

    await expect(
      page.getByRole("heading", { name: HERO_TITLE, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("answers to the mode toggle", async ({ page }) => {
    await openPreview(page);

    await expect(
      page.getByRole("heading", { name: HERO_TITLE, level: 1 }),
    ).toBeVisible();

    /* A token-driven element rather than a wrapper: the first div on the page
       belongs to the framework and is transparent either way.

       The baseline is only meaningful once the layer has landed, which is what
       openPreview waits for. */
    const background = () =>
      page
        .getByRole("button", { name: "Sign up" })
        .evaluate((node) => getComputedStyle(node).backgroundColor);
    const dark = await background();

    /* Light, because the studio opens dark and the canvas now follows the
       studio. Clicking the mode it is already in would assert nothing. */
    await (await openTheme(page)).getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    /* The same token, a different primitive. A layer that held one value per
       name could not do this at all. */
    await expect.poll(background).not.toBe(dark);
  });

  test("says so when there is no layer to draw", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/preview");
    await expect(
      page.getByRole("heading", { name: "Nothing to preview yet" }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("has no language switch", async ({ page }) => {
    await openPreview(page);
    await expect(page.getByRole("button", { name: "Thai" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "English" })).toHaveCount(0);
  });
});

test.describe("The preview's device frame", () => {
  test("is a switch in the bar, not the workspace name", async ({ page }) => {
    await openPreview(page);
    const bar = page.locator("header[aria-label='Preview']");
    await expect(
      bar.getByRole("navigation", { name: "Preview devices" }),
    ).toBeVisible();
    await expect(bar.getByRole("button", { name: "Phone" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "Tablet" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "Desktop" })).toBeVisible();
    await expect(bar.getByText("Designally")).toHaveCount(0);
  });

  test("puts a device edge around phone and tablet", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openPreview(page);
    const devices = page.getByRole("navigation", { name: "Preview devices" });
    await expect(page.locator("[data-device-chrome]")).toHaveCount(0);

    await devices.getByRole("button", { name: "Phone" }).click();
    const phone = page.locator("[data-device-chrome]");
    await expect(phone).toHaveAttribute("data-preview-device", "phone");
    await expect(phone).toHaveCSS("border-top-width", "1px");
    await expect(page.locator("[data-preview-ready]")).toHaveAttribute(
      "data-frame",
      "phone",
    );

    await devices.getByRole("button", { name: "Tablet" }).click();
    await expect(page.locator("[data-device-chrome]")).toHaveAttribute(
      "data-preview-device",
      "tablet",
    );
    await expect(page.locator("[data-preview-ready]")).toHaveAttribute(
      "data-frame",
      "tablet",
    );

    await devices.getByRole("button", { name: "Desktop" }).click();
    await expect(page.locator("[data-device-chrome]")).toHaveCount(0);
    await expect(page.locator("[data-preview-ready]")).toHaveAttribute(
      "data-frame",
      "desktop",
    );
    expect(pageErrors).toEqual([]);
  });

  test("keeps the site nav on one row on the phone", async ({ page }) => {
    await openPreview(page);
    await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button", { name: "Phone" })
      .click();
    const siteNav = page.locator("[data-preview-ready] header");
    await expect(siteNav.getByText("Blueprint", { exact: true })).toBeVisible();
    await expect(
      siteNav.getByRole("button", { name: "Sign up" }),
    ).toBeVisible();
    await expect(siteNav.getByText("Login", { exact: true })).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Site" }).getByText("Home"),
    ).toBeHidden();
  });

  test("puts footer categories beside the brand on desktop", async ({
    page,
  }) => {
    await openPreview(page);
    const footer = page.locator("[data-preview-ready] footer");
    const brand = footer.getByText("Blueprint", { exact: true });
    const product = footer.getByText("Product", { exact: true });
    const brandBox = await brand.boundingBox();
    const productBox = await product.boundingBox();
    expect(brandBox).not.toBeNull();
    expect(productBox).not.toBeNull();
    expect(Math.abs(brandBox!.y - productBox!.y)).toBeLessThan(8);
    expect(productBox!.x).toBeGreaterThan(brandBox!.x);
  });

  test("stacks the footer brand above the categories on the phone", async ({
    page,
  }) => {
    await openPreview(page);
    await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button", { name: "Phone" })
      .click();
    const site = page.locator("[data-preview-ready]");
    await expect(site).toHaveAttribute("data-frame", "phone");
    const metrics = await site.evaluate((node) => {
      const footer = node.querySelector("footer");
      if (!footer) return null;
      const copy = [...footer.querySelectorAll("p")];
      const brand = copy.find((el) => el.textContent?.trim() === "Blueprint");
      const product = copy.find((el) => el.textContent?.trim() === "Product");
      const company = copy.find((el) => el.textContent?.trim() === "Company");
      if (!brand || !product || !company) return null;
      const footerBox = footer.getBoundingClientRect();
      return {
        footerX: footerBox.x,
        footerWidth: footerBox.width,
        brandY: brand.getBoundingClientRect().y,
        productY: product.getBoundingClientRect().y,
        companyX: company.getBoundingClientRect().x,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.brandY).toBeLessThan(metrics!.productY);
    expect(metrics!.companyX).toBeGreaterThan(
      metrics!.footerX + metrics!.footerWidth / 3,
    );
  });

  test("spreads footer categories across the tablet", async ({ page }) => {
    await openPreview(page);
    await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button", { name: "Tablet" })
      .click();
    const site = page.locator("[data-preview-ready]");
    await expect(site).toHaveAttribute("data-frame", "tablet");
    const metrics = await site.evaluate((node) => {
      const footer = node.querySelector("footer");
      if (!footer) return null;
      const copy = [...footer.querySelectorAll("p")];
      const product = copy.find((el) => el.textContent?.trim() === "Product");
      const company = copy.find((el) => el.textContent?.trim() === "Company");
      if (!product || !company) return null;
      const footerBox = footer.getBoundingClientRect();
      return {
        footerX: footerBox.x,
        footerWidth: footerBox.width,
        companyX: company.getBoundingClientRect().x,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.companyX).toBeGreaterThan(
      metrics!.footerX + metrics!.footerWidth / 3,
    );
  });

  test("keeps section spacing on the phone", async ({ page }) => {
    /* Short enough that a flex:1 main would squash the hero into the
       features heading — that is the collision, not a roomy canvas. */
    await page.setViewportSize({ width: 1400, height: 560 });
    await openPreview(page);
    await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button", { name: "Phone" })
      .click();
    await expect(page.locator("[data-preview-ready]")).toHaveAttribute(
      "data-frame",
      "phone",
    );

    const site = page.locator("[data-preview-ready]");
    const metrics = await site.evaluate((node) => {
      const heroBand = node.querySelector(
        '[data-preview-section="landing-hero"]',
      );
      const featuresBand = node.querySelector(
        '[data-preview-section="landing-features"]',
      );
      const hero = heroBand?.querySelector("section");
      const features = featuresBand?.querySelector("section");
      const art = hero?.querySelector("svg");
      const title = features?.querySelector("h1, h2, h3, h4");
      if (!hero || !features || !art || !title) return null;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;flex:none;height:var(--gap-section);width:1px;";
      node.appendChild(probe);
      const gap = probe.getBoundingClientRect().height;
      probe.remove();
      return {
        gap,
        betweenSections:
          features.getBoundingClientRect().top -
          hero.getBoundingClientRect().bottom,
        belowArt:
          title.getBoundingClientRect().top -
          art.getBoundingClientRect().bottom,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.gap).toBeGreaterThanOrEqual(64);
    expect(metrics!.betweenSections).toBeCloseTo(2.5 * metrics!.gap, 0);
    expect(metrics!.belowArt).toBeGreaterThanOrEqual(metrics!.gap);
  });
});

test.describe("The preview's vision control", () => {
  test("turns simulation on and back off again", async ({ page }) => {
    /* A selector alone had no way back: it offered the four deficiencies and
       nothing that meant normal vision. The chip is the on/off, the same shape
       the shade generator uses. */
    await openPreview(page);

    const primary = page.getByRole("button", { name: "Sign up" });
    /* The token on the CTA, not `backgroundColor`. Simulation writes hex into
       `--color-action-primary`; turning it off writes the oklab the palette
       already had. Chrome's used-value of a library button's fill does not
       round-trip that way: after the hex pass it serialises as rgb even when
       the variable is oklab again, so the second half would fail a colour
       that is still the same paint. */
    const fill = () =>
      primary.evaluate((node) =>
        getComputedStyle(node)
          .getPropertyValue("--color-action-primary")
          .trim(),
      );
    /* Taken after openPreview, so this is the colour the token really gives
       rather than the empty string before its variables arrive. Turning the
       simulation off comes back to the former and never to the latter, so a
       baseline read too early fails the second half of this test while the
       first half passes. */
    const normal = await fill();

    const chip = page.getByRole("button", { name: "Vision" });
    await chip.click();
    await expect(page.getByLabel("Vision type")).toBeVisible();
    await expect.poll(fill).not.toBe(normal);

    await chip.click();
    await expect(page.getByLabel("Vision type")).toBeHidden();
    await expect.poll(fill).toBe(normal);
  });

  test("shares the choice with the shade generator", async ({ page }) => {
    /* One preference for the workspace: both pages read the same provider, so
       turning it on here has it on there. */
    await openPreview(page);
    await page.getByRole("button", { name: "Vision" }).click();
    await expect(page.getByLabel("Vision type")).toBeVisible();

    await page.goto("/colour");
    await expect(page.getByRole("button", { name: "Vision" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

test.describe("The preview's theme control", () => {
  test("is the studio's own, and moves the chrome with the canvas", async ({
    page,
  }) => {
    await openPreview(page);
    /* One control, and the same one every other page carries. This page used
       to have a switch of its own: first beside the studio's, which gave a
       page with two things called a theme each flipping a different half of
       it, and then alone, which gave a page whose only switch had no way to
       say "system". */
    await expect(
      page.getByRole("radiogroup", { name: "Colour mode" }),
    ).toHaveCount(0);
    const control = await openTheme(page);
    await expect(control).toBeVisible();
    await expect(control.getByRole("radio", { name: "System" })).toBeVisible();

    const bar = page.locator("header[aria-label='Preview']");
    const chrome = () =>
      bar.evaluate((el) => getComputedStyle(el).backgroundColor);
    const canvas = () =>
      page
        .getByRole("button", { name: "Sign up" })
        .evaluate((node) => getComputedStyle(node).backgroundColor);
    const [chromeDark, canvasDark] = [await chrome(), await canvas()];

    await control.getByRole("radio", { name: "Light" }).click();

    /* Both halves, because moving one is the bug this replaced: the canvas
       draws from semantic variables computed for a resolved mode, the bar
       from light-dark() chrome tokens, and they answer to one choice now. */
    await expect.poll(chrome).not.toBe(chromeDark);
    await expect.poll(canvas).not.toBe(canvasDark);
  });

  test("is the same choice the studio pages make", async ({
    seededPage: page,
  }) => {
    /* Chosen in the palette studio, read on the preview. The complaint this
       answers was exactly this crossing: picking dark left the preview light,
       because the preview's mode was a second piece of state. */
    await (await openTheme(page)).getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.goto("/preview");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(
      (await openTheme(page)).getByRole("radio", { name: "Light" }),
    ).toBeVisible();
  });
});

test.describe("The slot inspector", () => {
  test("rewrites the hero and leaves Typography's article alone", async ({
    page,
  }) => {
    await openPreview(page);
    await page.getByRole("heading", { name: HERO_TITLE, level: 1 }).click();

    const dialog = page.getByRole("dialog", { name: "Inspect" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Copy" }).fill("My headline");

    await expect(
      page.getByRole("heading", { name: "My headline", level: 1 }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "My headline", level: 1 }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Typography" })
      .click();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Type scale preview" })
        .getByRole("heading", { name: ARTICLE_TITLE, level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Type scale preview" })
        .getByRole("heading", { name: "My headline", level: 1 }),
    ).toHaveCount(0);
  });

  test("repaints the title when its type role changes", async ({ page }) => {
    await openPreview(page);
    const title = page.getByRole("heading", {
      name: HERO_TITLE,
      level: 1,
    });
    await expect(title).toBeVisible();
    const before = await title.evaluate(
      (node) => getComputedStyle(node).fontSize,
    );

    await title.click();
    const dialog = page.getByRole("dialog", { name: "Inspect" });
    await dialog.getByRole("combobox", { name: "Type role" }).click();
    await page.getByRole("option", { name: "caption", exact: true }).click();

    const painted = page.getByText(HERO_TITLE).first();
    await expect
      .poll(() => painted.evaluate((node) => getComputedStyle(node).fontSize))
      .not.toBe(before);
  });

  test("restyles every nav link together and names the group", async ({
    page,
  }) => {
    await openPreview(page);
    const nav = page.getByRole("navigation", { name: "Site" });
    const home = nav.getByText("Home", { exact: true });
    const features = nav.getByText("Features", { exact: true });
    const before = await features.evaluate(
      (node) => getComputedStyle(node).fontSize,
    );

    await home.click();
    const dialog = page.getByRole("dialog", { name: "Nav links" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Copy" })).toHaveValue(
      "Home",
    );

    await dialog.getByRole("combobox", { name: "Type role" }).click();
    await page.getByRole("option", { name: "h1", exact: true }).click();

    await expect
      .poll(() => features.evaluate((node) => getComputedStyle(node).fontSize))
      .not.toBe(before);
    await expect
      .poll(() => home.evaluate((node) => getComputedStyle(node).fontSize))
      .not.toBe(before);
  });

  test("restyles feature card titles together and names the group", async ({
    page,
  }) => {
    await openPreview(page);
    const planning = page.getByRole("heading", {
      name: "Shared palettes",
    });
    const management = page.getByRole("heading", {
      name: "Type that travels",
    });
    const before = await management.evaluate(
      (node) => getComputedStyle(node).fontSize,
    );

    await planning.click();
    const dialog = page.getByRole("dialog", { name: "Feature card titles" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Copy" })).toHaveValue(
      "Shared palettes",
    );

    await dialog.getByRole("combobox", { name: "Type role" }).click();
    await page.getByRole("option", { name: "h1", exact: true }).click();

    await expect
      .poll(() =>
        management.evaluate((node) => getComputedStyle(node).fontSize),
      )
      .not.toBe(before);
    await expect
      .poll(() => planning.evaluate((node) => getComputedStyle(node).fontSize))
      .not.toBe(before);
  });

  test("restyles feature card bodies together and names the group", async ({
    page,
  }) => {
    await openPreview(page);
    const planning = page.getByRole("paragraph").filter({
      hasText: "Colour, type and spacing live as one set",
    });
    const management = page.getByRole("paragraph").filter({
      hasText: "Headings, captions and body keep their roles",
    });
    const before = await management.evaluate(
      (node) => getComputedStyle(node).fontSize,
    );

    await planning.click();
    const dialog = page.getByRole("dialog", { name: "Feature card bodies" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Copy" })).toHaveValue(
      /Colour, type and spacing live as one set/,
    );

    await dialog.getByRole("combobox", { name: "Type role" }).click();
    await page.getByRole("option", { name: "h1", exact: true }).click();

    await expect
      .poll(() =>
        management.evaluate((node) => getComputedStyle(node).fontSize),
      )
      .not.toBe(before);
    await expect
      .poll(() => planning.evaluate((node) => getComputedStyle(node).fontSize))
      .not.toBe(before);
  });

  test("centres the closing CTA lead", async ({ page }) => {
    await openPreview(page);
    const lead = page.getByRole("paragraph").filter({
      hasText: "Open a workspace, paint the tokens",
    });
    await expect(lead).toHaveCSS("text-align", "center");
  });

  test("lets the footer baseline be rewritten as captions", async ({
    page,
  }) => {
    await openPreview(page);
    const copy = page.getByText(
      "© 2026 Blueprint. Placeholder content for typography preview.",
    );
    await copy.click();
    const dialog = page.getByRole("dialog", { name: "Footer baseline" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("combobox", { name: "Type role" }),
    ).toHaveText(/caption/);
    await dialog
      .getByRole("textbox", { name: "Copy" })
      .fill("© 2026 Blueprint");
    await expect(
      page.getByRole("paragraph").filter({ hasText: "© 2026 Blueprint" }),
    ).toBeVisible();
    await expect(page.getByText("Made for type testing")).toBeVisible();
  });

  test("closes when the backdrop is clicked", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await openPreview(page);
    await page.getByRole("heading", { name: HERO_TITLE, level: 1 }).click();
    const dialog = page.getByRole("dialog", { name: "Inspect" });
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test("survives a device switch after inspecting", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await openPreview(page);
    await page.getByRole("heading", { name: HERO_TITLE, level: 1 }).click();
    const dialog = page.getByRole("dialog", { name: "Inspect" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button", { name: "Phone" })
      .click();
    await expect(page.locator("[data-device-chrome]")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

const PNG_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Preview section fill and token colour", () => {
  test("paints the hero from a surface token chosen on the band menu", async ({
    page,
  }) => {
    await openPreview(page);
    const hero = page.locator('[data-preview-section="landing-hero"]');
    const before = await hero.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );

    await hero.hover();
    await hero.getByRole("button", { name: "Section fill for Hero" }).click();
    await page.getByRole("menuitem", { name: "Background colour…" }).click();

    const dialog = page.getByRole("dialog", { name: "Hero" });
    await expect(dialog).toBeVisible();
    const combobox = dialog.getByRole("combobox", {
      name: "Background colour",
    });
    await combobox.click();

    const menuGeometry = await page.evaluate(() => {
      const popover = [...document.querySelectorAll("[popover]")].find((el) =>
        (el as HTMLElement).matches(":popover-open"),
      ) as HTMLElement | undefined;
      const combo = document.querySelector('dialog [role="combobox"]');
      if (!popover || !combo) return null;
      const pRect = popover.getBoundingClientRect();
      const cRect = combo.getBoundingClientRect();
      return {
        popoverTop: pRect.top,
        popoverBottom: pRect.bottom,
        comboTop: cRect.top,
        comboBottom: cRect.bottom,
      };
    });
    expect(menuGeometry).not.toBeNull();
    // Menu sits against the combobox trigger rather than jumping to top of the screen (top === 0)
    expect(menuGeometry!.popoverBottom).toBeGreaterThan(
      menuGeometry!.comboTop - 40,
    );
    expect(menuGeometry!.popoverTop).toBeLessThan(
      menuGeometry!.comboBottom + 40,
    );
    expect(menuGeometry!.popoverTop).toBeGreaterThan(0);

    const sectionSwatches = page.locator(
      'dialog [role="listbox"] i[class*="previewColourSwatch"]',
    );
    await expect(sectionSwatches.first()).toBeVisible();
    expect(await sectionSwatches.count()).toBeGreaterThan(3);

    const triggerSwatch = page.locator(
      'dialog [role="combobox"] i[class*="previewColourSwatch"]',
    );
    await expect(triggerSwatch).toBeVisible();

    await page
      .getByRole("option", { name: "Surface raised", exact: true })
      .click();

    await expect
      .poll(() =>
        hero.evaluate((node) => getComputedStyle(node).backgroundColor),
      )
      .not.toBe(before);
  });

  test("shows an uploaded hero image and restores the token when removed", async ({
    page,
  }) => {
    await openPreview(page);
    const hero = page.locator('[data-preview-section="landing-hero"]');
    const before = await hero.evaluate(
      (node) => getComputedStyle(node).backgroundImage,
    );

    await hero.hover();
    await hero.getByRole("button", { name: "Section fill for Hero" }).click();
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("menuitem", { name: "Upload image…" }).click(),
    ]);
    await chooser.setFiles({
      name: "hero.png",
      mimeType: "image/png",
      buffer: PNG_PIXEL,
    });

    await expect
      .poll(() =>
        hero.evaluate((node) => getComputedStyle(node).backgroundImage),
      )
      .not.toBe(before);

    await hero.hover();
    await hero.getByRole("button", { name: "Section fill for Hero" }).click();
    await page.getByRole("menuitem", { name: "Remove image" }).click();

    await expect
      .poll(() =>
        hero.evaluate((node) => getComputedStyle(node).backgroundImage),
      )
      .toBe(before);
  });

  test("separates Split B and Quad into distinct bands with their own fills", async ({
    page,
  }) => {
    await openPreview(page);
    const splitB = page.locator('[data-preview-section="landing-split-b"]');
    const quad = page.locator('[data-preview-section="landing-quad"]');

    await expect(splitB).toBeVisible();
    await expect(quad).toBeVisible();

    const splitBMenu = splitB.getByRole("button", {
      name: "Section fill for Split B",
    });
    const quadMenu = quad.getByRole("button", {
      name: "Section fill for Quad",
    });

    const splitBMenuWrapper = splitB.locator('[class*="menu"]').first();
    const quadMenuWrapper = quad.locator('[class*="menu"]').first();

    const opacityOf = (locator: typeof splitBMenuWrapper) =>
      locator.evaluate((node) => getComputedStyle(node).opacity);

    // Menus are hidden (opacity: 0) until hover/focus on that band
    expect(await opacityOf(splitBMenuWrapper)).toBe("0");
    expect(await opacityOf(quadMenuWrapper)).toBe("0");

    await splitB.hover();
    expect(await opacityOf(splitBMenuWrapper)).toBe("1");
    expect(await opacityOf(quadMenuWrapper)).toBe("0");
    await expect(splitBMenu).toBeAttached();

    await quad.hover();
    expect(await opacityOf(quadMenuWrapper)).toBe("1");
    expect(await opacityOf(splitBMenuWrapper)).toBe("0");
    await expect(quadMenu).toBeAttached();

    const splitBBefore = await splitB.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const quadBefore = await quad.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );

    await quadMenu.click();
    await page.getByRole("menuitem", { name: "Background colour…" }).click();

    const dialog = page.getByRole("dialog", { name: "Quad" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox", { name: "Background colour" }).click();
    await page
      .getByRole("option", { name: "Surface raised", exact: true })
      .click();

    await expect
      .poll(() =>
        quad.evaluate((node) => getComputedStyle(node).backgroundColor),
      )
      .not.toBe(quadBefore);

    const splitBAfter = await splitB.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    expect(splitBAfter).toBe(splitBBefore);

    // Assert Split B and Quad are flush (no phantom canvas gap between the bands)
    // and spacing lives inside the Quad band (padding-block-start)
    const geometry = await page.evaluate(() => {
      const b = document.querySelector(
        '[data-preview-section="landing-split-b"]',
      );
      const q = document.querySelector('[data-preview-section="landing-quad"]');
      if (!b || !q) return null;
      const bRect = b.getBoundingClientRect();
      const qRect = q.getBoundingClientRect();
      return {
        gapBetweenBands: qRect.top - bRect.bottom,
        quadPaddingTop: parseFloat(getComputedStyle(q).paddingTop),
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.gapBetweenBands).toBeCloseTo(0, 0);
    expect(geometry!.quadPaddingTop).toBeGreaterThan(0);
  });

  test("restyles grouped feature titles together, then only the detached slot", async ({
    page,
  }) => {
    await openPreview(page);
    const planning = page.getByRole("heading", { name: "Shared palettes" });
    const management = page.getByRole("heading", { name: "Type that travels" });
    const live = page.getByRole("heading", { name: "Live preview" });
    const colorOf = (locator: typeof planning) =>
      locator.evaluate((node) => getComputedStyle(node).color);

    const groupedBefore = await colorOf(management);

    await planning.click();
    const dialog = page.getByRole("dialog", { name: "Feature card titles" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox", { name: "Colour" }).click();
    await page
      .getByRole("option", { name: "Foreground accent", exact: true })
      .click();

    await expect.poll(() => colorOf(planning)).not.toBe(groupedBefore);
    await expect.poll(() => colorOf(management)).not.toBe(groupedBefore);
    await expect.poll(() => colorOf(live)).not.toBe(groupedBefore);

    const grouped = await colorOf(management);
    await dialog.getByRole("button", { name: "Edit this slot only" }).click();
    await dialog.getByRole("combobox", { name: "Colour" }).click();
    await page
      .getByRole("option", { name: "Foreground secondary", exact: true })
      .click();

    await expect.poll(() => colorOf(planning)).not.toBe(grouped);
    await expect.poll(() => colorOf(management)).toBe(grouped);
    await expect.poll(() => colorOf(live)).toBe(grouped);
  });

  test("anchors the slot colour selector popup over the trigger when reopening", async ({
    page,
  }) => {
    await openPreview(page);
    const heading = page.getByRole("heading", { name: "Shared palettes" });
    await heading.click();
    const dialog = page.getByRole("dialog", { name: "Feature card titles" });
    await expect(dialog).toBeVisible();
    const combo = dialog.getByRole("combobox", { name: "Colour" });
    await combo.click();

    // Select an action token that is positioned deep down the options list
    await page
      .getByRole("option", { name: "Action primary surface", exact: true })
      .click();

    // Close dialog and reopen
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await heading.click();
    await expect(dialog).toBeVisible();
    await combo.click();

    const geometry = await page.evaluate(() => {
      const popover = [...document.querySelectorAll("[popover]")].find((el) =>
        (el as HTMLElement).matches(":popover-open"),
      ) as HTMLElement | undefined;
      const comboEl = document.querySelectorAll(
        'dialog [role="combobox"]',
      )[1] as HTMLElement | undefined;
      if (!popover || !comboEl) return null;
      const pRect = popover.getBoundingClientRect();
      const cRect = comboEl.getBoundingClientRect();
      return {
        popoverTop: pRect.top,
        popoverBottom: pRect.bottom,
        comboTop: cRect.top,
        comboBottom: cRect.bottom,
      };
    });

    expect(geometry).not.toBeNull();
    // The menu stays anchored near the combobox trigger rather than jumping to top: 0
    expect(geometry!.popoverBottom).toBeGreaterThan(geometry!.comboTop - 40);
    expect(geometry!.popoverTop).toBeLessThan(geometry!.comboBottom + 40);
    expect(geometry!.popoverTop).toBeGreaterThan(0);

    // Color options display the swatch square
    const swatches = page.locator(
      'dialog [role="listbox"] i[class*="previewColourSwatch"]',
    );
    await expect(swatches.first()).toBeVisible();
    expect(await swatches.count()).toBeGreaterThan(5);

    // Trigger button also displays the swatch square for the selected color
    const triggerSwatch = page
      .locator('dialog [role="combobox"]')
      .nth(1)
      .locator('i[class*="previewColourSwatch"]');
    await expect(triggerSwatch).toBeVisible();
  });
});
