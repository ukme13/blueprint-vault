import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import { unzipSync } from "fflate";

const require_ = createRequire(import.meta.url);
const blueprint = require_("@blueprint/ui") as typeof import("@blueprint/ui");
/* Its own entry point, because the routes a client never sees are kept out of
   the barrel — see packages/ui/src/docs-routes.ts. */
const routes = require_(
  "@blueprint/ui/docs-routes",
) as typeof import("@blueprint/ui/docs-routes");

/**
 * A handover archive, opened the way a client opens it.
 *
 * Unzipped into a folder nobody built in and loaded over `file://`, because
 * that is the only check that catches the thing most likely to be wrong: a
 * page that works perfectly on a dev server and cannot find its stylesheet
 * from a directory. Nothing here talks to localhost.
 *
 * Usage: tsx scripts/verify-handover.ts <handover.zip> [expected-hex]
 *
 * See docs/roadmap/foundations-handover.md.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const archive = resolve(
    process.argv[2] ?? join(ROOT, "handover", "handover.zip"),
  );
  /* A hex this archive must NOT contain, so running the script against a
     second workspace proves the pages followed it rather than merely built. */
  const absentHex = process.argv[3]?.toUpperCase();

  const into = mkdtempSync(join(tmpdir(), "blueprint-handover-"));
  const unzipped = unzipSync(new Uint8Array(readFileSync(archive)));
  for (const [name, bytes] of Object.entries(unzipped)) {
    const path = join(into, ...name.split("/"));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  console.log(`Unzipped ${Object.keys(unzipped).length} entries into ${into}`);

  /* Counted from the archive's own workspace, not written down here. The
     first version of this script hardcoded 72 semantic roles and found 116,
     because the semantic page carries the contrast table as well as the role
     tables — an expectation guessed from the data model rather than from the
     page. Derived, it cannot be wrong about either. */
  const project = blueprint.parseBlueprintWorkspace(
    Buffer.from(unzipped["workspace.blueprint.json"]!).toString("utf8"),
  );
  const palettes = project.palette
    ? blueprint.generatePalettes(project.palette)
    : [];
  const expectedRoles = blueprint
    .semanticRowGroups(project.semantics ?? [], palettes)
    .reduce((total, group) => total + group.rows.length, 0);
  const typeSystem = project.typography?.system;
  const expectedTypeRows = typeSystem
    ? blueprint
        .typeRoleRowGroups(typeSystem)
        .reduce((total, group) => total + group.rows.length, 0)
    : 0;

  /* The colour the page has to be showing, read out of the archive's own
     palette rather than typed here. */
  const primary =
    palettes.find((track) => track.id === "primary") ?? palettes[0];
  const expectedHex = primary?.shades
    .find((shade) => shade.weight === 500)
    ?.hex.toUpperCase();

  const browser = await chromium.launch();
  const failures: string[] = [];
  const check = (label: string, actual: unknown, expected: unknown) => {
    const ok = String(actual) === String(expected);
    console.log(
      `${ok ? "ok  " : "FAIL"} ${label}: ${actual} (want ${expected})`,
    );
    if (!ok) failures.push(label);
  };

  /* Nothing internal, anywhere in the bytes.

     The route allowlist decides which files are copied and cannot see inside
     the ones that are. Two doors it does not watch: the bundle keeps a chunk
     per route under `_next/static/chunks/app`, and the home page's rendered
     text travels in root payloads — `index.txt`, `__next._full.txt` — that
     ship whatever the allowlist says. The first of those was already shipping
     when it was found by building a throwaway route and looking.

     So this reads every entry as text and looks for the route names
     themselves, which catches a third door nobody has thought of. Against the
     archive rather than the build, because the archive is what a client is
     handed. */
  const internal = routes.INTERNAL_DOCS_ROUTES;

  if (internal.length === 0) {
    console.log("ok   no internal route in the archive: none are declared yet");
  } else {
    /* Path-shaped, plus the label. A bare path is too loose to search for —
       this workspace's own prose says "the studio's own preview template" and
       "open it in the Blueprint studio", and a check that failed on those
       would be turned off within a week. A label is distinctive enough to
       search for as it stands, and it is what actually leaked when this was
       first run: the route metadata reaching a shared bundle chunk while
       every page of it was correctly held back. */
    const needles = internal.flatMap((route) => [
      `/${route.path}`,
      `${route.path}/`,
      route.label,
    ]);
    const leaked: string[] = [];
    for (const [name, bytes] of Object.entries(unzipped)) {
      const text = Buffer.from(bytes).toString("utf8");
      for (const needle of needles) {
        if (text.includes(needle)) leaked.push(`${name} carries "${needle}"`);
      }
    }
    check(
      "no internal route appears in the archive",
      leaked.length === 0 ? "none" : leaked.slice(0, 5).join("; "),
      "none",
    );
  }

  for (const mode of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme: mode });
    /* The mode is stored under the key both apps share, which is also the only
       way to set it before first paint on a page with no server. */
    await context.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      ["blueprint.colour-mode.v1", mode],
    );
    const page = await context.newPage();
    const open = (route: string) =>
      page.goto(
        pathToFileURL(join(into, "pages", ...route.split("/"), "index.html"))
          .href,
        {
          waitUntil: "networkidle",
        },
      );

    await open("");
    check(`${mode} · home renders`, await page.locator("h1").count(), 1);

    await open("foundations/semantic");
    const roles = await page
      .locator('section[aria-labelledby^="group-"] tbody tr')
      .count();
    check(`${mode} · semantic roles`, roles, expectedRoles);

    await open("foundations/typography");
    const rows = await page
      .locator('section[aria-labelledby^="type-group-"] tbody tr')
      .count();
    check(`${mode} · typography role rows`, rows, expectedTypeRows);

    await open("foundations/colour");
    const body = await page.locator("body").innerText();
    if (expectedHex) {
      check(
        `${mode} · colour page shows ${expectedHex}`,
        body.includes(expectedHex),
        true,
      );
    }
    if (absentHex) {
      /* And not the workspace it was not built from. A page that shipped the
         fixture's palette would pass every count above it. */
      check(
        `${mode} · colour page does not show ${absentHex}`,
        body.includes(absentHex),
        false,
      );
    }

    /* Nothing may have tried to reach a server. */
    const failed: string[] = [];
    page.on("requestfailed", (request) => failed.push(request.url()));
    await open("foundations/colour");
    const offsite = failed.filter((url) => !url.startsWith("file:"));
    check(`${mode} · no failed non-file requests`, offsite.length, 0);

    await context.close();
  }

  await browser.close();
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nEvery check passed.");
}

void main();
