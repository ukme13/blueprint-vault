import { describe, expect, it } from "vitest";
import { seedWorkspaceProject } from "../workspace/seed-project";
import {
  buildHandoverFiles,
  HANDOVER_README,
  isHandoverPagePath,
  unexpectedHandoverPaths,
} from "./handover";

/*
 * What a client receives, and whether they can tell what it is.
 *
 * Two things worth guarding and they fail differently. A file the export
 * dialog offers but the archive omits is a client asking where their tokens
 * went. A file in the archive the README does not mention is worse and
 * quieter: an unexplained artefact that nobody notices until somebody installs
 * the wrong one.
 *
 * See docs/roadmap/foundations-handover.md.
 */

const options = { version: "0.0.0-test", exportedAt: "2026-09-06" };
const build = () => buildHandoverFiles(seedWorkspaceProject("Client"), options);

describe("the handover archive", () => {
  it("carries every file the export dialog already offers", () => {
    /* The dialog's six formats, by the name each lands under here. A seventh
       row added to that dialog and not to this list is the case this catches,
       and it is the likely one: the dialog is where somebody adds a format. */
    const paths = build().map((file) => file.path);

    expect(paths).toContain("blueprint.css");
    expect(paths).toContain("blueprint.tailwind.css");
    expect(paths).toContain("blueprint.tokens.json");
    expect(paths).toContain("workspace.blueprint.json");
    expect(paths).toContain("accessibility-report.md");
    expect(paths).toContain("accessibility-report.json");
    /* And the one the dialog does not offer, because typography's unit is a
       decision the dialog never asks for. */
    expect(paths).toContain("blueprint-typography.css");
  });

  it("writes something into every one of them", () => {
    for (const file of build()) {
      expect(file.contents.length, `${file.path} is empty`).toBeGreaterThan(0);
    }
  });

  it("names every file in the archive in the README", () => {
    const files = build();
    const readme = files.find((file) => file.path === HANDOVER_README)!;

    for (const file of files) {
      expect(
        readme.contents,
        `${file.path} is in the archive and not in the README`,
      ).toContain(file.path);
    }
  });

  it("says which file to install for each of the three ways to build", () => {
    const readme = build().find((file) => file.path === HANDOVER_README)!;

    /* Not merely that the names appear — the README has to answer the question
       a developer opens it with, which is "which one of these". */
    expect(readme.contents).toMatch(/plain CSS/);
    expect(readme.contents).toMatch(/Tailwind/);
    expect(readme.contents).toMatch(/Design Tokens|token pipeline/);
  });

  it("names the studio version, the date, and how the pages are made", () => {
    const readme = build().find((file) => file.path === HANDOVER_README)!;

    expect(readme.contents).toContain("0.0.0-test");
    expect(readme.contents).toContain("2026-09-06");
    expect(readme.contents).toContain("pnpm handover");
  });

  it("follows the caller's colour notation and type unit", () => {
    const hex = buildHandoverFiles(seedWorkspaceProject("Client"), options);
    const oklch = buildHandoverFiles(seedWorkspaceProject("Client"), {
      ...options,
      colourFormat: "oklch",
      typeScaleUnit: "rem",
    });

    const css = (files: typeof hex, path: string) =>
      files.find((file) => file.path === path)!.contents;

    expect(css(hex, "blueprint.css")).toContain("#");
    expect(css(oklch, "blueprint.css")).toContain("oklch(");
    expect(css(hex, "blueprint-typography.css")).toContain("px;");
    expect(css(oklch, "blueprint-typography.css")).toContain("rem;");
  });
});

describe("a workspace with only half a system", () => {
  it("leaves out the file it has nothing to write into", () => {
    /* A palette-only workspace is a real state — it is what the studio's own
       e2e fixture seeds — and `designSystemFiles` answers with a fixed-shape
       record, so typography comes back as an empty string. A zero-byte
       stylesheet in a client's archive is worse than no stylesheet: it is
       something to install that silently does nothing, listed in the README as
       though it worked. */
    const paletteOnly = { ...seedWorkspaceProject("Client"), typography: null };
    const files = buildHandoverFiles(paletteOnly, options);
    const paths = files.map((file) => file.path);

    expect(paths).not.toContain("blueprint-typography.css");
    expect(paths).toContain("blueprint.css");

    /* And the README does not offer them a file that is not there, which comes
       free from generating it out of the list. */
    const readme = files.find((file) => file.path === HANDOVER_README)!;
    expect(readme.contents).not.toContain("blueprint-typography.css");
  });
});

