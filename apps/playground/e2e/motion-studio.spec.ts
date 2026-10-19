import type { Page } from "@playwright/test";
import { expect, readStoredWorkspace, test } from "./fixtures";

/**
 * The Motion studio: real controls moving on the scale, and the Framer-style
 * settings that tune it. The rules behind the numbers are Vitest's; these are
 * the interactions, and the proof that Astryx's own controls read the scale.
 */

const stage = (page: Page) =>
  page.getByRole("region", { name: "Motion stage" });

async function openMotion(page: Page) {
  await page.goto("/motion");
  await expect(stage(page)).toBeVisible();
}

const stored = async (page: Page) =>
  (await readStoredWorkspace(page)).motion as {
    durations: Array<{ id: string; ms: number }>;
    easings: Array<{ id: string; curve: number[]; css: string }>;
  };

/** The dialog, which is drawn over the whole window and not in the stage. */
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Delete project" });

/** The centre of an element, to compare where things sit. */
const centreOf = async (locator: ReturnType<Page["locator"]>) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** The number field of a duration token: the steppers share its label. */
const durationField = (page: Page, name: string) =>
  page.getByRole("spinbutton", { name: `${name} duration in milliseconds` });

/** A custom property as the stage computes it. */
const stageVar = (page: Page, name: string) =>
  stage(page).evaluate(
    (node, property) => getComputedStyle(node).getPropertyValue(property),
    name,
  );

