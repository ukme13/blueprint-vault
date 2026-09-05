import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

/* Required rather than imported, and the type comes from the import.
   `@blueprint/ui` declares no `"type": "module"`, so outside a bundler it is
   CommonJS; apps/docs declares one, so this script is ESM. Across that edge
   Node has to guess the named exports by lexing, and it cannot follow the
   `export *` chain from the entry through `workspace/index.ts` to the file a
   name lives in — `import { x }` fails to link, and a namespace import binds
   an object with nothing on it but `default`. `createRequire` asks for the
   module the way the module is written. The apps import from the entry
   normally; a bundler reads the source and has no guessing to do. */
const blueprint = createRequire(import.meta.url)(
  "@blueprint/ui",
) as typeof import("@blueprint/ui");

/**
 * Write the reference workspace the docs app is built from.
 *
 * Run once, by hand — `pnpm --filter docs seed:blueprint`. It is deliberately
 * not part of the build, because the file it writes is a fixture somebody may
 * replace: the intended end state is a real project saved out of the studio,
 * and a script wired into `prebuild` would overwrite that on the next build.
 * What runs on every build is `generate-blueprint.ts`, which only reads it.
 *
 * So nothing may depend on the values in here. The docs app reads whatever
 * workspace the file holds; the generator regenerates the CSS from it; the
 * guard test compares the two. Swap the file and every one of those still
 * holds. See docs/roadmap/foundations-handover.md.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, "..", "blueprint", "reference.workspace.json");

/* The name a reader sees on the page, not a placeholder. */
const NAME = "Blueprint reference";

function main(): void {
  const project = blueprint.seedWorkspaceProject(NAME);
  const file = blueprint.formatBlueprintWorkspace(project);

  /* Round-tripped before it is written. `formatBlueprintWorkspace` stamps the
     version and `parseBlueprintWorkspace` checks it, so a file that will not
     load is caught here rather than at the docs app's next build — and the
     version is read back out of the parsed file rather than asserted against
     a constant this script could hold a stale copy of. */
  const roundTripped = blueprint.parseBlueprintWorkspace(file);
  if (roundTripped.name !== NAME) {
    throw new Error(
      `The written workspace came back named ${roundTripped.name}.`,
    );
  }
  const written = (JSON.parse(file) as { version: number }).version;
  if (written !== blueprint.BLUEPRINT_WORKSPACE_FILE_VERSION) {
    throw new Error(
      `Wrote file version ${written}, expected ${blueprint.BLUEPRINT_WORKSPACE_FILE_VERSION}.`,
    );
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${file}\n`, "utf8");
  console.log(
    `Wrote ${join("apps", "docs", "blueprint", "reference.workspace.json")} at file version ${written}.`,
  );
}

main();
