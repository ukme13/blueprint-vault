/**
 * Regenerate the Google Fonts snapshot.
 *
 *   node scripts/build-google-fonts.mjs
 *
 * The picker needs to know which families exist, which weights they ship, and
 * which support Thai — a bilingual project that picks a Latin-only family would
 * otherwise fall back to a system font with no warning.
 *
 * The Google Fonts Developer API needs a key. This reads the public metadata
 * endpoint the fonts.google.com site itself uses, so the snapshot can be
 * refreshed without credentials.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://fonts.google.com/metadata/fonts";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "ui",
  "src",
  "typography",
  "google-fonts.json",
);

const response = await fetch(SOURCE);
if (!response.ok) {
  throw new Error(`Google Fonts metadata returned ${response.status}`);
}

const { familyMetadataList: families } = await response.json();
if (!Array.isArray(families) || families.length === 0) {
  throw new Error("Google Fonts metadata had no families");
}

/* Tuples rather than objects: the same data as records is nearly twice the
   size, and this file ships to the browser. Expanded on read. */
const snapshot = families
  .map((family) => [
    family.family,
    family.category ?? "",
    // Numeric weights only: the italic variants share them.
    [
      ...new Set(
        Object.keys(family.fonts ?? {})
          .map((variant) => Number.parseInt(variant, 10))
          .filter(Number.isFinite),
      ),
    ].sort((a, b) => a - b),
    (family.subsets ?? []).includes("thai") ? 1 : 0,
  ])
  .filter(([name, , weights]) => name && weights.length > 0)
  .sort((a, b) => a[0].localeCompare(b[0]));

writeFileSync(OUT, JSON.stringify(snapshot));

const thai = snapshot.filter(([, , , isThai]) => isThai).length;
console.log(
  `Wrote ${snapshot.length} families (${thai} with Thai) to ${OUT.split("/").slice(-2).join("/")}`,
);
