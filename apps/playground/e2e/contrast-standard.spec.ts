import type { Page } from "@playwright/test";
import { expect, openTheme, test } from "./fixtures";

/**
 * The Contrast tool: Contrast alone while it is off, and once it is on WCAG 2
 * and WCAG 3 beside it, as one group. Contrast names it and is never lit; the
 * standard measuring is. The standard changes the number on every swatch and
 * the grades in a shade's details.
 */
const group = (page: Page) =>
  page.getByRole("group", { name: "Contrast", exact: true });
const contrastButton = (page: Page) =>
  group(page).getByRole("button", { name: "Contrast", exact: true });
const standard = (page: Page, name: "WCAG 2" | "WCAG 3") =>
  group(page).getByRole("button", { name, exact: true });
const comparison = (page: Page) =>
  page.getByRole("region", { name: "Contrast comparison", exact: true });

/** Off is Contrast alone: neither standard is there to be pressed. */
const expectOff = async (page: Page) => {
  await expect(group(page).getByRole("button")).toHaveText(["Contrast"]);
  await expect(comparison(page)).toHaveCount(0);
  await expect(page.locator("button[data-contrast-ratio]")).toHaveCount(0);
};

const readings = (page: Page) =>
  page
    .locator("button[data-contrast-ratio]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-contrast-ratio")),
    );

