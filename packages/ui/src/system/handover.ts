import { generatePalettes } from "../color/palette";
import type { ColourFormat } from "../color/format";
import {
  buildAccessibilityReport,
  formatAccessibilityReportJson,
  formatAccessibilityReportMarkdown,
} from "../report/accessibility-report";
import { formatBlueprintWorkspace } from "../workspace/workspace-file";
import type { WorkspaceProject } from "../workspace/types";
import {
  designSystemFiles,
  DESIGN_SYSTEM_FILE_NAMES,
} from "./design-system-files";
import { clientRoutePaths } from "./docs-routes";

/**
 * Everything a client is handed, as files.
 *
 * One level above `designSystemFiles`, which answers "what does this workspace
 * look like installed". This answers "what does a client receive" — the
 * stylesheets, the workspace they can reopen, the accessibility report, and a
 * README that says which of them to install.
 *
 * Pure, and that is what makes it testable: the same workspace and the same
 * options give the same bytes. The studio version and the export date are
 * parameters rather than read here, because a function with a clock in it
 * cannot be compared against itself.
 *
 * The foundation pages are deliberately not here. They are a Next build, which
 * a browser cannot run — the export dialog produces everything a browser can,
 * and `pnpm handover` runs this and then adds the pages. That split is the
 * answer to the plan's open question: the documentation is build-time with a
 * parameter rather than a runtime tool.
 *
 * See docs/roadmap/foundations-handover.md.
 */

export interface HandoverFile {
  /** Path inside the archive. Flat except for the pages the build adds. */
  path: string;
  contents: string;
}

export interface HandoverOptions {
  /** Typography's unit. px by default: the number the scale names. */
  typeScaleUnit?: "px" | "rem";
  /** Notation for colour values. The studio's shared preference. */
  colourFormat?: ColourFormat;
  /** The studio build that produced this, for a client reporting a problem. */
  version: string;
  /**
   * When it was produced, as an ISO date.
   *
   * A parameter because this function has no clock. A handover is compared
   * against itself in tests and regenerated in a build, and a `new Date()`
   * inside would make both of those lie.
   */
  exportedAt: string;
}

/** The workspace file's name inside an archive, which is not the download's. */
export const HANDOVER_WORKSPACE_FILE = "workspace.blueprint.json";
export const HANDOVER_README = "README.md";
export const HANDOVER_REPORT_MARKDOWN = "accessibility-report.md";
export const HANDOVER_REPORT_JSON = "accessibility-report.json";

/**
 * What each file is for, in one line.
 *
 * Keyed by path and exhaustive by construction: `buildHandoverFiles` throws on
 * a file with no description rather than writing a README with a gap in it. A
 * client reading a list of eight files needs to know which three to install,
 * and a README that silently omits the newest one is worse than none.
 */
const DESCRIPTIONS: Readonly<Record<string, string>> = {
  "blueprint.css":
    "Every colour, spacing, radius and elevation token as CSS custom properties. **Install this one** if you write plain CSS.",
  "blueprint-typography.css":
    "The type scale: one variable per role for family, size, line height, letter spacing, weight and transform. Install it beside whichever of the two above you chose — typography ships separately because its unit is your decision.",
  "blueprint.tailwind.css":
    "The same tokens as a Tailwind v4 `@theme`, which is what generates `bg-action-primary` and `p-4`. **Install this one instead** if you use Tailwind.",
  "blueprint.tokens.json":
    "The same system in the Design Tokens (DTCG) format. **Use this one** if you feed a token pipeline — Style Dictionary, Figma Tokens, or your own.",
  [HANDOVER_WORKSPACE_FILE]:
    "The workspace itself. Open it in the Blueprint studio to change anything here and export again; it is the only file that round-trips.",
  [HANDOVER_REPORT_MARKDOWN]:
    "The accessibility report: every text and non-text contrast pair the system produces, with its ratio and verdict. For reading.",
  [HANDOVER_REPORT_JSON]:
    "The same report as data, for a CI check or a dashboard.",
  [HANDOVER_README]: "This file.",
};

