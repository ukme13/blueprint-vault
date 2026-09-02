"use client";

import { useEffect, useMemo, useRef } from "react";
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
  /** A note about the family, shown from an info icon at the end of the label. */
  labelTooltip?: string;
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
  labelTooltip,
  family,
  script,
  placeholder,
  onPick,
  uploadLabel,
  onUpload,
}: GoogleFontPickerProps) {
  const selected = selectedItem(family);
  const fieldRef = useRef<HTMLSpanElement | null>(null);

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

  /*
   * Reopen the menu when the field is clicked while it is already focused.
   *
   * Astryx's Typeahead opens on `focus` alone — there is no click handler that
   * opens it. Meanwhile the dropdown is a native `popover="auto"`, which
   * light-dismisses on a pointer click anywhere outside itself, the field
   * included. So a second click closes the menu and leaves nothing to reopen
   * it: the input is already focused, so no new focus event is coming. You
   * have to leave the field and come back, which is not how any other picker
   * behaves.
   *
   * On the next frame because the first click's open is asynchronous — the
   * search source is awaited — so checking synchronously would find the menu
   * shut and toggle it straight back off.
   */
  /* Whether the field holds a family, read from an event rather than a render.
     The reopen below runs on a listener bound once. */
  const hasFamily = useRef(!!family);
  useEffect(() => {
    hasFamily.current = !!family;
  }, [family]);

  useEffect(() => {
    const root = fieldRef.current;
    if (!root) return;

    const reopenClosedMenu = (event: MouseEvent) => {
      /* Empty fields only.

         A field holding a family shows it as a token, and clicking that token
         is Astryx entering edit mode: the token goes, the input is filled with
         the family and its text selected, ready to be typed over. The blur
         below is what Astryx restores a token on, so running this there
         turned every second click back into a token nobody could type in, and
         every click after that into a fresh select-all — you could not put
         the caret anywhere. Astryx reopens the menu for that case itself. */
      if (hasFamily.current) return;

      const target = event.target as HTMLElement | null;
      const input = target?.closest?.('input[role="combobox"]');
      if (!input) return;
      requestAnimationFrame(() => {
        /* Only when the click found the field already focused. Anything else
           is the component's own business. */
        if (document.activeElement !== input) return;
        /* The popover itself, not `aria-expanded`. Light dismiss is the
           browser closing the element directly, so React has not re-rendered
           yet and still reports the menu as expanded on the very click that
           shut it — the one click this exists to answer. */
        const controls = input.getAttribute("aria-controls");
        const listbox = controls ? document.getElementById(controls) : null;
        const popover = listbox?.closest("[popover]");
        if (
          popover instanceof HTMLElement &&
          popover.matches(":popover-open")
        ) {
          return;
        }
        /* A real focus cycle, not a synthesised `focusin`. Because React's
           state still says expanded, its focus handler would take the
           "already showing" path and do nothing. Blurring first drives the
           component's own blur handler, which settles that state, so the
           focus that follows opens the menu the way the first one did. */
        if (!(input instanceof HTMLElement)) return;
        input.blur();
        input.focus();
      });
    };

    root.addEventListener("click", reopenClosedMenu);
    return () => root.removeEventListener("click", reopenClosedMenu);
  }, []);

  return (
    /* Lays out nothing (`display: contents`) — it exists to catch clicks on
       the field below it. See the effect above. */
    <span ref={fieldRef} className={styles.fontPickerField}>
      <Typeahead<FontItem>
        /* Remounted when the family changes, which is what makes a pick show.
           Astryx re-enters edit mode after a selection and fills the input
           from a value captured before the pick, so the field went on showing
           the family that had just been replaced — the model was already the
           new one — until focus left. A fresh mount reads the value it is
           given, shows it as a token, and leaves the menu closed. */
        key={family || "empty"}
        hasEntriesOnFocus
        label={label}
        labelTooltip={labelTooltip}
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
    </span>
  );
}