test.describe("The Contrast tool", () => {
  test("starts off as Contrast alone, with no numbers on the swatches", async ({
    seededPage: page,
  }) => {
    await expect(group(page)).toBeVisible();
    await expectOff(page);

    /* The icon sits beside the label, on its centre line, and the button is
       as tall as Add colour and Vision beside it. */
    const button = (await contrastButton(page).boundingBox())!;
    const icon = (await contrastButton(page).locator("svg").boundingBox())!;
    expect(icon.y + icon.height / 2).toBeCloseTo(
      button.y + button.height / 2,
      0,
    );
    expect(icon.x + icon.width).toBeLessThan(button.x + button.width / 2);
    const add = (await page
      .getByRole("button", { name: "Add colour" })
      .boundingBox())!;
    expect(button.height).toBeCloseTo(add.height, 0);
    expect(button.y).toBeCloseTo(add.y, 0);
  });

  test("Contrast switches it on in WCAG 2 and never lights itself", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();

    /* The standards appear, and the one in use is lit. */
    await expect(group(page).getByRole("button")).toHaveText([
      "Contrast",
      "WCAG 2",
      "WCAG 3",
    ]);
    await expect(standard(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    /* Not a mode: it has no pressed state of its own. */
    await expect(contrastButton(page)).not.toHaveAttribute("aria-pressed");
    await expect(comparison(page)).toBeVisible();
    await expect(
      comparison(page).getByRole("radiogroup", {
        name: "Contrast comparison colour",
      }),
    ).toBeVisible();
    await expect(
      page.locator("button[data-contrast-ratio]").first(),
    ).toBeVisible();
  });

  test("shows every comparison label whole, the chosen one included", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();
    const target = page.getByRole("radiogroup", {
      name: "Contrast comparison colour",
    });
    /* Bold once chosen, which is wider: Custom was cut to Cust… when it was. */
    for (const name of ["White", "Black", "Custom"]) {
      await target.getByRole("radio", { name }).click();
      const cut = await target.evaluate((group) =>
        [...group.querySelectorAll("*")]
          .filter(
            (node) =>
              node.children.length === 0 &&
              node.textContent?.trim() &&
              node.scrollWidth > node.clientWidth,
          )
          .map((node) => node.textContent),
      );
      expect(cut, name + " chosen").toEqual([]);
    }
  });

  test("a press on the lit standard or on Contrast turns it off", async ({
    seededPage: page,
  }) => {
    for (const turnOff of [
      () => standard(page, "WCAG 2").click(),
      () => contrastButton(page).click(),
    ]) {
      await contrastButton(page).click();
      await expect(comparison(page)).toBeVisible();
      await turnOff();
      await expectOff(page);
    }

    /* The other standard, pressed while one is lit, switches rather than
       turning off. */
    await contrastButton(page).click();
    await standard(page, "WCAG 3").click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standard(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(comparison(page)).toBeVisible();
  });

  test("Contrast comes back on in the standard last used", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();
    await standard(page, "WCAG 3").click();
    await standard(page, "WCAG 3").click();
    await expectOff(page);

    /* Not WCAG 2, the default: the one the person chose. */
    await contrastButton(page).click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standard(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    /* And it is remembered across a reload, on or off. */
    await page.reload();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await contrastButton(page).click();
    await page.reload();
    await expectOff(page);
    await contrastButton(page).click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("switches the swatches between a WCAG 2 ratio and a WCAG 3 Lc", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();
    const swatch = page.locator("button[data-contrast-ratio]").first();

    /* A ratio to one place: 4.5 or 12.3, with a point. */
    await expect(swatch).toHaveAttribute("data-contrast-standard", "wcag2");
    const ratios = await readings(page);
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) expect(ratio).toMatch(/^\d+\.\d$/);

    await standard(page, "WCAG 3").click();
    await expect(swatch).toHaveAttribute("data-contrast-standard", "wcag3");
    const lcs = await readings(page);
    expect(lcs).toHaveLength(ratios.length);
    /* The size of an Lc: a whole number, and not the ratios it replaced. */
    for (const lc of lcs) expect(lc).toMatch(/^\d+$/);
    expect(lcs).not.toEqual(ratios);
    await expect(swatch).toHaveAttribute("aria-label", /APCA contrast Lc \d+/);

    /* Back, and the ratios are the same ones. */
    await standard(page, "WCAG 2").click();
    expect(await readings(page)).toEqual(ratios);
  });

  test("warns in red or amber along a swatch's foot, and says nothing when it passes", async ({
    seededPage: page,
  }) => {
    /* Off, no swatch carries a status, bar or no bar. */
    await expect(page.locator("[data-contrast-status]")).toHaveCount(0);

    await contrastButton(page).click();
    const swatches = page.locator("button[data-contrast-status]");
    await expect(swatches.first()).toBeVisible();
    expect(await swatches.count()).toBeGreaterThan(100);

    /* The bar is a 2px line along the foot, as wide as the swatch, with no
       shadow of its own to muddy it. */
    const bar = page.locator("button[data-contrast-status] [data-status]");
    const geometry = await bar.first().evaluate((node) => {
      const box = node.getBoundingClientRect();
      const swatch = node.parentElement!.getBoundingClientRect();
      return {
        height: box.height,
        widthGap: Math.abs(box.width - swatch.width),
        footGap: Math.abs(box.bottom - swatch.bottom),
        shadow: getComputedStyle(node).boxShadow,
      };
    });
    expect(geometry.height).toBeCloseTo(2, 0);
    expect(geometry.widthGap).toBeLessThan(1);
    expect(geometry.footGap).toBeLessThan(1);
    expect(geometry.shadow).toBe("none");

    /* Each step reads from the figure on the swatch, under both standards,
       leaving out the few within a tenth of a line where rounding hides it. */
    const lines = { wcag2: [3, 7], wcag3: [45, 75] } as const;
    for (const which of ["wcag2", "wcag3"] as const) {
      if (which === "wcag3") await standard(page, "WCAG 3").click();
      await expect(swatches.first()).toHaveAttribute(
        "data-contrast-standard",
        which,
      );
      const [partial, pass] = lines[which];
      const rows = await swatches.evaluateAll((nodes) =>
        nodes.map((node) => ({
          value: Number(node.getAttribute("data-contrast-ratio")),
          status: node.getAttribute("data-contrast-status"),
          hasBar: node.querySelector("[data-status]") !== null,
          barStatus: node
            .querySelector("[data-status]")
            ?.getAttribute("data-status"),
          name: node.getAttribute("aria-label") ?? "",
        })),
      );
      const seen = new Set<string>();
      for (const row of rows) {
        seen.add(row.status!);
        /* A bar for a fail or a partial pass, and none for a pass. */
        expect(row.hasBar, row.name).toBe(row.status !== "pass");
        if (row.hasBar) expect(row.barStatus).toBe(row.status);
        /* Said in words, for those who do not see the bar, passes included. */
        expect(row.name).toMatch(/fails|passes in part|passes/);
        const near = [partial, pass].some(
          (line) => Math.abs(row.value - line) < 0.1,
        );
        if (near) continue;
        const expected =
          row.value >= pass
            ? "pass"
            : row.value >= partial
              ? "partial"
              : "fail";
        expect(row.status, row.name).toBe(expected);
      }
      /* A real palette has all three, and only the first two draw. */
      expect([...seen].sort()).toEqual(["fail", "partial", "pass"]);
      await expect(page.locator('[data-status="pass"]')).toHaveCount(0);
    }

    /* Red and amber, vivid, and not the same. */
    await standard(page, "WCAG 2").click();
    const colours = await page
      .locator("[data-status]")
      .evaluateAll((bars) =>
        Object.fromEntries(
          bars.map((node) => [
            node.getAttribute("data-status")!,
            getComputedStyle(node).backgroundColor,
          ]),
        ),
      );
    expect(Object.keys(colours).sort()).toEqual(["fail", "partial"]);
    expect(colours.fail).toContain("0.65 0.24 25");
    expect(colours.partial).toContain("0.78 0.18 75");

    /* Off again, and they go. */
    await contrastButton(page).click();
    await expect(page.locator("[data-contrast-status]")).toHaveCount(0);
    await expect(page.locator("[data-status]")).toHaveCount(0);
  });

  test("grades a shade by the standard in force: AA and AAA, or Body, Large and UI", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();
    const shade = page.getByRole("button", { name: /Select primary 500,/ });
    await shade.first().click();
    const details = page.getByRole("dialog", {
      name: "primary 500 shade details",
    });

    const wcag2 = details.getByRole("region", {
      name: "WCAG 2 contrast result",
    });
    await expect(wcag2).toContainText("Large text");
    await expect(wcag2).toContainText("Small text");
    await expect(wcag2).toContainText(/\d+\.\d\d:1/);
    await expect(wcag2).not.toContainText("Body");

    /* The standard is changed outside the popover; close it to reach it. */
    await details.getByRole("button", { name: "Close shade details" }).click();
    await standard(page, "WCAG 3").click();
    await shade.first().click();

    const wcag3 = details.getByRole("region", {
      name: "WCAG 3 contrast result",
    });
    await expect(wcag3).toBeVisible();
    await expect(wcag3).toContainText(/Lc -?\d+\.\d/);
    for (const tier of ["Body", "Large", "UI"]) {
      await expect(wcag3.getByText(tier, { exact: false })).toBeVisible();
    }
    await expect(wcag3).toContainText("Lc 75");
    await expect(wcag3).toContainText("Lc 60");
    await expect(wcag3).toContainText("Lc 45");
    await expect(wcag3).not.toContainText("Small text");

    /* Turned round, the pair has another Lc: APCA knows which is the text. */
    const lc = wcag3.locator("strong");
    const before = await lc.getAttribute("data-apca-lc");
    await wcag3
      .getByRole("button", { name: "Swap text and background" })
      .click();
    await expect(lc).not.toHaveAttribute("data-apca-lc", before!);
    expect(Math.sign(Number(await lc.getAttribute("data-apca-lc")))).toBe(
      -Math.sign(Number(before)),
    );
  });
});

