import { readFileSync } from "node:fs";
import { expect, test, WORKSPACE_STORAGE_KEY } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * What a client is actually handed.
 *
 * See docs/roadmap/semantic-tokens.md. The alias rule is checked at the unit
 * level; this is about the file reaching the download with both layers in it,
 * which is where a client's install either works or does not.
 */

async function download(page: Page, format: string) {
  const preview = page.getByRole("region", { name: "Export preview" });
  if (!(await preview.isVisible())) {
    await page.getByRole("button", { name: "Export palette" }).click();
  }
  await page.getByRole("button", { name: format, exact: true }).click();
  await expect(preview).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const file = await downloadPromise;
  return readFileSync(await file.path(), "utf8");
}

test.describe("The design system export", () => {
  test("carries the primitives and the semantics in one CSS file", async ({
    seededPage: page,
  }) => {
    /* Two files that must be remembered together is how a client ends up with
       aliases pointing at variables nothing declares — which a browser drops
       in silence. */
    const css = await download(page, "CSS");

    expect(css).toMatch(/--color-primary-550:\s*#/);
    expect(css).toContain("--color-action-primary: var(--color-primary-");
    expect(css).toContain('[data-theme="dark"]');
  });

  test("emits Design Tokens with the alias resolvable in the same file", async ({
    seededPage: page,
  }) => {
    const tokens = JSON.parse(await download(page, "Design Tokens")) as {
      palette: Record<string, Record<string, unknown>>;
      semantic: {
        light: Record<string, Record<string, { $value: string }>>;
      };
    };

    const alias = tokens.semantic.light.action!.primary!.$value;
    const [, track, weight] = /^\{palette\.([a-z-]+)\.(\d+)\}$/.exec(alias)!;
    expect(tokens.palette[track!]![weight!]).toBeDefined();
  });

  test("reports the semantic pairs in both modes", async ({
    seededPage: page,
  }) => {
    const markdown = await download(page, "Report (Markdown)");

    expect(markdown).toContain("## Semantic tokens");
    expect(markdown).toContain("fg.primary");
    expect(markdown).toContain("surface.base");
    /* The resolved primitives, because a token id alone does not say which
       shade to go and change. */
    expect(markdown).toMatch(/neutral \d+ on neutral \d+/);
    expect(markdown).toMatch(/\|\s*light\s*\|/);
    expect(markdown).toMatch(/\|\s*dark\s*\|/);
  });
});

test.describe("The scales in the export", () => {
  test("carries spacing, radius and elevation beside the colours", async ({
    seededPage: page,
  }) => {
    /* One file. A semantic alias without its primitive, or a shadow without
       the spacing around it, is half a system. */
    const css = await download(page, "CSS");

    expect(css).toMatch(/--color-primary-550:\s*#/);
    expect(css).toContain("--color-action-primary: var(--color-primary-");
    expect(css).toContain("--spacing-4: 1rem;");
    expect(css).toContain("--radius-element: 8px;");
    expect(css).toMatch(/--shadow-low: .*rgba\(/);
  });

  test("writes spacing once and elevation per mode", async ({
    seededPage: page,
  }) => {
    /* Repeating spacing in a dark block would say it changes with the mode.
       Elevation's strength does. */
    const css = await download(page, "CSS");
    expect(css.match(/--spacing-4:/g)).toHaveLength(1);
    expect(css.match(/--shadow-low:/g)).toHaveLength(3);
  });

  test("gives a shadow a structured Design Tokens value", async ({
    seededPage: page,
  }) => {
    const tokens = JSON.parse(await download(page, "Design Tokens")) as {
      spacing: { $type: string };
      radius: { $type: string };
      shadow: {
        $type: string;
        light: Record<string, { $value: Array<{ color: string }> }>;
      };
    };

    expect(tokens.spacing.$type).toBe("dimension");
    expect(tokens.radius.$type).toBe("dimension");
    expect(tokens.shadow.$type).toBe("shadow");
    expect(tokens.shadow.light.low!.$value[0]!.color).toMatch(
      /^#[0-9a-f]{8}$/i,
    );
  });
});

test.describe("An alias with a transparency", () => {
  /**
   * Give one token an alpha, through storage.
   *
   * No UI sets one yet — that is stage 5 of the table plan — and this test is
   * about the export rather than about the editor. Written into the slice the
   * store already persisted and reloaded, so the app reads it the way it would
   * read a file somebody saved.
   */
  async function makeTransparent(page: Page): Promise<void> {
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) throw new Error("no workspace in storage");
      const stored = JSON.parse(raw) as {
        semantics?: Array<{
          id: string;
          light: Record<string, unknown>;
          dark: Record<string, unknown>;
        }>;
      };
      const token = stored.semantics?.find(
        (each) => each.id === "action.primary",
      );
      if (!token) throw new Error("no action.primary in storage");
      token.light.alpha = 0.5;
      token.dark.alpha = 0.5;
      window.localStorage.setItem(key, JSON.stringify(stored));
    }, WORKSPACE_STORAGE_KEY);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
  }

  /** The value of one custom property in the `:root` block of an export. */
  function declaration(css: string, name: string): string {
    const found = new RegExp(`${name}: (.+);`).exec(css);
    if (!found) throw new Error(`${name} is not in the export`);
    return found[1]!;
  }

  test("still points at the primitive after the primitive changes", async ({
    seededPage: page,
  }) => {
    /* The alias rule, with an alpha in the way. A transparency is the one
       place an exporter is tempted to resolve — a mix needs a colour, and the
       colour is right there — and the token would come out as a fixed shade
       that stops following the palette. */
    await makeTransparent(page);

    const before = await download(page, "CSS");
    const alias = declaration(before, "--color-action-primary");
    expect(alias).toMatch(
      /^color-mix\(in oklab, var\(--color-primary-\d+\) 50%, transparent\)$/,
    );

    const [, variable] = /var\((--color-primary-\d+)\)/.exec(alias)!;
    const primitiveBefore = declaration(before, variable!);

    /* The export is a modal, and it is still open. Everything behind it is
       inert until it closes, which reads in a trace as a button that is
       visible, enabled and never clickable. */
    const exportDialog = page.getByRole("dialog", { name: "Export palette" });
    await page.keyboard.press("Escape");
    await expect(exportDialog).toBeHidden();

    await page.getByRole("button", { name: "Overview" }).click();
    await page
      .getByRole("button", { name: "Choose primary source colour" })
      .click();
    const picker = page.getByRole("dialog", {
      name: "primary source colour picker",
    });
    const hex = picker.getByLabel("primary source colour HEX");
    await hex.fill("#0B7A3D");
    await hex.press("Enter");
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();

    const after = await download(page, "CSS");

    /* The same alias, character for character: which primitive and how much
       of it are both the token's, and neither is a colour. */
    expect(declaration(after, "--color-action-primary")).toBe(alias);
    /* And the primitive underneath it moved, which is what makes the
       assertion above worth making. */
    expect(declaration(after, variable!)).not.toBe(primitiveBefore);
  });

  test("updates the CSS export preview after an in-place alpha edit", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Semantics" }).click();
    const editor = page.getByRole("region", { name: "Semantic tokens" });
    await expect(editor).toBeVisible();
    await editor
      .getByRole("navigation", { name: "Token groups" })
      .getByRole("listitem")
      .filter({ hasText: "Borders" })
      .click();
    const alpha = editor.getByRole("textbox", {
      name: /border subtle light transparency/i,
    });
    await alpha.fill("65%");
    await alpha.press("Enter");

    await page.getByRole("button", { name: "Export palette" }).click();
    await page.getByRole("button", { name: "CSS", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Export preview" }),
    ).toContainText(
      /--color-border-subtle: color-mix\(in oklab, var\(--color-neutral-\d+\) 65%, transparent\)/,
    );
  });
});
