"use client";

import { useMemo, useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
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
  /** Family currently at the head of the stack, if it is a Google font. */
  family: string;
  onPick: (font: GoogleFont) => void;
}

/**
 * Pick a family from the Google Fonts catalogue.
 *
 * The Thai filter is the point of it. A bilingual project that picks a
 * Latin-only family gets no warning — the browser silently falls back to a
 * system font for Thai, which looks like the font simply not applying.
 */
export function GoogleFontPicker({ family, onPick }: GoogleFontPickerProps) {
  const [thaiOnly, setThaiOnly] = useState(false);

  const selected = useMemo(() => {
    const known = findGoogleFont(family);
    return known ? toItem(known) : null;
  }, [family]);

  const searchSource = useMemo(
    () => ({
      search: (query: string) =>
        searchGoogleFonts(query, { thaiOnly }).map(toItem),
      bootstrap: () => searchGoogleFonts("", { thaiOnly }).map(toItem),
    }),
    [thaiOnly],
  );

  return (
    <div className="flex flex-col gap-2">
      <Typeahead<FontItem>
        hasEntriesOnFocus
        label="Google font"
        /* The default of 10 made 1946 families look like a shortlist. */
        maxMenuItems={30}
        placeholder="Search Google Fonts"
        searchSource={searchSource}
        value={selected}
        onChange={(item) => {
          if (item) onPick(item.font);
        }}
      />
      <CheckboxInput
        label="Thai-capable only"
        value={thaiOnly}
        onChange={(checked) => setThaiOnly(checked === true)}
      />
      {selected && !selected.font.thai && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          {selected.font.family} has no Thai glyphs. Add a Thai family after it
          in the stack so Thai text has something to fall back to.
        </p>
      )}
    </div>
  );
}
