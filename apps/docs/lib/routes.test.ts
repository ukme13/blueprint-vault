import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS_ROUTES } from "@blueprint/ui/docs-routes";

/*
 * Every route has a page, and every page has a route.
 *
 * The navigation, the home page and the footer are all generated from the
 * route list, so a path with a typo in it is not a broken import — it is a
 * link in three places that 404s, and nothing else in this repository would
 * say so. The reverse matters too: a page nothing links to is a page nobody
 * reads and nobody deletes.
 *
 * On the file system rather than on Next's router, because what is being
 * checked is that two lists agree, and one of them is a directory tree.
 *
 * See docs/roadmap/studio-guide.md.
 */

const APP = resolve(__dirname, "..", "app");

/** Every route directory holding a `page.tsx`, as a path with `/` separators. */
async function routesOnDisk(directory = APP, base = APP): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const here = entries.some((entry) => entry.name === "page.tsx")
    ? [
        directory
          .slice(base.length + 1)
          .split("\\")
          .join("/"),
      ]
    : [];
  const below = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      /* `blueprint` is the generated export, not a route. Next's own
         conventions start with an underscore or a bracket. */
      .filter(
        (entry) =>
          entry.name !== "blueprint" &&
          !entry.name.startsWith("_") &&
          !entry.name.startsWith("("),
      )
      .map((entry) => routesOnDisk(join(directory, entry.name), base)),
  );
  return [...here, ...below.flat()];
}

describe("the route list and the app directory", () => {
  it("gives every declared route a page", async () => {
    const missing = DOCS_ROUTES.filter(
      (route) => !existsSync(join(APP, ...route.path.split("/"), "page.tsx")),
    ).map((route) => route.path);

    expect(missing, `declared with no page: ${missing.join(", ")}`).toEqual([]);
  });

  it("declares every page that is not the home page", async () => {
    /* The home page is the one route with no row: it is where the list is
       rendered, not an entry in it. */
    const declared = new Set(DOCS_ROUTES.map((route) => route.path));
    const undeclared = (await routesOnDisk())
      .filter((path) => path !== "")
      .filter((path) => !declared.has(path));

    expect(
      undeclared,
      `pages nothing links to: ${undeclared.join(", ")}`,
    ).toEqual([]);
  });

  it("puts every guide under the studio, marked internal", async () => {
    const guides = DOCS_ROUTES.filter((route) =>
      route.path.startsWith("studio/"),
    );

    expect(guides.length).toBeGreaterThan(0);
    for (const guide of guides) {
      expect(guide.group, guide.path).toBe("Studio");
      expect(guide.audience, guide.path).toBe("internal");
    }
  });
});
