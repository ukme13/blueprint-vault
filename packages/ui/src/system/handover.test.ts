import { describe, expect, it } from "vitest";
import { seedWorkspaceProject } from "../workspace/seed-project";
import { buildHandoverFiles, HANDOVER_README } from "./handover";

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
