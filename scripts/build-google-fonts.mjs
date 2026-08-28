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

/**
 * Writing systems worth filtering a bilingual fallback by.
 *
 * Latin is left out because nearly every family has it, so it separates
 * nothing. Maths and symbol subsets are not writing systems. The order is
 * fixed: families store indices into this list.
 */
const SCRIPTS = [
  "arabic",
  "bengali",
  "chinese-simplified",
  "chinese-traditional",
  "cyrillic",
  "devanagari",
  "greek",
  "gujarati",
  "gurmukhi",
  "hebrew",
  "japanese",
  "kannada",
  "khmer",
  "korean",
  "tamil",
  "telugu",
  "thai",
  "vietnamese",
];
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
    /* Numeric weights only; the italic variants share them.
       Matched whole rather than sliced: a fixed three-character slice read
       "1000" as 100, so families with a 1000 weight silently lost it and
       gained a duplicate 100. CSS font-weight runs 1 to 1000, and the
       variable families that start at 1 really do mean it. */
    [
      ...new Set(
        Object.keys(family.fonts ?? {})
          .map((variant) => /^(\d+)/.exec(variant)?.[1])
          .filter((weight) => weight !== undefined)
          .map(Number)
          .filter((weight) => weight >= 1 && weight <= 1000),
      ),
    ].sort((a, b) => a - b),
    (family.subsets ?? [])
      .map((subset) => SCRIPTS.indexOf(subset))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b),
    /* Google's own popularity rank, 1 being the most used. Without it the
       picker opens on ABeeZee and Abel rather than anything anyone wants. */
    family.popularity ?? 99999,
  ])
  .filter(([name, , weights]) => name && weights.length > 0)
  .sort((a, b) => a[0].localeCompare(b[0]));

writeFileSync(OUT, JSON.stringify(snapshot));

writeFileSync(
  OUT.replace("google-fonts.json", "google-font-scripts.json"),
  JSON.stringify(SCRIPTS),
);

const thai = snapshot.filter(([, , , scripts]) =>
  scripts.includes(SCRIPTS.indexOf("thai")),
).length;
console.log(
  `Wrote ${snapshot.length} families (${thai} with Thai) across ${SCRIPTS.length} scripts`,
);
