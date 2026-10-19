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

test.describe("A long export", () => {
  const reportButton = (page: Page, name: "Report" | "Report (JSON)") =>
    page.getByRole("button", { name, exact: true });

  test("draws the start of a report, says so, and downloads all of it", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    await reportButton(page, "Report (JSON)").click();

    await expect(preview(page)).toContainText(
      /Preview shows the first 500 of [\d,]+ lines\./,
    );
    await expect(preview(page)).toContainText("The download has all of it.");
    /* What is in the page is a small part of the megabyte the file holds. */
    const drawn = await preview(page).evaluate(
      (node) => node.textContent!.length,
    );
    expect(drawn).toBeLessThan(100_000);

    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const text = readFileSync(await (await downloaded).path(), "utf8");
    expect(text.split("\n").length).toBeGreaterThan(5_000);
    expect(text.length).toBeGreaterThan(drawn * 5);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  test("copies all of a long export from the code block's copy button", async ({
    seededPage: page,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await openExport(page);
    await reportButton(page, "Report (JSON)").click();
    await expect(preview(page)).toContainText("The download has all of it.");

    await preview(page).getByRole("button", { name: /copy/i }).click();
    /* The block copied what it draws; the clipboard is then given the rest. */
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => navigator.clipboard.readText())).split(
            "\n",
          ).length,
      )
      .toBeGreaterThan(5_000);

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const file = readFileSync(await (await downloaded).path(), "utf8");
    /* The clipboard may hold the platform's line endings; the text is the same. */
    expect(copied.replace(/\r\n/g, "\n")).toBe(file);
  });

  test("keeps the page responsive while Markdown and JSON are switched between", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    await page.evaluate(() => {
      const longest: number[] = [];
      (window as unknown as { __longTasks: number[] }).__longTasks = longest;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longest.push(entry.duration);
      }).observe({ entryTypes: ["longtask"] });
    });

    for (let round = 0; round < 4; round += 1) {
      await reportButton(page, "Report (JSON)").click();
      await expect(preview(page)).toContainText("The download has all of it.");
      await reportButton(page, "Report").click();
      await expect(preview(page)).toContainText("Accessibility");
    }

    const tasks = await page.evaluate(
      () => (window as unknown as { __longTasks: number[] }).__longTasks,
    );
    /* A frozen page is a task of seconds; the cost of a switch is a fraction of
       one. */
    expect(Math.max(0, ...tasks)).toBeLessThan(500);

    /* And it still answers. */
    await page.getByRole("button", { name: "Close export" }).click();
    await expect(
      page.getByRole("dialog", { name: "Export design system" }),
    ).toBeHidden();
  });

  test("is made in a worker", async ({ seededPage: page }) => {
    const urls: string[] = [];
    page.on("worker", (worker) => urls.push(worker.url()));
    await openExport(page);
    expect(urls).toHaveLength(0);

    await reportButton(page, "Report (JSON)").click();
    await expect(preview(page)).toContainText("The download has all of it.");
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/\/_next\/static\/chunks\/.+\.js$/);
  });

  test("carries the studio's version when made in the worker", async ({
    seededPage: page,
  }) => {
    await openExport(page);
    await page.getByRole("button", { name: "Handover (.zip)" }).click();
    /* The README the archive opens with; the version is replaced into the
       worker's bundle as it is the page's. */
    await expect(preview(page)).toContainText(
      /Exported from Blueprint \d+\.\d+\.\d+ on /,
    );
  });

  test("is still made where a worker cannot be had", async ({
    seededPage: page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "Worker", { value: undefined });
    });
    await page.reload();
    await openExport(page);
    await reportButton(page, "Report (JSON)").click();
    await expect(preview(page)).toContainText("The download has all of it.");
    await expect(pending(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download" })).toBeEnabled();
  });
});
