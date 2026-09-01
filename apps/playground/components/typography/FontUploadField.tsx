"use client";

import type { FontSlot } from "@blueprint/ui";
import type { LocalFontStatus } from "./use-local-fonts";
import styles from "./typography-workspace.module.css";

/**
 * The upload control for one slot of a font stack.
 *
 * One per slot rather than one per entry. A single input below both pickers
 * read as belonging to the whole entry when it only ever fed the primary —
 * which is how uploading a Latin face silently replaced a Thai fallback. A
 * control inside the slot it writes cannot be ambiguous about which.
 */

interface FontUploadFieldProps {
  slot: FontSlot;
  /** What this slot is, e.g. "Base font" or "Base Thai fallback". */
  name: string;
  family: string;
  /** Whether this slot is rendered from a file, rather than Google or system. */
  isLocal: boolean;
  fileStatus: LocalFontStatus;
  uploadError: string;
  /** What the stack falls back to when this slot's file is absent. */
  generic: string;
  onUpload: (file: File) => void;
}

export function FontUploadField({
  name,
  family,
  isLocal,
  fileStatus,
  uploadError,
  generic,
  onUpload,
}: FontUploadFieldProps) {
  /* "Replace" would be wrong where there is nothing to replace, which is the
     whole state this has to be honest about. */
  const action = !isLocal
    ? "Upload"
    : fileStatus === "missing"
      ? "Add the missing"
      : "Replace";

  return (
    <div className={styles.fontStackUpload}>
      <label className={styles.fontStackUploadLabel}>
        <span>{`${action} file`}</span>
        <input
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
          type="file"
          /* The state and the slot, both. The state alone gave the two
             inputs in one entry the same name; the slot alone dropped "the
             file is missing" from what a screen reader hears. */
          aria-label={`${action} ${name} file`}
          onChange={(event) => {
            const picked = event.target.files?.[0];
            /* Cleared so the same file can be picked again after a removal,
               which otherwise fires no change event. */
            event.target.value = "";
            if (picked) onUpload(picked);
          }}
        />
      </label>
      {uploadError && (
        <p className={styles.fontStackHint} data-missing="true">
          {uploadError}
        </p>
      )}
      {isLocal && fileStatus !== "checking" && (
        <p
          className={styles.fontStackHint}
          data-missing={fileStatus === "missing"}
        >
          {fileStatus === "loaded"
            ? `Rendering ${family} from your file. It stays in this browser and is never included in exports — check the licence before shipping it on the web.`
            : `${family} has no file in this browser, so it falls back to ${generic}. The name still applies wherever it is installed. Add the file to see it here.`}
        </p>
      )}
    </div>
  );
}
