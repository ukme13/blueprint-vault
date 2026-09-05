import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* Required rather than imported, and the type comes from the import.
   `@blueprint/ui` declares no `"type": "module"`, so outside a bundler it is
   CommonJS; apps/docs declares one, so this script is ESM. Across that edge
   Node has to guess the named exports by lexing, and it cannot follow the
   `export *` chain from the entry through `system/index.ts` to the file a name
   lives in — `import { x }` fails to link, and a namespace import binds an
   object carrying nothing but `default`. `createRequire` asks for the module
   the way the module is written. The app's own code imports from the entry
   normally; a bundler reads the source and has no guessing to do. */
const blueprint = createRequire(import.meta.url)(
  "@blueprint/ui",
) as typeof import("@blueprint/ui");

/**
 * Write the docs app's stylesheets from the reference workspace.
 *
 * The docs app is the first client of the export. It does not import the
 * studio's `theme.css`: it installs the same files a client's developer would,
 * generated here from a workspace checked into the repository. If the export
 * is ever missing an alias, or emits a shadow as a literal, this app is the
 * first thing to break — which is the point of it.
 *
 * All this script does is choose the workspace, choose the unit, and write
 * bytes. What the files contain is `designSystemFiles` in @blueprint/ui, so
 * the test that guards the committed output runs the same rule the build runs
 * rather than a second copy of it.
 *
 * Wired as `prebuild`, so `next build` cannot start without it.
 *
 * See docs/roadmap/foundations-handover.md.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, "..");
const REFERENCE = join(APP, "blueprint", "reference.workspace.json");
const OUT = join(APP, "app", "blueprint");

function main(): void {
  const files = blueprint.designSystemFilesFromWorkspaceFile(
    readFileSync(REFERENCE, "utf8"),
    /* px, because this app renders specimens at the sizes the scale names and
       has no reason to follow a reader's browser setting. A client picks
       differently; that is what the option is for. */
    { typeScaleUnit: "px" },
  );

  mkdirSync(OUT, { recursive: true });
  for (const name of blueprint.DESIGN_SYSTEM_FILE_NAMES) {
    writeFileSync(join(OUT, name), files[name], "utf8");
  }
  console.log(
    `Wrote ${blueprint.DESIGN_SYSTEM_FILE_NAMES.length} files to app/blueprint.`,
  );
}

main();
