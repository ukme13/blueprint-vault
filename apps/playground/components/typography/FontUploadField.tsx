"use client";

import type { RefObject } from "react";
import { Info, TriangleAlert } from "lucide-react";
import type { FontFileStatus } from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

/**
 * The file input and status note for one slot of a font stack.
 *
 * The visible trigger moved into the font selector's menu, where someone
 * already is at the moment they find their family is not in the catalogue.
 * What stays here is the input itself and the note under the field.
 *
 * The input is mounted always and hidden visually rather than rendered inside
 * the menu, for two reasons. It has to outlive the menu closing — the menu
 * closes on selection, which is the moment the file dialog opens — and its
 * `aria-label` is the name a slot's upload is addressed by, which a control
 * that only exists while a menu is open cannot offer.
 *
 * Still one per slot rather than one per entry. A single input below both
 * pickers read as belonging to the whole entry when it only ever fed the
 * primary — which is how uploading a Latin face silently replaced a Thai
 * fallback. A control bound to the slot it writes cannot be ambiguous.
 */

interface FontUploadFieldProps {
  /** The input the selector's pinned row clicks. Mounted, never visible. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** What this slot is, e.g. "Base font" or "Base Thai fallback". */
  name: string;
  /** This slot's verb, from `fontUploadAction` — shared with the pinned row. */
  action: string;
  family: string;
  /** Whether this slot is rendered from a file, rather than Google or system. */
  isLocal: boolean;
  fileStatus: FontFileStatus;
  uploadError: string;
  /** What the stack falls back to when this slot's file is absent. */
  generic: string;
  onUpload: (file: File) => void;
}

export function FontUploadField({
  inputRef,
  name,
  action,
  family,
  isLocal,
  fileStatus,
  uploadError,
  generic,
  onUpload,
}: FontUploadFieldProps) {
  return (
    <div className={styles.fontStackUpload}>
      <input
        ref={inputRef}
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        /* Hidden, not unmounted: Playwright drives this input directly, and a
           screen reader reaches it by the label below. Absolutely positioned,
           so it claims no row of the stack it sits in. */
        className={styles.visuallyHidden}
        type="file"
        /* The state and the slot, both. The state alone gave the two inputs in
           one entry the same name; the slot alone dropped "the file is
           missing" from what a screen reader hears. */
        aria-label={`${action} ${name} file`}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          /* Cleared so the same file can be picked again after a removal,
             which otherwise fires no change event. */
          event.target.value = "";
          if (picked) onUpload(picked);
        }}
      />
      {uploadError && (
        <p className={styles.fontStackNote} data-missing="true">
          <TriangleAlert
            aria-hidden="true"
            className={styles.fontStackNoteIcon}
          />
          {uploadError}
        </p>
      )}
      {isLocal && fileStatus !== "checking" && (
        <p
          className={styles.fontStackNote}
          data-missing={fileStatus === "missing"}
        >
          {fileStatus === "loaded" ? (
            <Info aria-hidden="true" className={styles.fontStackNoteIcon} />
          ) : (
            <TriangleAlert
              aria-hidden="true"
              className={styles.fontStackNoteIcon}
            />
          )}
          {fileStatus === "loaded"
            ? `Rendering ${family} from your file. Stays in this browser and never ships in an export — check the licence before putting it on the web.`
            : `${family} has no file in this browser, so it falls back to ${generic}. The name still applies wherever it is installed.`}
        </p>
      )}
    </div>
  );
}
