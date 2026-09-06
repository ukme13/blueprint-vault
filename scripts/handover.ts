import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync, strToU8 } from "fflate";

/* Required rather than imported: `@blueprint/ui` is CommonJS and this script is
   ESM, and across that edge Node lexes for named exports and cannot follow the
   `export *` chain. The same reason `generate-blueprint.ts` does it. */
const blueprint = createRequire(import.meta.url)(
  "@blueprint/ui",
) as typeof import("@blueprint/ui");

/**
 * A whole handover: the files a browser can make, plus the pages it cannot.
 *
 * The export dialog produces everything up to the archive — stylesheets, the
 * workspace, the report, the README — because all of it is a pure function of
 * the project and a browser can run pure functions. The foundation pages are a
 * Next build, which a browser cannot run, so they are made here and the two
 * halves are zipped together.
 *
 * That split is the answer to the plan's open question. The documentation is
 * build-time with a parameter rather than a runtime tool: point this at a
 * client's workspace file and the same eight pages describe their system.
 *
 * Usage: pnpm handover <workspace.json> [--out dir]
 *
 * See docs/roadmap/foundations-handover.md.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DOCS = join(ROOT, "apps", "docs");

interface Args {
  workspace: string;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const rest = [...argv];
  let out = join(ROOT, "handover");
  const outAt = rest.indexOf("--out");
  if (outAt !== -1) {
    const value = rest[outAt + 1];
    if (!value) throw new Error("--out needs a directory.");
    out = resolve(value);
    rest.splice(outAt, 2);
  }
  const workspace = rest[0]
    ? resolve(rest[0])
    : join(DOCS, "blueprint", "reference.workspace.json");
  if (!existsSync(workspace)) {
    throw new Error(`No workspace file at ${workspace}`);
  }
  return { workspace, out };
}

/** Every file under a directory, as paths relative to it, with `/` separators. */
function filesUnder(directory: string, base = directory): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? filesUnder(path, base)
      : [relative(base, path).split(sep).join("/")];
  });
}

/**
 * Absolute URLs made relative, per file, by how deep it sits.
 *
 * A handover is opened from a folder rather than served, so `/_next/app.css`
 * resolves against the filesystem root and finds nothing. Next has no option
 * for this — `assetPrefix` is one string for every page, and a page two
 * directories down needs a different prefix from the one at the top — so the
 * rewrite is done here, where the depth of each file is known.
 *
 * Only in `href`, `src` and `url()`, so a `/` inside prose or JSON is left
 * alone. `trailingSlash` is what makes the depth predictable: every route is
 * `dir/index.html`, so the prefix is one `../` per directory.
 */
function relativise(html: string, depth: number): string {
  const prefix = depth === 0 ? "./" : "../".repeat(depth);
  return html
    .replace(/(href|src)="\/(?!\/)/g, `$1="${prefix}`)
    .replace(/url\(\/(?!\/)/g, `url(${prefix}`);
}

function main(): void {
  const { workspace, out } = parseArgs(process.argv.slice(2));
  const source = readFileSync(workspace, "utf8");
  const project = blueprint.parseBlueprintWorkspace(source);

  console.log(`Workspace: ${workspace}`);
  console.log(`Output:    ${out}`);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  /* The browser half, from the same function the export dialog calls. */
  const files = blueprint.buildHandoverFiles(project, {
    version: JSON.parse(
      readFileSync(join(ROOT, "apps", "playground", "package.json"), "utf8"),
    ).version as string,
    exportedAt: new Date().toISOString().slice(0, 10),
  });
  for (const file of files) {
    writeFileSync(join(out, file.path), file.contents, "utf8");
  }

  /* The pages. `prebuild` regenerates the stylesheets from the same variable,
     so the tokens the pages install describe the workspace they document. */
  console.log("Building the foundation pages…");
  execFileSync("pnpm", ["--filter", "docs", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      BLUEPRINT_WORKSPACE: workspace,
      BLUEPRINT_STATIC: "1",
    },
    shell: process.platform === "win32",
  });

  const built = join(DOCS, "out");
  if (!existsSync(built)) throw new Error("The docs build produced no `out`.");
  const pages = join(out, blueprint.HANDOVER_PAGES_DIR);
  cpSync(built, pages, { recursive: true });

  for (const name of filesUnder(pages)) {
    if (!name.endsWith(".html")) continue;
    const path = join(pages, ...name.split("/"));
    const depth = name.split("/").length - 1;
    writeFileSync(path, relativise(readFileSync(path, "utf8"), depth), "utf8");
  }

  /* Checked against what may be in a handover before anything is zipped.
     The output directory is listed rather than the intentions replayed, so a
     file copied in by hand — or left behind by a previous run — is named here
     rather than shipped. */
  const written = filesUnder(out).filter((name) => name !== "handover.zip");
  const unexpected = blueprint.unexpectedHandoverPaths(written, files);
  if (unexpected.length > 0) {
    throw new Error(
      `In the handover and from neither source: ${unexpected.join(", ")}`,
    );
  }

  /* One archive, everything in it. */
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[file.path] = strToU8(file.contents);
  for (const name of filesUnder(pages)) {
    entries[`${blueprint.HANDOVER_PAGES_DIR}/${name}`] = new Uint8Array(
      readFileSync(join(pages, ...name.split("/"))),
    );
  }
  const zipPath = join(out, "handover.zip");
  writeFileSync(zipPath, zipSync(entries, { level: 6 }));

  console.log(
    `Wrote ${files.length} files and ${filesUnder(pages).length} pages to ${out}`,
  );
  console.log(`Archive: ${zipPath}`);
}

main();