function readme(paths: string[], options: HandoverOptions): string {
  const missing = paths.filter((path) => !(path in DESCRIPTIONS));
  if (missing.length > 0) {
    /* Loud, and at build time. A file added to the archive without a line
       saying what it is reaches a client as an unexplained artefact, and the
       person who added it is the only one who could have written that line. */
    throw new Error(
      `No README description for: ${missing.join(", ")}. Add one to DESCRIPTIONS in handover.ts.`,
    );
  }

  return [
    "# Your design system",
    "",
    `Exported from Blueprint ${options.version} on ${options.exportedAt}.`,
    "",
    "## What to install",
    "",
    "Pick one of the first three depending on how you build, and add the",
    "typography file beside it.",
    "",
    ...paths.flatMap((path) => [
      `### \`${path}\``,
      "",
      DESCRIPTIONS[path]!,
      "",
    ]),
    "## The foundation pages",
    "",
    "The documentation for this system — colour, semantic roles, typography,",
    "spacing, radius and elevation, each rendered from the workspace in this",
    "archive — is produced by `pnpm handover` in the Blueprint repository. It",
    "builds the pages statically against a workspace file, so they describe",
    "your system rather than the reference one, and they open from disk with",
    "no server.",
    "",
    "Specimens for any Google font this workspace names load from Google, so",
    "the typography page needs a network connection to draw them in the right",
    "face. Everything else is in the archive.",
    "",
  ].join("\n");
}

/**
 * Every file in a handover, README last.
 *
 * The README is written from the list rather than beside it, so a file added
 * here cannot reach a client undocumented — the test that says so is the
 * cheapest guard in this package and the one most likely to earn its keep.
 */
export function buildHandoverFiles(
  project: WorkspaceProject,
  options: HandoverOptions,
): HandoverFile[] {
  const system = designSystemFiles(project, {
    typeScaleUnit: options.typeScaleUnit ?? "px",
    colourFormat: options.colourFormat,
  });

  /* An empty file is left out rather than shipped.
     `designSystemFiles` returns a fixed-shape record, so a workspace with no
     type scale gets `""` for `blueprint-typography.css` — and a zero-byte
     stylesheet in a client's archive is worse than no stylesheet: it is
     something to install that silently does nothing, listed in a README as
     though it worked. Found by downloading a real archive for a palette-only
     workspace. Because the README is generated from this list, omitting the
     file omits its description too. */
  const files: HandoverFile[] = DESIGN_SYSTEM_FILE_NAMES.filter(
    (name) => system[name].length > 0,
  ).map((name) => ({ path: name, contents: system[name] }));

  files.push({
    path: HANDOVER_WORKSPACE_FILE,
    contents: formatBlueprintWorkspace(project),
  });

  /* A workspace with no palette produces no report rather than an empty one.
     Reporting nothing is honest; a file of zero rows reads as a pass. */
  const report = buildAccessibilityReport({
    projectName: project.name,
    palettes: project.palette ? generatePalettes(project.palette) : [],
    semantics: project.semantics,
    typography: project.typography?.system ?? null,
  });
  if (report) {
    files.push({
      path: HANDOVER_REPORT_MARKDOWN,
      contents: formatAccessibilityReportMarkdown(report),
    });
    files.push({
      path: HANDOVER_REPORT_JSON,
      contents: formatAccessibilityReportJson(report),
    });
  }

  /* Listed including itself, so somebody unzipping this can account for every
     file in front of them without wondering which one the README forgot. */
  const paths = [...files.map((file) => file.path), HANDOVER_README];
  files.push({ path: HANDOVER_README, contents: readme(paths, options) });
  return files;
}

/** Where the built foundation pages sit inside the archive. */
export const HANDOVER_PAGES_DIR = "pages";

/**
 * The routes a client may receive, as they appear in the exported build.
 *
 * An allowlist rather than a list of things to strip, and the difference is
 * the whole point. The documentation app is not internal — `pnpm handover`
 * builds it and copies it into the archive — so a route added to it reaches
 * every client unless something stops it. Stripping is a subtraction somebody
 * can forget, and the first person to notice a forgotten one is the client.
 * Declaring is a line somebody has to write, and the build fails until they do.
 *
 * `output: "export"` has no way to skip a route, so everything under `app/`
 * is built either way. What this decides is what crosses into the archive.
 *
 * Derived from `DOCS_ROUTES` rather than listed again, because the nav and
 * the home page are built from the same rows. Two lists would let a page be
 * navigable and absent, or present and unreachable, and the first anybody
 * would hear of it is a client clicking a link in a folder.
 *
 * See docs/roadmap/studio-guide.md.
 */