describe("what may be in the archive", () => {
  it("is the builder's files and the built pages, and nothing else", () => {
    const files = build();
    const written = [
      ...files.map((file) => file.path),
      "pages/index.html",
      "pages/foundations/colour/index.html",
      "pages/_next/static/css/app.css",
    ];

    expect(unexpectedHandoverPaths(written, files)).toEqual([]);
  });

  it("names a file that came from neither", () => {
    /* The case worth having: somebody copies a note into the output folder
       because it is quicker than adding it to the builder, and a client
       receives an artefact no README describes. */
    const files = build();
    const written = [
      ...files.map((file) => file.path),
      "pages/index.html",
      "NOTES.txt",
      "assets/logo.svg",
    ];

    expect(unexpectedHandoverPaths(written, files)).toEqual([
      "NOTES.txt",
      "assets/logo.svg",
    ]);
  });

  it("names a route the documentation grew and nobody declared", () => {
    /* The other direction, and the one this app is exposed to: apps/docs is
       built into the archive whole, so a page written for whoever operates
       the studio reaches the client who was handed the system. Nothing about
       adding a route to a Next app suggests that it does. */
    const files = build();
    const written = [
      ...files.map((file) => file.path),
      "pages/foundations/colour/index.html",
      "pages/studio/index.html",
      "pages/studio/guides/anchors/index.html",
    ];

    expect(unexpectedHandoverPaths(written, files)).toEqual([
      "pages/studio/index.html",
      "pages/studio/guides/anchors/index.html",
    ]);
  });
});

describe("isHandoverPagePath", () => {
  it("passes the routes a client is given", () => {
    for (const path of [
      "foundations/colour/index.html",
      "foundations/elevation/__next._tree.txt",
      "docs/button/index.html",
    ]) {
      expect(isHandoverPagePath(path), path).toBe(true);
    }
  });

  it("passes the shell every route needs to render", () => {
    /* The bundle and the two shapes of the 404. Without these the pages open
       from a folder unstyled, which is the one thing the archive promises. */
    for (const path of [
      "_next/static/css/app.css",
      "_not-found/index.html",
      "404/index.html",
    ]) {
      expect(isHandoverPagePath(path), path).toBe(true);
    }
  });

  it("passes a root-level file, which cannot be a route", () => {
    /* trailingSlash lands every route at <route>/index.html, so a file with
       no slash in it came from the app root or from public. */
    for (const path of ["index.html", "404.html", "favicon.ico", "icon.svg"]) {
      expect(isHandoverPagePath(path), path).toBe(true);
    }
  });

  it("refuses a route that is not on the list", () => {
    for (const path of [
      "studio/index.html",
      "studio/guides/export/index.html",
      "studio/whats-new/index.html",
    ]) {
      expect(isHandoverPagePath(path), path).toBe(false);
    }
  });

  it("refuses a sibling of an allowed route rather than a prefix match", () => {
    /* `docs/button` is allowed and `docs` is not, so the check has to be
       about path segments. A plain startsWith would pass `docs/buttonhole`
       and, worse, any future `docs/*` page nobody meant to ship. */
    expect(isHandoverPagePath("docs/buttonhole/index.html")).toBe(false);
    expect(isHandoverPagePath("docs/getting-started/index.html")).toBe(false);
    expect(isHandoverPagePath("foundationsx/colour/index.html")).toBe(false);
  });

  it("refuses an empty path rather than waving it through", () => {
    expect(isHandoverPagePath("")).toBe(false);
    expect(isHandoverPagePath("/")).toBe(false);
  });

  it("refuses a held-back route's compiled chunk, inside the shared bundle", () => {
    /* The one that was actually shipping. Holding a route's HTML back leaves
       its component in the bundle at a path that mirrors the route tree, with
       whatever prose the component holds inlined into it — so the guide was
       absent from the archive's pages and present in its JavaScript.

       Found by building a throwaway route and looking at the output, not by
       reading the rule. Nothing about "copy the allowed routes" suggests that
       `_next` is partly per-route. */
    expect(
      isHandoverPagePath("_next/static/chunks/app/studio/page-65e2d04c.js"),
    ).toBe(false);
    expect(
      isHandoverPagePath(
        "_next/static/chunks/app/studio/guides/export/page-1a2b3c4d.js",
      ),
    ).toBe(false);
  });

  it("keeps the chunks the allowed routes need", () => {
    for (const path of [
      "_next/static/chunks/app/foundations/colour/page-ff4a76e2.js",
      "_next/static/chunks/app/docs/button/layout-4a6a9d53.js",
      "_next/static/chunks/app/docs/button/page-fb53f044.js",
    ]) {
      expect(isHandoverPagePath(path), path).toBe(true);
    }
  });

  it("keeps the bundle's own entries, which belong to no route", () => {
    /* The root route's chunks sit directly under the directory, and Next's
       internals are named with a leading underscore. Dropping either leaves
       every page in the archive unstyled or broken, which is a worse failure
       than the one being guarded against. */
    for (const path of [
      "_next/static/chunks/app/layout-9f6b0665.js",
      "_next/static/chunks/app/page-ca879a08.js",
      "_next/static/chunks/app/_global-error/page-65e2d04c.js",
      "_next/static/chunks/app/_not-found/page-275ffd87.js",
      "_next/static/css/app.css",
      "_next/static/media/font.woff2",
    ]) {
      expect(isHandoverPagePath(path), path).toBe(true);
    }
  });
});
