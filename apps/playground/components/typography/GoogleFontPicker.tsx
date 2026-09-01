"use client";

import { useMemo } from "react";
import { FileUp } from "lucide-react";
import { Typeahead, TypeaheadItem } from "@astryxdesign/core/Typeahead";
import {
  ALLOWED_FONT_EXTENSIONS,
  findGoogleFont,
  searchGoogleFonts,
  type GoogleFont,
} from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

/**
 * The id of the row pinned above the catalogue.
 *
 * Prefixed with a colon so it cannot collide with a family name, which is what
 * every other item's id is.
 */
const UPLOAD_ITEM_ID = "::upload";

/** Said once, on the pinned row, rather than in a note under every slot. */
const UPLOAD_FORMATS = ALLOWED_FONT_EXTENSIONS.join(", ");

interface FontItem {
  id: string;
  label: string;
  /** Null on the upload row, which stands for an action rather than a family. */
  font: GoogleFont | null;
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
  /**
   * Wording for the pinned upload row, already carrying this slot's state —
   * "Upload Base font", "Replace Base font". Omitted, no row is pinned.
   */
  uploadLabel?: string;
  /** Opens the file dialog for this slot. */
  onUpload?: () => void;
}

/**
 * Pick one family from the Google Fonts catalogue, or upload a file instead.
 *
 * `script` is what makes a bilingual stack work. A family that does not cover
 * the script gives no warning: the browser quietly falls back to a system font,
 * which reads as the font simply not applying.
 *
 * The upload row is pinned here rather than sitting under the field because
 * this menu is where someone already is at the moment they discover the family
 * they want is not in the catalogue. The Astryx `Typeahead` has no header slot,
 * so it is an item like any other — hence the sentinel id, which `onChange`
 * intercepts before it can be mistaken for a pick.
 */
export function GoogleFontPicker({
  label,
  family,
  script,
  placeholder,
  onPick,
  uploadLabel,
  onUpload,
}: GoogleFontPickerProps) {
  const selected = selectedItem(family);

  const searchSource = useMemo(() => {
    const pinned: FontItem[] = uploadLabel
      ? [{ id: UPLOAD_ITEM_ID, label: uploadLabel, font: null }]
      : [];
    return {
      /* Prepended to the filtered results and not only to the bootstrap list.
         Typing is exactly when someone finds out their font is not in the
         catalogue, so the row has to survive the search that proves it —
         including the search that matches nothing at all. */
      search: (query: string) => [
        ...pinned,
        ...searchGoogleFonts(query, { script }).map(toItem),
      ],
      bootstrap: () => [
        ...pinned,
        ...searchGoogleFonts("", { script }).map(toItem),
      ],
    };
    /* `onUpload` is deliberately not a dependency: it is read in `onChange`,
       not here, so a new closure on every render would rebuild the source for nothing. */
  }, [script, uploadLabel]);

  return (
    <Typeahead<FontItem>
      hasEntriesOnFocus
      label={label}
      /* The default of 10 made 1946 families look like a shortlist. One more
         when the upload row is pinned, so it costs the catalogue nothing —
         the menu is sliced to this from the top, where the row sits. */
      maxMenuItems={uploadLabel ? 31 : 30}
      placeholder={placeholder}
      renderItem={(item) =>
        item.id === UPLOAD_ITEM_ID ? (
          /* Not a TypeaheadItem: that puts a description on its own line, and
             the formats are a footnote to the action rather than a second
             thing to read. `data-upload-row` is what the separator under this
             row is hung on, so it follows the row instead of whichever item
             happens to be first. */
          <span className={styles.fontUploadRow} data-upload-row="true">
            <FileUp aria-hidden="true" className={styles.fontUploadRowIcon} />
            {item.label}
            <span className={styles.fontUploadRowFormats}>
              {UPLOAD_FORMATS}
            </span>
          </span>
        ) : (
          <TypeaheadItem item={item} />
        )
      }
      searchSource={searchSource}
      value={selected}
      onChange={(item) => {
        /* An action, not a family. Returning before `onPick` leaves the
           controlled value alone, so the field still shows what is in the slot
           while the file dialog is open — and shows it again if the dialog is
           cancelled, which picks no file and fires no change. */
        if (item?.id === UPLOAD_ITEM_ID) {
          onUpload?.();
          return;
        }
        onPick(item?.font ?? null);
      }}
    />
  );
}