async function chooseOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("The Motion studio", () => {
  test("is on the rail, and opens on the stage and the settings", async ({
    seededPage: page,
  }) => {
    await page.getByRole("link", { name: "Motion" }).click();
    /* A development server compiles the route on the first visit. */
    await expect(page).toHaveURL(/\/motion\/?$/, { timeout: 60_000 });
    await expect(stage(page)).toBeVisible();
    await expect(page.getByRole("link", { name: "Motion" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("region", { name: "Duration" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Easing" })).toBeVisible();
  });

  test("shows a real button, switch, dropdown and dialog", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const inStage = stage(page);
    await expect(
      inStage.getByRole("button", { name: "Continue" }),
    ).toBeVisible();

    const toggle = inStage.getByRole("switch", { name: "Notifications" });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();

    const panel = inStage.locator('[class*="dropdownPanel"]');
    await expect(panel).not.toHaveAttribute("data-open", "true");
    await inStage.getByRole("button", { name: "Options" }).click();
    await expect(panel).toHaveAttribute("data-open", "true");

    await inStage.getByRole("button", { name: "Open dialog" }).click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await expect(dialog(page)).toBeHidden();
  });

  test("plays every moment again on Replay", async ({ seededPage: page }) => {
    await openMotion(page);
    const toggle = stage(page).getByRole("switch", { name: "Notifications" });
    await expect(toggle).not.toBeChecked();
    await page.getByRole("button", { name: "Replay" }).click();
    await expect(toggle).toBeChecked();
    /* Held for a moment, then let go. */
    await expect(toggle).not.toBeChecked({ timeout: 5_000 });
  });

  test("plays at 1x, 0.5x and 0.25x, which lengthen what the stage uses", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    /* Fast is 150ms, normal 250, moderate 350 in the default scale. */
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("150ms");
    await expect.poll(() => stageVar(page, "--duration-medium")).toBe("250ms");

    const speed = page.getByRole("radiogroup", { name: "Playback speed" });
    await speed.getByText("0.5x", { exact: true }).click();
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("300ms");
    await expect.poll(() => stageVar(page, "--duration-medium")).toBe("500ms");

    await speed.getByText("0.25x", { exact: true }).click();
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("600ms");

    await speed.getByText("1x", { exact: true }).click();
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("150ms");
  });

  test("changes a duration from the field, the stepper and the slider", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    await chooseOption(page, "Duration token", "Fast · 150ms");

    const field = durationField(page, "Fast");
    await field.fill("300");
    await field.press("Enter");
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(300);
    /* The stage uses it: Astryx's fast band is this token. */
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("300ms");

    /* A stepper moves it by 25. */
    await field.press("ArrowUp");
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(325);

    const slider = page.getByRole("slider", { name: "Fast duration" });
    await slider.focus();
    await slider.press("ArrowRight");
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(350);
  });

  test("moves Astryx's own controls with the token, not only the stage's", async ({
    seededPage: page,
  }) => {
    /* Astryx's controls honour reduced motion, which the suite runs with. */
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openMotion(page);
    await chooseOption(page, "Duration token", "Fast · 150ms");
    const field = durationField(page, "Fast");
    await field.fill("425");
    await field.press("Enter");
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("425ms");

    /* Something inside the stage that is not ours transitions for 0.425s: the
       switch or the buttons, reading the property the stage set. */
    await expect
      .poll(() =>
        stage(page).evaluate((node) =>
          [...node.querySelectorAll("*")].some(
            (element) =>
              !(element as HTMLElement).className
                .toString()
                .includes("pressTarget") &&
              getComputedStyle(element).transitionDuration.includes("0.425s"),
          ),
        ),
      )
      .toBe(true);
  });

  test("applies an easing preset, and names a curve that is none of them", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    await chooseOption(page, "Easing preset", "Ease Out");
    await expect
      .poll(async () => (await stored(page)).easings[0]!.curve)
      .toEqual([0, 0, 0.58, 1]);
    await expect(page.getByLabel("Bezier")).toHaveValue("0, 0, 0.58, 1");
    await expect
      .poll(() => stageVar(page, "--ease-standard"))
      .toBe("cubic-bezier(0, 0, 0.58, 1)");

    const bezier = page.getByLabel("Bezier");
    await bezier.fill("0.1, 0.2, 0.3, 0.4");
    await expect
      .poll(async () => (await stored(page)).easings[0]!.css)
      .toBe("cubic-bezier(0.1, 0.2, 0.3, 0.4)");
    await expect(
      page.getByLabel("Easing preset", { exact: true }),
    ).toContainText("Custom");
  });

  test("leaves a half-typed curve alone until it is four numbers", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const before = (await stored(page)).easings[0]!.css;
    const bezier = page.getByLabel("Bezier");
    await bezier.fill("0.4, 0, 0.5");
    await expect(bezier).toHaveValue("0.4, 0, 0.5");
    expect((await stored(page)).easings[0]!.css).toBe(before);
    await bezier.fill("0.4, 0, 0.5, 1");
    await expect
      .poll(async () => (await stored(page)).easings[0]!.css)
      .toBe("cubic-bezier(0.4, 0, 0.5, 1)");
  });

  test("reshapes the curve by dragging a handle, or with the arrow keys", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const handle = page.getByRole("slider", { name: "Standard handle 1" });
    await expect(handle).toBeVisible();
    const before = (await stored(page)).easings[0]!.curve;

    const box = (await handle.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y - 30, { steps: 5 });
    await page.mouse.up();
    const dragged = (await stored(page)).easings[0]!.curve;
    expect(dragged[0]).toBeGreaterThan(before[0]!);
    expect(dragged[1]).toBeGreaterThan(before[1]!);
    /* The other handle did not move. */
    expect(dragged.slice(2)).toEqual(before.slice(2));

    await handle.focus();
    await handle.press("ArrowRight");
    await expect
      .poll(async () => (await stored(page)).easings[0]!.curve[0])
      .toBeCloseTo(dragged[0]! + 0.01, 2);
    /* Shift is ten times as far. */
    await handle.press("Shift+ArrowUp");
    await expect
      .poll(async () => (await stored(page)).easings[0]!.curve[1])
      .toBeCloseTo(dragged[1]! + 0.1, 2);
  });

  test("keeps a handle's x inside 0 to 1, which is what CSS accepts", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const handle = page.getByRole("slider", { name: "Standard handle 2" });
    const box = (await handle.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 400, from.y, { steps: 4 });
    await page.mouse.up();
    expect((await stored(page)).easings[0]!.curve[2]).toBe(1);
  });

  test("runs the live preview by itself, on the curve being edited", async ({
    seededPage: page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openMotion(page);
    const track = page.getByRole("button", { name: /Live preview/ });
    await expect(track).toBeVisible();
    /* It crosses to the far end and comes back, on its own. */
    await expect(track).toHaveAttribute("data-at-end", "true");
    await expect(track).not.toHaveAttribute("data-at-end", "true", {
      timeout: 5_000,
    });
    const curve = await track
      .locator("span")
      .evaluate((node) => getComputedStyle(node).transitionTimingFunction);
    expect(curve).toContain("cubic-bezier(0.2, 0, 0, 1)");
  });

  test("plays the live preview when it is pressed, if the system asks for less motion", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const track = page.getByRole("button", { name: /Live preview/ });
    await page.waitForTimeout(1_000);
    /* It does not run on its own. */
    await expect(track).not.toHaveAttribute("data-at-end", "true");
    await track.click();
    await expect(track).toHaveAttribute("data-at-end", "true");
    await track.click();
    await expect(track).not.toHaveAttribute("data-at-end", "true");
    await expect(
      page.getByText(/Your system asks for reduced motion/),
    ).toBeVisible();
  });

  test("is one step in the history for a whole drag, and is undone from the toolbar", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const before = (await stored(page)).easings[0]!.curve;
    const handle = page.getByRole("slider", { name: "Standard handle 1" });
    const box = (await handle.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y - 20, { steps: 6 });
    await page.mouse.up();
    expect((await stored(page)).easings[0]!.curve).not.toEqual(before);

    const toolbar = page.getByRole("region", { name: "Motion toolbar" });
    await toolbar.getByRole("button", { name: "Undo" }).click();
    await expect
      .poll(async () => (await stored(page)).easings[0]!.curve)
      .toEqual(before);
    await toolbar.getByRole("button", { name: "Redo" }).click();
    await expect
      .poll(async () => (await stored(page)).easings[0]!.curve)
      .not.toEqual(before);
  });

  test("is taken back from another studio, which goes to Motion to show it", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    await chooseOption(page, "Duration token", "Fast · 150ms");
    const field = durationField(page, "Fast");
    await field.fill("275");
    await field.press("Enter");
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(275);

    await page.getByRole("link", { name: "Spacing" }).click();
    await expect(page).toHaveURL(/\/spacing/);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page).toHaveURL(/\/motion\/?$/);
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(150);
  });

  test("selects the token a moment plays from its name on the stage", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    await stage(page)
      .getByRole("button", { name: /Dialog plays Moderate, 350 milliseconds/ })
      .click();
    await expect(durationField(page, "Moderate")).toHaveValue("350");
  });

  test("exports its tokens, in CSS and Tailwind", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    await chooseOption(page, "Duration token", "Fast · 150ms");
    const field = durationField(page, "Fast");
    await field.fill("200");
    await field.press("Enter");
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(200);

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview).toContainText("--duration-fast: 200ms;");
    await expect(preview).toContainText(
      "--ease-standard: cubic-bezier(0.2, 0, 0, 1);",
    );
    await page.getByRole("button", { name: "Tailwind CSS" }).click();
    await expect(preview).toContainText("@utility duration-fast {");
  });

  test("opens its settings as a sheet on a phone", async ({
    seededPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openMotion(page);
    await expect(page.getByRole("region", { name: "Duration" })).toHaveCount(0);
    await page.getByRole("button", { name: "Motion settings" }).click();
    await expect(page.getByRole("region", { name: "Duration" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Easing" })).toBeVisible();
  });

  test("raises no console error or warning through its controls", async ({
    seededPage: page,
  }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        problems.push(message.text());
      }
    });
    page.on("pageerror", (error) => problems.push(error.message));

    await openMotion(page);
    await chooseOption(page, "Duration token", "Normal · 250ms");
    await durationField(page, "Normal").fill("300");
    await chooseOption(page, "Easing preset", "Ease In");
    await page.getByLabel("Bezier").fill("0.3, 0.1, 0.6, 0.9");
    const handle = page.getByRole("slider", { name: "Standard handle 1" });
    await handle.focus();
    await handle.press("ArrowLeft");
    await page.getByRole("button", { name: "Replay" }).click();
    await stage(page).getByRole("button", { name: "Options" }).click();
    await stage(page).getByRole("button", { name: "Open dialog" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Export preview" }),
    ).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("centres each moment in its card", async ({ seededPage: page }) => {
    await openMotion(page);
    const cards = stage(page).locator("article");
    await expect(cards).toHaveCount(4);
    for (let at = 0; at < 4; at += 1) {
      const body = cards.nth(at).locator('[class*="demoBody"]');
      const content = body.locator("> *").first();
      const box = await centreOf(body);
      const inner = await centreOf(content);
      expect(Math.abs(box.x - inner.x), `card ${at} across`).toBeLessThan(2);
      expect(Math.abs(box.y - inner.y), `card ${at} down`).toBeLessThan(2);
    }
    await expect(stage(page).locator('[class*="demoBody"]').first()).toHaveCSS(
      "text-align",
      "center",
    );
  });

  test("opens the dropdown over the card, without moving its trigger", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const trigger = stage(page).getByRole("button", { name: "Options" });
    const panel = stage(page).locator('[class*="dropdownPanel"]');
    const before = await trigger.boundingBox();

    /* Closed, it is out of reach as well as out of sight. */
    await expect(panel).toHaveAttribute("inert", "");
    await trigger.click();
    await expect(panel).toHaveAttribute("data-open", "true");
    await expect(panel).not.toHaveAttribute("inert");
    await expect(panel.getByRole("button", { name: "Rename" })).toBeVisible();

    expect(await trigger.boundingBox()).toEqual(before);
    /* Hung under the trigger, level with it across. */
    const panelBox = (await panel.boundingBox())!;
    expect(panelBox.y).toBeGreaterThan(before!.y + before!.height);
    expect(
      Math.abs(
        panelBox.x + panelBox.width / 2 - (before!.x + before!.width / 2),
      ),
    ).toBeLessThan(2);

    /* Nothing between the card's shadow and the page clips it. */
    const clipped = await panel.evaluate((node) => {
      /* Up to the stage, which scrolls and is where the panel is allowed to end. */
      for (let at: Element | null = node; at; at = at.parentElement) {
        if (at.matches('[class*="stage"]')) return null;
        if (getComputedStyle(at).overflow !== "visible") {
          return at.className.toString();
        }
      }
      return null;
    });
    expect(clipped).toBeNull();

    await trigger.click();
    await expect(panel).not.toHaveAttribute("data-open");
    expect(await trigger.boundingBox()).toEqual(before);
  });

  test("lists the dropdown's items from the left, Reset among them", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    await stage(page).getByRole("button", { name: "Options" }).click();
    const panel = stage(page).locator('[class*="dropdownPanel"]');
    const items = panel.getByRole("button");
    await expect(items).toHaveText(["Rename", "Duplicate", "Archive", "Reset"]);

    const widths: number[] = [];
    const lefts: number[] = [];
    for (let at = 0; at < 4; at += 1) {
      const item = items.nth(at);
      await expect(item).toHaveCSS("justify-content", "flex-start");
      await expect(item).toHaveCSS("text-align", "left");
      const measured = await item.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(node);
        /* Where the words start, from the row's own left edge. */
        const text = [...range.getClientRects()]
          .filter((rect) => rect.width > 0)
          .reduce((left, rect) => Math.min(left, rect.left), Infinity);
        return { width: box.width, textOffset: text - box.left };
      });
      widths.push(measured.width);
      lefts.push(measured.textOffset);
    }
    /* Every row is as wide as the menu, and its words start at the same inset. */
    expect(new Set(widths.map(Math.round)).size).toBe(1);
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(1);
    expect(Math.max(...lefts)).toBeLessThan(20);
  });

  test("opens the dialog as a modal over the whole window", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const opener = stage(page).getByRole("button", { name: "Open dialog" });
    await expect(dialog(page)).toBeHidden();
    await opener.click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveAttribute("aria-modal", "true");

    const viewport = page.viewportSize()!;
    const scrim = page.locator('[class*="scrim"]');
    const scrimBox = (await scrim.boundingBox())!;
    expect(scrimBox).toMatchObject({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
    await expect(scrim).toHaveCSS("position", "fixed");
    await expect(scrim).toHaveCSS("z-index", "1000");

    /* The panel is in the middle of the window, not of the card. */
    const panel = await centreOf(dialog(page));
    expect(Math.abs(panel.x - viewport.width / 2)).toBeLessThan(2);
    expect(Math.abs(panel.y - viewport.height / 2)).toBeLessThan(2);
  });

  test("carries the stage's scale into the dialog, which is outside the stage", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const scrim = page.locator('[class*="scrim"]');
    const inScrim = (name: string) =>
      scrim.evaluate(
        (node, property) => getComputedStyle(node).getPropertyValue(property),
        name,
      );
    /* Moderate is 350ms, which the dialog plays; and the curve is the standard. */
    await expect.poll(() => inScrim("--duration-slow")).toBe("350ms");
    await expect
      .poll(() => inScrim("--ease-standard"))
      .toBe("cubic-bezier(0.2, 0, 0, 1)");

    await page
      .getByRole("radiogroup", { name: "Playback speed" })
      .getByText("0.5x", { exact: true })
      .click();
    await expect.poll(() => inScrim("--duration-slow")).toBe("700ms");

    await chooseOption(page, "Easing preset", "Ease Out");
    await expect
      .poll(() => inScrim("--ease-standard"))
      .toBe("cubic-bezier(0, 0, 0.58, 1)");
  });

  test("closes the dialog from the scrim, Close, Delete or Escape, and gives focus back", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const opener = stage(page).getByRole("button", { name: "Open dialog" });
    const scrim = page.locator('[class*="scrim"]');

    await opener.click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dialog(page)).toBeVisible();
    /* A press on the scrim, away from the panel. */
    await scrim.click({ position: { x: 8, y: 8 } });
    await expect(dialog(page)).toBeHidden();

    await opener.click();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toBeHidden();

    await opener.click();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await expect(dialog(page)).toBeHidden();

    /* A press on the panel itself is not a press on the scrim. */
    await opener.click();
    await dialog(page).locator("strong").click();
    await expect(dialog(page)).toBeVisible();
  });

  test("resets the scale in one step, and only offers to when it has changed", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const toolbar = page.getByRole("region", { name: "Motion toolbar" });
    const reset = toolbar.getByRole("button", { name: "Reset", exact: true });
    const original = await stored(page);
    await expect(reset).toBeDisabled();

    /* A duration and a curve changed: two edits. */
    await chooseOption(page, "Duration token", "Fast · 150ms");
    const field = durationField(page, "Fast");
    await field.fill("300");
    await field.press("Enter");
    await chooseOption(page, "Easing preset", "Ease Out");
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(300);
    const edited = await stored(page);
    expect(edited.easings[0]!.curve).toEqual([0, 0, 0.58, 1]);
    await expect(reset).toBeEnabled();

    await reset.click();
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(150);
    const after = await stored(page);
    expect(after.durations).toEqual(original.durations);
    expect(after.easings).toEqual(original.easings);
    await expect(reset).toBeDisabled();
    await expect.poll(() => stageVar(page, "--duration-fast")).toBe("150ms");

    /* One step: a single undo gives back both edits. */
    await toolbar.getByRole("button", { name: "Undo" }).click();
    await expect
      .poll(async () => (await stored(page)).durations[1]!.ms)
      .toBe(300);
    expect((await stored(page)).easings[0]!.curve).toEqual([0, 0, 0.58, 1]);
    await expect(reset).toBeEnabled();
  });

  test("is not offered again once an edit is put back by hand", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const reset = page
      .getByRole("region", { name: "Motion toolbar" })
      .getByRole("button", { name: "Reset", exact: true });
    await chooseOption(page, "Duration token", "Fast · 150ms");
    const field = durationField(page, "Fast");
    await field.fill("200");
    await field.press("Enter");
    await expect(reset).toBeEnabled();
    await field.fill("150");
    await field.press("Enter");
    await expect(reset).toBeDisabled();
  });

  test("holds a handle to its guide while Shift is down", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const drag = async (
      name: string,
      dx: number,
      dy: number,
      shift: boolean,
    ) => {
      const handle = page.getByRole("slider", { name });
      const box = (await handle.boundingBox())!;
      const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      if (shift) await page.keyboard.down("Shift");
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 6 });
      if (shift) await page.keyboard.up("Shift");
      await page.mouse.up();
    };

    /* The first handle pulled up and across: y stays on the foot, x moves. */
    const start = (await stored(page)).easings[0]!.curve;
    await drag("Standard handle 1", 50, -60, true);
    const first = (await stored(page)).easings[0]!.curve;
    expect(first[1]).toBe(0);
    expect(first[0]).toBeGreaterThan(start[0]!);
    expect(first.slice(2)).toEqual(start.slice(2));

    /* The second handle pulled down and across: y stays on the top, x moves. */
    await drag("Standard handle 2", 50, 60, true);
    const second = (await stored(page)).easings[0]!.curve;
    expect(second[3]).toBe(1);
    expect(second[2]).toBeGreaterThan(first[2]!);
    expect(second.slice(0, 2)).toEqual(first.slice(0, 2));
  });

  test("moves a handle freely again without Shift", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const handle = page.getByRole("slider", { name: "Standard handle 1" });
    const box = (await handle.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y - 60, { steps: 6 });
    await page.mouse.up();
    expect((await stored(page)).easings[0]!.curve[1]).toBeGreaterThan(0.1);
  });

  test("leaves the dialog shut on Replay, and plays the rest", async ({
    seededPage: page,
  }) => {
    await openMotion(page);
    const toggle = stage(page).getByRole("switch", { name: "Notifications" });
    /* Watched from before Replay: a dialog that opened and closed again while
       it played would pass a check made only at the end. */
    await page.evaluate(() => {
      const scrim = document.querySelector('[class*="scrim"]')!;
      const seen = window as unknown as { __dialogOpened: boolean };
      seen.__dialogOpened = false;
      new MutationObserver(() => {
        if (scrim.hasAttribute("data-open")) seen.__dialogOpened = true;
      }).observe(scrim, { attributes: true, attributeFilter: ["data-open"] });
    });

    await page.getByRole("button", { name: "Replay" }).click();
    /* The inline controls play... */
    await expect(toggle).toBeChecked();
    await expect(
      stage(page).locator('[class*="dropdownPanel"]'),
    ).toHaveAttribute("data-open", "true");
    /* ...held, and let go. */
    await expect(toggle).not.toBeChecked({ timeout: 5_000 });
    await expect(dialog(page)).toBeHidden();
    expect(
      await page.evaluate(
        () => (window as unknown as { __dialogOpened: boolean }).__dialogOpened,
      ),
    ).toBe(false);

    /* It opens when it is asked to. */
    await stage(page).getByRole("button", { name: "Open dialog" }).click();
    await expect(dialog(page)).toBeVisible();
  });
});
