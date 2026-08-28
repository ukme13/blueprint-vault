"use client";

import { useMemo } from "react";
import { Typeahead } from "@astryxdesign/core/Typeahead";
import {
  findGoogleFont,
  searchGoogleFonts,
  type GoogleFont,
} from "@blueprint/ui";

interface FontItem {
  id: string;
  label: string;
  font: GoogleFont;
}

function toItem(font: GoogleFont): FontItem {
  return { id: font.family, label: font.family, font };
}

/**
 * The item to show in the field for `family`.
 *
 * A family that is not on Google — a local face like Geist Sans, or one typed
 * before this picker existed — is synthesised rather than dropped. Otherwise
 * the field reads as empty and the font looks lost, when it is really still in
 * the stack and still rendering.
 */
function selectedItem(family: string): FontItem | null {
  if (!family) return null;
  const known = findGoogleFont(family);
  if (known) return toItem(known);
  return toItem({
    family,
    category: "",
    weights: [400],
    scripts: [],
    popularity: Number.MAX_SAFE_INTEGER,
  });
}

interface GoogleFontPickerProps {
  label: string;
  /** Family currently in this slot, if it is a Google font. */
  family: string;
  /** Restrict to families covering this writing system, e.g. "thai". */
  script?: string;
  placeholder?: string;
  onPick: (font: GoogleFont | null) => void;
}

/**
 * Pick one family from the Google Fonts catalogue.
 *
 * `script` is what makes a bilingual stack work. A family that does not cover
 * the script gives no warning: the browser quietly falls back to a system font,
 * which reads as the font simply not applying.
 */
export function GoogleFontPicker({
  label,
  family,
  script,
  placeholder,
  onPick,
}: GoogleFontPickerProps) {
  const selected = selectedItem(family);

  const searchSource = useMemo(
    () => ({
      search: (query: string) =>
        searchGoogleFonts(query, { script }).map(toItem),
      bootstrap: () => searchGoogleFonts("", { script }).map(toItem),
    }),
    [script],
  );

  return (
    <Typeahead<FontItem>
      hasEntriesOnFocus
      label={label}
      /* The default of 10 made 1946 families look like a shortlist. */
      maxMenuItems={30}
      placeholder={placeholder}
      searchSource={searchSource}
      value={selected}
      onChange={(item) => onPick(item?.font ?? null)}
    />
  );
}
