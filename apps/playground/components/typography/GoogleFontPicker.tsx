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
  const selected = useMemo(() => {
    const known = findGoogleFont(family);
    return known ? toItem(known) : null;
  }, [family]);

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
