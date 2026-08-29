import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Find CSS custom properties that are referenced but never defined.
 *
 * A `var(--typo)` is silently ignored by the browser: the declaration is
 * dropped and the element keeps whatever it inherited. Two real bugs shipped
 * that way — `--spacing-200` and `--font-caption-size`, both invented by
 * following the 25-interval colour convention where it does not apply — and
 * neither the compiler nor the tests noticed, because nothing checks a name
 * that only exists as a string.
 */

const VAR_USE = /var\(\s*(--[a-zA-Z0-9-]+)/g;
const VAR_DEF = /(--[a-zA-Z0-9-]+)\s*:/g;
/**
 * Custom properties set from TypeScript: a next/font `variable`, or a key in an
 * inline style object. Deliberately narrow — merely naming a property in a
 * string does not define it, or a test mentioning one would excuse it.
 */
const VAR_FROM_FONT = /variable:\s*["'`](--[a-zA-Z0-9-]+)["'`]/g;
const VAR_AS_STYLE_KEY = /["'`](--[a-zA-Z0-9-]+)["'`]\s*:/g;

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
  ".git",
]);

function walk(
  dir: string,
  extensions: string[],
  found: string[] = [],
  skip: Set<string> = SKIP_DIRS,
) {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (skip.has(entry)) continue;
    const path = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(path).isDirectory();
    } catch {
      continue;
    }
    if (isDir) walk(path, extensions, found, skip);
    else if (extensions.some((ext) => entry.endsWith(ext))) found.push(path);
  }
  return found;
}

function matchAll(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(new RegExp(pattern))].map((match) => match[1]!);
}

export interface UndefinedCssVar {
  file: string;
  name: string;
}

/**
 * Collect every custom property the workspace defines.
 *
 * Definitions come from three places: the CSS itself, TypeScript that sets a
 * property by name, and the installed design-system packages.
 */
export function definedCssVars(root: string): Set<string> {
  const defined = new Set<string>();

  for (const file of walk(root, [".css"])) {
    for (const name of matchAll(readFileSync(file, "utf8"), VAR_DEF)) {
      defined.add(name);
    }
  }

  /* next/font declares `variable: "--font-geist-sans"`, and components set
     properties like `--inspector-width` through inline styles. Neither appears
     in any stylesheet. */
  for (const file of walk(root, [".ts", ".tsx"])) {
    const source = readFileSync(file, "utf8");
    for (const name of [
      ...matchAll(source, VAR_FROM_FONT),
      ...matchAll(source, VAR_AS_STYLE_KEY),
    ]) {
      defined.add(name);
    }
  }

  for (const vendor of vendorStylesheets(root)) {
    for (const name of matchAll(readFileSync(vendor, "utf8"), VAR_DEF)) {
      defined.add(name);
    }
  }

  return defined;
}

/** Design-system stylesheets, which define the tokens everything else uses. */
function vendorStylesheets(root: string): string[] {
  const pnpm = join(root, "node_modules", ".pnpm");
  let packages: string[];
  try {
    packages = readdirSync(pnpm);
  } catch {
    return [];
  }

  /* The vendor stylesheets live under node_modules/dist, which the workspace
     walk deliberately skips, so this one descends into them. */
  const allow = new Set<string>();
  return packages
    .filter((name) => name.startsWith("@astryxdesign+"))
    .flatMap((name) =>
      walk(
        join(pnpm, name, "node_modules", "@astryxdesign"),
        [".css"],
        [],
        allow,
      ),
    );
}

/** Every `var(--x)` in the workspace's own CSS with no matching definition. */
export function findUndefinedCssVars(root: string): UndefinedCssVar[] {
  const defined = definedCssVars(root);
  const undefinedVars: UndefinedCssVar[] = [];

  for (const file of walk(root, [".css"])) {
    if (file.includes("node_modules")) continue;
    const source = readFileSync(file, "utf8");

    for (const name of new Set(matchAll(source, VAR_USE))) {
      /* A fallback means the author already handled the miss:
         var(--maybe, 340px) is deliberate, not a typo. */
      const hasFallback = new RegExp(`var\\(\\s*${name}\\s*,`).test(source);
      if (hasFallback) continue;

      if (!defined.has(name)) {
        /* Forward slashes whatever the platform. walk() builds paths with
           join(), which spells them with backslashes on Windows: a
           difference that means nothing to whoever reads the report, and
           breaks every test that names a path. */
        const shown = relative(root, file).replaceAll("\\", "/");
        undefinedVars.push({ file: shown, name });
      }
    }
  }

  return undefinedVars;
}
