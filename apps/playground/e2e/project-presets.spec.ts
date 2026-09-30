import { expect, readStoredWorkspace, test } from "./fixtures";

/**
 * Home create with a starting point.
 *
 * The selectors here are the ones every other spec reaches a studio through:
 * the dialog is "New project", the field is "Project name", the button is
 * "Create workspace". A change that renames any of them breaks most of the
 * suite, so they are asserted rather than assumed.
 */
test.describe("Project presets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("opens on the studio's own seed", async ({ page }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });

    await expect(dialog.getByLabel("Project name")).toBeVisible();
    await expect(
      dialog.getByRole("radio", { name: "GitHub Primer" }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("button", { name: "Create workspace" }),
    ).toBeVisible();
  });

  test("the chosen preset decides the palette the workspace starts from", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });

    await dialog.getByLabel("Project name").fill("Stripe");
    await dialog.getByRole("radio", { name: "Stripe Vibrant" }).click();
    await dialog.getByRole("button", { name: "Create workspace" }).click();

    await expect(page).toHaveURL(/\/colour\/?$/);

    const stored = await readStoredWorkspace(page);
    const seedFor = (id: string) =>
      stored.palette.tracks.find((track: { id: string }) => track.id === id)
        ?.seedHex;

    expect(seedFor("primary")).toBe("#635bff");
    expect(seedFor("secondary")).toBe("#00d4b2");
    /* And its status hues: every track is the preset's. */
    expect(seedFor("error")).toBe("#df1b41");
    expect(stored.typography.system.ratio).toBeCloseTo(1.333, 3);
    /* Its own 14px label, which the ratio skips, typed on every frame. */
    const label = stored.typography.system.roles.find(
      (role: { id: string }) => role.id === "label",
    );
    expect(label.unlinkedSizes).toEqual({ desktop: 14, tablet: 14, phone: 14 });
    /* Its spacing: the 4px unit the layout uses are written against, not an
       8px base that doubled them. */
    expect(stored.spacing).toMatchObject({ baseUnitPx: 4, density: 1 });
  });

  test("offers the serif presets, and a created one carries its sizes", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    const gallery = dialog.getByRole("group", { name: "Starting point" });
    for (const name of ["Medium Story", "The Guardian", "Notion Serif"]) {
      await expect(gallery.getByRole("radio", { name })).toBeAttached();
    }

    await dialog.getByLabel("Project name").fill("Reading");
    await gallery.getByRole("radio", { name: "Medium Story" }).check();
    await expect(dialog.getByRole("region", { name: "Type" })).toContainText(
      "Charter",
    );
    await dialog.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);

    const system = (await readStoredWorkspace(page)).typography.system;
    expect(system.baseFontSizePx).toBe(18);
    expect(system.fonts[0].families[0]).toBe("Charter");
    const role = (id: string) =>
      system.roles.find((each: { id: string }) => each.id === id);
    /* Body and headings follow the scale; only the 14px caption is typed. */
    expect(role("body-md").unlinkedSizes).toEqual({});
    expect(role("h1").unlinkedSizes).toEqual({});
    expect(role("caption").unlinkedSizes).toEqual({
      desktop: 14,
      tablet: 14,
      phone: 14,
    });
  });

  test("a refused create keeps the dialog open and says why", async ({
    page,
  }) => {
    /* One real workspace first, so there is a valid document to clone. */
    await page.getByRole("button", { name: "New project" }).click();
    const first = page.getByRole("dialog", { name: "New project" });
    await first.getByLabel("Project name").fill("First");
    await first.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);

    await page.goto("/");
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await dialog.getByLabel("Project name").fill("Ninth");

    /* Fill the library behind the open dialog, the way a second tab would.
       The button is disabled at capacity, so this is the only way in. */
    await page.evaluate(() => {
      const LIBRARY = "blueprint.library.v1";
      const raw = window.localStorage.getItem(LIBRARY);
      if (!raw) throw new Error("no library to fill");
      const index = JSON.parse(raw) as { currentId: string; ids: string[] };
      const document = window.localStorage.getItem(
        `blueprint.workspace.${index.currentId}`,
      );
      if (!document) throw new Error("no document to clone");

      const ids = [...index.ids];
      while (ids.length < 8) {
        const id = `filler-${ids.length}`;
        window.localStorage.setItem(`blueprint.workspace.${id}`, document);
        ids.push(id);
      }
      window.localStorage.setItem(LIBRARY, JSON.stringify({ ...index, ids }));
    });

    await dialog.getByRole("button", { name: "Create workspace" }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText("8 projects");
    await expect(page).toHaveURL(/\/$/);
  });

  test("lays the presets out as a gallery beside their details", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    const gallery = dialog.getByRole("group", { name: "Starting point" });
    const details = dialog.getByRole("complementary", {
      name: "Preset details",
    });

    /* Two columns: the gallery on the left, the details to its right. */
    const galleryBox = (await gallery.boundingBox())!;
    const detailsBox = (await details.boundingBox())!;
    expect(detailsBox.x).toBeGreaterThanOrEqual(
      galleryBox.x + galleryBox.width - 1,
    );
    expect(Math.round((await dialog.boundingBox())!.width)).toBe(780);

    /* No summary sentence, on the cards or in the panel: the details
       say it, value by value. */
    await expect(dialog).not.toContainText("GitHub's design system");

    /* Opens on GitHub Primer, every value its own. */
    await expect(details).toContainText("#0969DA");
    await expect(details).toContainText("#656D76");
    await expect(details).toContainText("System sans");
    await expect(details).toContainText("Major Third, 1.25");
    await expect(details).toContainText("Enterprise");
    const spacing = details.getByRole("region", { name: "Spacing and radius" });
    await expect(spacing).toContainText("4px base");
    await expect(spacing).toContainText("6px");

    /* The arrow keys move the choice, and the details follow it. */
    await gallery.getByRole("radio", { name: "GitHub Primer" }).focus();
    await page.keyboard.press("ArrowRight");
    const stripe = gallery.getByRole("radio", { name: "Stripe Vibrant" });
    await expect(stripe).toBeChecked();
    await expect(stripe).toBeFocused();
    await expect(details).toContainText("#635BFF");
    await expect(details).toContainText("App UI");
    await page.keyboard.press("ArrowRight");
    await expect(details).toContainText("Inter");
    await expect(details).toContainText("Minor Third, 1.2");
    /* Carbon's corners are square, and say so. */
    await gallery.getByRole("radio", { name: "IBM Carbon" }).check();
    await expect(spacing).toContainText("4px base");
    await expect(spacing).toContainText("0px, square");
    await gallery.getByRole("radio", { name: "Linear Studio" }).check();

    /* The picked card wears the ring, and only that one. */
    /* Polled: the ring eases between cards. */
    const ringed = () =>
      gallery.evaluate((node) =>
        [...node.querySelectorAll("label")]
          .filter((card) => getComputedStyle(card).boxShadow !== "none")
          .map((card) => card.textContent ?? ""),
      );
    await expect
      .poll(ringed)
      .toEqual([expect.stringContaining("Linear Studio")]);

    /* Unpicked cards draw no edge of their own. */
    /* Polled, with the pointer moved off: the edge eases away from the
       card just left, and a hovered card shows the subtle one. */
    await page.mouse.move(0, 0);
    await expect
      .poll(() =>
        gallery.evaluate((node) => [
          ...new Set(
            [...node.querySelectorAll("label:not([data-selected])")].map(
              (card) => getComputedStyle(card).borderTopColor,
            ),
          ),
        ]),
      )
      .toEqual(["rgba(0, 0, 0, 0)"]);

    /* The gallery runs the dialog's full height, level with the details,
       and scrolls only when the screen caps the dialog. It once stopped at
       a fixed 28rem with room to spare, cutting a card in half. */
    const fit = () =>
      gallery.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const panel = node.nextElementSibling!.getBoundingClientRect();
        const dialogBox = node
          .closest("dialog, [role=dialog]")!
          .getBoundingClientRect();
        return {
          level: Math.abs(box.bottom - panel.bottom) <= 1,
          /* The cards scroll beneath the gallery's title bar. */
          overflow: (() => {
            const scroller = node.querySelector("[class*=galleryScroll]")!;
            return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          })(),
          inside: [...node.querySelectorAll("label")].every((card) => {
            const each = card.getBoundingClientRect();
            return each.bottom <= dialogBox.bottom;
          }),
        };
      });
    expect((await fit()).level).toBe(true);
    // With the room, every card shows whole and nothing scrolls.
    await page.setViewportSize({ width: 1280, height: 1200 });
    await expect.poll(fit).toEqual({ level: true, overflow: 0, inside: true });

    /* One action, the panel's width; closing is the header's job. */
    await expect(dialog.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    const create = (await dialog
      .getByRole("button", { name: "Create workspace" })
      .boundingBox())!;
    const panel = await details.evaluate((node) => {
      const css = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return (
        box.width -
        parseFloat(css.paddingLeft) -
        parseFloat(css.paddingRight) -
        parseFloat(css.borderLeftWidth)
      );
    });
    expect(Math.abs(create.width - panel)).toBeLessThanOrEqual(1);
  });

  test("keeps Create reachable, with room under it, on a short screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 560 });
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    const details = dialog.getByRole("complementary", {
      name: "Preset details",
    });
    const create = dialog.getByRole("button", { name: "Create workspace" });

    /* Too short to show every detail: the panel scrolls, it does not clip. */
    expect(
      await details.evaluate((node) => getComputedStyle(node).overflowY),
    ).toBe("auto");
    await create.scrollIntoViewIfNeeded();
    await expect(create).toBeInViewport();

    /* Scrolled to its end, the button keeps room below it. */
    const room = await details.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      const button = node.querySelector("button[type=submit]")!;
      const css = getComputedStyle(node);
      return (
        node.getBoundingClientRect().bottom -
        parseFloat(css.paddingBottom) -
        button.getBoundingClientRect().bottom
      );
    });
    expect(Math.round(room)).toBeGreaterThanOrEqual(8);
  });

  test("heads both columns with one bar, and runs card pictures to the edge", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    const layout = await dialog.evaluate((node) => {
      const heads = [...node.querySelectorAll("[class*=columnHead]")];
      const box = (element: Element) => element.getBoundingClientRect();
      const [left, right] = heads.map(box);
      const galleryBox = box(heads[0]!.parentElement!);
      const panel = heads[1]!.parentElement!;
      const panelBox = box(panel);
      const panelBorder = parseFloat(getComputedStyle(panel).borderLeftWidth);
      const card = node.querySelector("label")!;
      const thumb = card.querySelector("[class*=presetThumb]")!;
      const text = card.querySelector("[class*=presetText]")!;
      const cardCss = getComputedStyle(card);
      const border = parseFloat(cardCss.borderTopWidth);
      return {
        heads: heads.map((head) => head.textContent),
        level: Math.round(left!.top) === Math.round(right!.top),
        sameHeight: Math.round(left!.height) === Math.round(right!.height),
        edgeToEdge:
          Math.round(left!.left) === Math.round(galleryBox.left) &&
          Math.round(left!.right) === Math.round(galleryBox.right) &&
          Math.round(right!.left) === Math.round(panelBox.left + panelBorder) &&
          Math.round(right!.right) === Math.round(panelBox.right),
        thumbFlush: [
          box(thumb).top - box(card).top - border,
          box(thumb).left - box(card).left - border,
          box(card).right - border - box(thumb).right,
        ].map(Math.round),
        namePadded: parseFloat(getComputedStyle(text).paddingLeft) > 0,
      };
    });
    expect(layout).toEqual({
      heads: ["Starting point", "Preset details"],
      level: true,
      sameHeight: true,
      edgeToEdge: true,
      thumbFlush: [0, 0, 0],
      namePadded: true,
    });
  });
});
