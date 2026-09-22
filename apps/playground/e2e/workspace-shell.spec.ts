import { createWorkspaceFromHome, expect, openTheme, test } from "./fixtures";

test.describe("Workspace shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("Home top bar is 72px", async ({ page }) => {
    const homeNav = page.getByRole("navigation", { name: "Blueprint" });
    const link = homeNav.getByRole("link", { name: "Blueprint" });
    await expect(link).toBeVisible();
    await expect
      .poll(() => homeNav.evaluate((el) => getComputedStyle(el).minHeight))
      .toBe("72px");

    // Home logo SVG has cropped viewBox and aspect ratio
    const svg = link.locator("svg");
    const viewBox = await svg.getAttribute("viewBox");
    expect(viewBox).toBe("0 0 541 174");
    const bbox = await svg.boundingBox();
    expect(bbox).not.toBeNull();
    expect(bbox!.width).toBeGreaterThanOrEqual(80);
    expect(bbox!.height).toBe(32);

    // Logo left edge sits on the page content edge, level with "Projects".
    const heading = page.getByRole("heading", { level: 1, name: "Projects" });
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(Math.abs(bbox!.x - headingBox!.x)).toBeLessThanOrEqual(1);
  });

  test("rail brand marks are 32px tall in both states, matching the Home wordmark", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    const logoLink = rail.getByRole("link", { name: "Blueprint" });
    await expect(logoLink).toBeVisible();

    const expandedMarks = logoLink.locator("svg");
    await expect(expandedMarks).toHaveCount(2);
    for (const mark of await expandedMarks.all()) {
      const box = await mark.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBe(32);
    }

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    const expandBtn = rail.getByRole("button", { name: "Expand sidebar" });
    await expect(expandBtn).toBeVisible();
    const collapsedBox = await expandBtn.locator("svg").first().boundingBox();
    expect(collapsedBox).not.toBeNull();
    expect(collapsedBox!.height).toBe(32);
  });

  test("Home has no tool rail; Blueprint returns Home from a studio", async ({
    page,
  }) => {
    await expect(
      page.getByRole("navigation", { name: "Blueprint" }),
    ).toBeVisible();
    const homeNav = page.getByRole("navigation", { name: "Blueprint" });
    await expect(
      homeNav.getByRole("link", { name: "Blueprint" }),
    ).toBeVisible();
    await expect
      .poll(() => homeNav.evaluate((el) => getComputedStyle(el).minHeight))
      .toBe("72px");
    await expect(
      page.getByRole("navigation", { name: "Blueprint workspaces" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(0);

    await createWorkspaceFromHome(page);
    await expect(page).toHaveURL(/\/colour\/?$/);

    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Blueprint" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "Settings" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Typography" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Spacing" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Radius" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Elevation" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Preview" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Scale" })).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Playground sections" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Typography" }).click();
    await expect(page).toHaveURL(/\/typography\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Spacing" }).click();
    await expect(page).toHaveURL(/\/spacing\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated spacing steps" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Radius" }).click();
    await expect(page).toHaveURL(/\/radius\/?$/);
    await expect(
      page.getByRole("region", { name: "Radius", exact: true }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Elevation" }).click();
    await expect(page).toHaveURL(/\/elevation\/?$/);
    await expect(
      page.getByRole("region", { name: "Elevation", exact: true }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Preview" }).click();
    await expect(page).toHaveURL(/\/preview\/?$/);
    await expect(
      page.getByRole("heading", {
        name: "Finish the piece in one place",
        level: 1,
      }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Blueprint" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("navigation", { name: "Blueprint" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Blueprint workspaces" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Untitled workspace" }),
    ).toBeVisible();
  });

  test("Theme is a button group on the rail, not in the studio topbar", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    const theme = await openTheme(page);
    await expect(theme).toBeVisible();
    await theme.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("studio rail icons share the SideNav md size", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();

    const sizes = await rail.getByRole("link").evaluateAll((links) =>
      links
        .filter((link) => link.getAttribute("href") !== "/")
        .map((link) => link.querySelector("svg"))
        .filter((svg): svg is SVGSVGElement => svg instanceof SVGSVGElement)
        .map((svg) => {
          const box = svg.getBoundingClientRect();
          return { w: Math.round(box.width), h: Math.round(box.height) };
        }),
    );

    expect(sizes.length).toBeGreaterThanOrEqual(5);
    expect(new Set(sizes.map((size) => `${size.w}x${size.h}`)).size).toBe(1);
    expect(sizes[0]!.w).toBe(20);
    expect(sizes[0]!.h).toBe(20);
  });

  test("collapsed rail keeps accessible studio names", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await expect(page).toHaveURL(/\/colour\/?$/);

    await page.evaluate((key) => {
      window.localStorage.setItem(key, "1");
    }, "blueprint.shell.rail-collapsed");
    await page.reload();

    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(
      page.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
    await expect(rail.getByRole("link", { name: "Blueprint" })).toHaveCount(0);
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Theme" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Theme" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toBeVisible();
    const editBtn = page.getByRole("button", { name: "Edit project name" });
    await expect(editBtn).toBeVisible();
    const editSvg = editBtn.locator("svg");
    const editBox = await editSvg.boundingBox();
    expect(Math.round(editBox!.width)).toBe(20);
    expect(Math.round(editBox!.height)).toBe(20);

    const themeBtn = page.getByRole("button", { name: "Theme" });
    await expect(themeBtn).toBeVisible();
    const themeSvg = themeBtn.locator("svg");
    const themeBox = await themeSvg.boundingBox();
    expect(Math.round(themeBox!.width)).toBe(20);
    expect(Math.round(themeBox!.height)).toBe(20);

    const editColor = await editBtn.evaluate(
      (el) => getComputedStyle(el).color,
    );
    const themeColor = await themeBtn.evaluate(
      (el) => getComputedStyle(el).color,
    );
    expect(editColor).toBe(themeColor);

    await rail.getByRole("link", { name: "Colour" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });

  test("monogram is visible in both expanded and collapsed states while name disappears", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    const expandedLogo = rail.getByRole("link", { name: "Blueprint" });
    await expect(expandedLogo).toBeVisible();
    const expandedMonogram = expandedLogo.locator("svg").first();
    await expect(expandedMonogram).toBeVisible();
    const expandedBox = await expandedMonogram.boundingBox();

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    const expandBtn = rail.getByRole("button", { name: "Expand sidebar" });
    await expect(expandBtn).toBeVisible();
    const collapsedMonogram = expandBtn.locator("svg").first();
    await expect(collapsedMonogram).toBeVisible();
    await expect(rail.getByRole("link", { name: "Blueprint" })).toHaveCount(0);

    // The B is the anchor: it must not move when the rail closes.
    await expect
      .poll(async () => (await collapsedMonogram.boundingBox())?.x)
      .toBeCloseTo(expandedBox!.x, 0);
    expect(expandedBox!.x).toBe(16);
  });

  test("collapsed project name edit button expands the rail and focuses input", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    const editBtn = page.getByRole("button", { name: "Edit project name" });
    await expect(editBtn).toBeVisible();

    await editBtn.click();
    await expect(rail.getByRole("link", { name: "Blueprint" })).toBeVisible();

    const nameInput = page.getByLabel("Project name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeFocused();

    const selection = await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement | null;
      if (!el || el.selectionStart === null || el.selectionEnd === null)
        return "";
      return el.value.substring(el.selectionStart, el.selectionEnd);
    });
    expect(selection).toBe("Untitled workspace");
  });

  test("project name textfield height matches edit icon height at 36px", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const nameInput = page.getByLabel("Project name");
    await expect(nameInput).toBeVisible();
    const expandedBox = await nameInput.boundingBox();
    expect(expandedBox).not.toBeNull();
    expect(expandedBox!.height).toBe(36);

    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await rail.getByRole("button", { name: "Collapse sidebar" }).click();

    const editBtn = page.getByRole("button", { name: "Edit project name" });
    await expect(editBtn).toBeVisible();
    const collapsedBox = await editBtn.boundingBox();
    expect(collapsedBox).not.toBeNull();
    expect(collapsedBox!.height).toBe(36);
  });

  test("divider spans the full rail width across expanded and collapsed states", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    const divider = rail.getByRole("separator");
    await expect(divider).toBeVisible();

    const expandedRailBox = await rail.boundingBox();
    const expandedDividerBox = await divider.boundingBox();
    expect(expandedRailBox).not.toBeNull();
    expect(expandedDividerBox).not.toBeNull();
    expect(
      Math.abs(expandedDividerBox!.width - expandedRailBox!.width),
    ).toBeLessThanOrEqual(1);

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(
      rail.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();

    const collapsedRailBox = await rail.boundingBox();
    const collapsedDividerBox = await divider.boundingBox();
    expect(collapsedRailBox).not.toBeNull();
    expect(collapsedDividerBox).not.toBeNull();
    expect(
      Math.abs(collapsedDividerBox!.width - collapsedRailBox!.width),
    ).toBeLessThanOrEqual(1);
  });

  test("Blueprint logo in expanded rail has 8px padding and aligns with Project name", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    const logoLink = rail.getByRole("link", { name: "Blueprint" });
    const nameInput = page.getByLabel("Project name");

    await expect(logoLink).toBeVisible();
    await expect(nameInput).toBeVisible();

    const logoPadding = await logoLink.evaluate(
      (el) => getComputedStyle(el).paddingLeft,
    );
    const namePadding = await nameInput.evaluate(
      (el) => getComputedStyle(el).paddingLeft,
    );
    expect(logoPadding).toBe("8px");
    expect(namePadding).toBe("8px");

    const logoRect = await logoLink.boundingBox();
    const nameRect = await nameInput.boundingBox();
    expect(logoRect).not.toBeNull();
    expect(nameRect).not.toBeNull();
    expect(Math.abs(logoRect!.x - nameRect!.x)).toBeLessThanOrEqual(1);
  });

  test("Project name text field container does not clip focus ring with overflow hidden", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const nameInput = page.getByLabel("Project name");
    await expect(nameInput).toBeVisible();

    const containerOverflow = await nameInput.evaluate((el) => {
      const container = el.closest('[class*="fieldContainer"]');
      return container ? getComputedStyle(container).overflow : null;
    });
    expect(containerOverflow).toBe("visible");

    await nameInput.click();
    await expect(nameInput).toBeFocused();

    const outlineStyle = await nameInput.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
      };
    });
    expect(outlineStyle.outlineStyle).toBe("solid");
    expect(outlineStyle.outlineWidth).toBe("2px");
  });

  test("rail motion timings reach CSS from rail-motion.ts", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail).toBeVisible();

    const motion = await rail.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        duration: cs.getPropertyValue("--rail-duration").trim(),
        fade: cs.getPropertyValue("--rail-fade").trim(),
      };
    });

    // rail-motion.ts owns these and publishes them inline; the stylesheet
    // only carries fallbacks of the same value. Change a number there and
    // this fails, which is what proves the binding is live.
    expect(motion.duration).toBe("240ms");
    expect(motion.fade).toBe("180ms");

    // Deliberately no assertion on transitionDuration. This suite runs under
    // `reducedMotion: "reduce"` (see playwright.config.ts) and the rail turns
    // its transitions off in that mode, so the computed duration is 0s here.
    // These tests assert what the page contains, never how it arrives.
  });

  test("rail row height and inner width come from one inherited token", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    const tokens = await rail.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        row: cs.getPropertyValue("--rail-row-height").trim(),
        inner: cs.getPropertyValue("--rail-inner-width").trim(),
      };
    });
    expect(tokens.row).toBe("36px");
    expect(tokens.inner).toBe("244px");

    // The brand row and the name field both resolve from those tokens rather
    // than from their own literals.
    const logoLink = rail.getByRole("link", { name: "Blueprint" });
    const nameInput = page.getByLabel("Project name");
    const logoBox = await logoLink.boundingBox();
    const nameBox = await nameInput.boundingBox();
    expect(logoBox!.height).toBe(36);
    expect(nameBox!.height).toBe(36);
    expect(nameBox!.width).toBe(244);
  });

  test("heading collapses the rail; the mark expands it", async ({ page }) => {
    await createWorkspaceFromHome(page);
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Blueprint" })).toBeVisible();

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(
      rail.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
    await expect(rail.getByRole("link", { name: "Blueprint" })).toHaveCount(0);
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();

    await rail.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(rail.getByRole("link", { name: "Blueprint" })).toBeVisible();
    await expect(
      rail.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeVisible();
  });

  test("Space swaps the current studio with Preview", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.evaluate(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.blur();
    });
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/preview\/?$/);
    await expect(
      page.getByRole("heading", {
        name: "Finish the piece in one place",
        level: 1,
      }),
    ).toBeVisible();

    await page.evaluate(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.blur();
    });
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/colour\/?$/);
  });

  test("Space in a field does not open Preview", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await page.getByLabel("Project name").click();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/colour\/?$/);
  });
});