/**
 * Whether text that sits on a fill can be read: the WCAG 2 contrast between a
 * node's own colour and the background of the fill it is on (itself, or the
 * ancestor `within` names), in whichever theme is showing. Measured on the
 * painted colours, whatever space they are written in.
 */
const contrastOf = (page: Page, selector: string, within?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((node, fillSelector) => {
      const luminance = (value: string) => {
        const context = document.createElement("canvas").getContext("2d")!;
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data as unknown as [
          number,
          number,
          number,
        ];
        const linear = (v: number) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      };
      const fill = fillSelector
        ? (node.closest(fillSelector) as HTMLElement)
        : (node as HTMLElement);
      const text = luminance(getComputedStyle(node).color);
      const ground = luminance(getComputedStyle(fill).backgroundColor);
      return (Math.max(text, ground) + 0.05) / (Math.min(text, ground) + 0.05);
    }, within);

/** Settled, not in flight: buttons ease their colours over 200ms. */
const expectReadable = (
  page: Page,
  selector: string,
  within?: string,
  minimum = 4.5,
) =>
  expect
    .poll(() => contrastOf(page, selector, within))
    .toBeGreaterThanOrEqual(minimum);

for (const theme of ["Light", "Dark"] as const) {
  test.describe(`Text that sits on a fill, in ${theme.toLowerCase()} mode`, () => {
    test("the standard measuring reads on its fill", async ({
      seededPage: page,
    }) => {
      const themes = await openTheme(page);
      await themes.getByRole("radio", { name: theme }).click();
      await page.keyboard.press("Escape");

      await contrastButton(page).click();
      await expect(standard(page, "WCAG 2")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expectReadable(
        page,
        'button[aria-pressed="true"]:has-text("WCAG 2")',
      );
    });

    test("Vision, switched on, and the type beside it read on their fills", async ({
      seededPage: page,
    }) => {
      const themes = await openTheme(page);
      await themes.getByRole("radio", { name: theme }).click();
      await page.keyboard.press("Escape");

      const vision = page.getByRole("button", { name: "Vision", exact: true });
      await vision.click();
      await expect(vision).toHaveAttribute("aria-pressed", "true");
      await expectReadable(
        page,
        'button[aria-pressed="true"]:has-text("Vision")',
      );

      /* The type chosen sits on the joined option strip behind it. */
      const strip = '[class*="visionOptions"]';
      await expectReadable(page, `${strip} .astryx-selector > button`, strip);
    });

    test("the selected group in the semantic sidebar, and its count, read on theirs", async ({
      seededPage: page,
    }) => {
      const themes = await openTheme(page);
      await themes.getByRole("radio", { name: theme }).click();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Semantics" }).click();
      await expect(
        page.getByRole("region", { name: "Semantic tokens" }),
      ).toBeVisible({ timeout: 20_000 });

      const item = '[aria-label="Token groups"] [aria-current="true"]';
      await expectReadable(page, item);
      await expectReadable(
        page,
        `${item} [class*="count"]`,
        '[aria-current="true"]',
      );
    });
  });
}
