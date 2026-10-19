import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * The export dialog stays answerable. The handover archive and the accessibility
 * reports measure every pair of shades; they are made when chosen, behind a
 * loading state, and not with the dialog or on a format that does not need them.
 *
 * The page's CPU is slowed so that the work, a few milliseconds on a fast
 * machine, lasts long enough to be seen.
 */

async function slowDown(page: Page, rate = 6) {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate });
  return async () =>
    session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
}

const preview = (page: Page) =>
  page.getByRole("region", { name: "Export preview" });

/* The loading state, whichever format is being made. */
const pending = (page: Page) =>
  page.getByText(/^Generating (report|handover)…$/);

const openExport = async (page: Page) => {
  await page.getByRole("button", { name: "Export palette" }).click();
  await expect(
    page.getByRole("dialog", { name: "Export design system" }),
  ).toBeVisible();
};

test.describe("Making the heavy export formats", () => {
  test("shows a loading state for a report, then the report, and gates Download on it", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    const download = page.getByRole("button", { name: "Download" });
    await expect(download).toBeEnabled();

    const restore = await slowDown(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();
    await expect(page.getByText("Generating report…")).toBeVisible();
    await expect(download).toBeDisabled();
    await expect(preview(page)).toHaveAttribute("aria-busy", "true");

    await restore();
    await expect(pending(page)).toHaveCount(0);
    await expect(download).toBeEnabled();
    await expect(preview(page)).toContainText("Accessibility");
  });

  test("makes the handover archive only when it is chosen, and downloads it", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    /* The default format is a plain one: nothing is being made. */
    await expect(pending(page)).toHaveCount(0);

    const restore = await slowDown(page);
    await page.getByRole("button", { name: "Handover (.zip)" }).click();
    await expect(page.getByText("Generating handover…")).toBeVisible();
    await restore();
    await expect(pending(page)).toHaveCount(0);

    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const file = await downloaded;
    expect(file.suggestedFilename()).toMatch(/-handover\.zip$/);
    /* A zip starts with PK. */
    expect(
      readFileSync(await file.path())
        .subarray(0, 2)
        .toString(),
    ).toBe("PK");
  });

  test("can be closed, and left for a plain format, while one is on its way", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    const restore = await slowDown(page);

    await page.getByRole("button", { name: "Report (JSON)" }).click();
    await page.getByRole("button", { name: "CSS", exact: true }).click();
    await restore();
    await expect(pending(page)).toHaveCount(0);
    await expect(preview(page)).toContainText("--color-primary-50");

    await page.getByRole("button", { name: "Handover (.zip)" }).click();
    await page.getByRole("button", { name: "Close export" }).click();
    await expect(
      page.getByRole("dialog", { name: "Export design system" }),
    ).toBeHidden();
  });

  test("goes back to a format already made without making it again", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();
    await expect(pending(page)).toHaveCount(0);
    await page.getByRole("button", { name: "CSS", exact: true }).click();

    const restore = await slowDown(page);
    await page.getByRole("button", { name: "Report", exact: true }).click();
    /* Kept from the first time: no loading state, even with the page slowed. */
    await expect(pending(page)).toHaveCount(0);
    await restore();
  });
});