export const HANDOVER_ROUTES: readonly string[] = clientRoutePaths();

/**
 * The parts of an exported build that are not a route.
 *
 * The bundle, the not-found route Next always emits, and the two shapes the
 * 404 takes. Everything else at the top level is a file rather than a
 * directory — `index.html`, the RSC payloads, the icons out of `public` —
 * and a file at the top level cannot be a route page, because `trailingSlash`
 * lands every route at `<route>/index.html`. That invariant is what lets this
 * list stay short instead of naming every favicon.
 */
const HANDOVER_SHELL: readonly string[] = ["_next", "_not-found", "404"];

/**
 * Where the bundle keeps one route's own compiled code.
 *
 * `_next` is shared and would otherwise be waved through whole — and it is
 * not entirely shared. Under here the build mirrors the route tree, so a route
 * held out of the archive still ships its component as
 * `_next/static/chunks/app/<route>/page-<hash>.js`, with whatever prose that
 * component holds inlined into it. Found by building a throwaway route and
 * looking, which is the only way anybody was going to find it.
 */
const APP_CHUNKS = "_next/static/chunks/app/";

/** Whether a route path is one a client may receive. */
function isHandoverRoute(route: string): boolean {
  return HANDOVER_ROUTES.some(
    (allowed) => route === allowed || route.startsWith(`${allowed}/`),
  );
}

/**
 * Whether one path inside the exported build may go to a client.
 *
 * Takes the path relative to the pages directory, which is what both readers
 * of this rule have: the copy in `scripts/handover.ts`, walking the build
 * output, and the guard below, walking what was written.
 */
export function isHandoverPagePath(path: string): boolean {
  const clean = path.replace(/^\/+/, "");
  if (clean === "") return false;

  /* A root-level file. Never a route, per the note on HANDOVER_SHELL. */
  if (!clean.includes("/")) return true;

  if (clean.startsWith(APP_CHUNKS)) {
    const rest = clean.slice(APP_CHUNKS.length);
    /* The root route's own chunks sit directly here, with no route above
       them. Next's internal entries — `_global-error`, `_not-found` — are
       named with a leading underscore, which no route of ours is. */
    if (!rest.includes("/")) return true;
    const route = rest.slice(0, rest.lastIndexOf("/"));
    return route.startsWith("_") || isHandoverRoute(route);
  }

  const top = clean.slice(0, clean.indexOf("/"));
  if (HANDOVER_SHELL.includes(top)) return true;

  return (
    isHandoverRoute(clean.slice(0, clean.lastIndexOf("/"))) ||
    isHandoverRoute(clean)
  );
}

/**
 * Anything in a handover that neither the builder nor the docs build made.
 *
 * Empty is the passing state. Two risks, and they arrive from opposite
 * directions. One is a hand-copied file — a favicon, a stray note, a
 * stylesheet somebody dropped into the output directory because it was
 * quicker than adding it to the builder — reaching a client as an artefact no
 * README describes. The other is a route: the documentation app grew a studio
 * guide, the copy that fills the archive was not told about it, and a client
 * is handed the manual for a tool they do not have.
 *
 * Given what was actually written rather than what was meant to be, so it
 * catches both. The script lists its own output directory and passes that in;
 * a name that is neither a builder file nor an allowed page comes back, and
 * the run stops.
 */
export function unexpectedHandoverPaths(
  written: readonly string[],
  files: readonly HandoverFile[],
): string[] {
  const known = new Set(files.map((file) => file.path));
  const prefix = `${HANDOVER_PAGES_DIR}/`;
  return written.filter((path) => {
    if (known.has(path)) return false;
    if (!path.startsWith(prefix)) return true;
    return !isHandoverPagePath(path.slice(prefix.length));
  });
}
