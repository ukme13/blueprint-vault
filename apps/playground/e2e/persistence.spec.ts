import {
  PROJECT_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  expect,
  test,
} from "./fixtures";

test.describe("Persistence after reload", () => {
  test("shade count and pattern changes survive a reload", async ({
    seededPage: page,
  }) => {
    const shadeCountInput = page.getByLabel("Shade count", { exact: true });
    await shadeCountInput.fill("12");
    await shadeCountInput.blur();
    await expect(shadeCountInput).toHaveValue("12");

    await page.reload();

    await expect(page.getByLabel("Shade count", { exact: true })).toHaveValue(
      "12",
    );
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(12);
  });

  test("an edited lightness percentage survives a reload", async ({
    seededPage: page,
  }) => {
    const input = page.getByLabel("500 lightness percent", { exact: true });
    await input.fill("48");
    await input.blur();
    await expect(input).toHaveValue("48");

    await page.reload();

    await expect(
      page.getByLabel("500 lightness percent", { exact: true }),
    ).toHaveValue("48");
  });

  test("a renamed colour track survives a reload", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("button", { name: "Open primary colour details" })
      .press("Enter");
    const colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await colourDialog.getByLabel("Colour name").fill("brand");
    await colourDialog.getByRole("button", { name: "Save changes" }).click();

    await page.reload();

    await expect(
      page.getByRole("button", { name: "Open brand colour details" }),
    ).toBeVisible();
  });

  test("stores the project in the workspace, migrated off the old key", async ({
    seededPage: page,
  }) => {
    /* The fixture seeds the legacy key, so asserting against that one would
       pass on the seed alone and stop testing the app entirely. The workspace
       key is where the studio now writes. */
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      WORKSPACE_STORAGE_KEY,
    );

    expect(stored).not.toBeNull();
    const workspace = JSON.parse(stored!);
    /* The name is the workspace's, and the palette slice does not keep a
       second copy of it — the migration reads one off the legacy blob and
       does not write it back down. */
    expect(workspace.name).toBe("My colour system");
    expect(workspace.palette).not.toHaveProperty("name");
    expect(workspace.palette.lightnessValues).toHaveLength(20);

    /* And the key it was migrated from is gone. It was kept so a bad
       migration could be recovered by clearing one key; a project file does
       that better now, and what these keys hold is a snapshot from the
       migration that carries none of the slices a workspace has grown since.

       Dropped only once the workspace reads back on its own, which by this
       point it does. */
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          PROJECT_STORAGE_KEY,
        ),
      )
      .toBeNull();
  });
});
