"use client";

import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  FONT_SCRIPTS,
  findGoogleFont,
  genericForCategory,
  type TypeFont,
} from "@blueprint/ui";
import { GoogleFontPicker } from "./GoogleFontPicker";
import type { LocalFontStatus } from "./use-local-fonts";
import styles from "./typography-workspace.module.css";

/**
 * Edit one font as a primary family plus a bilingual fallback.
 *
 * A stack is three slots in practice: the family you want, a family that covers
 * the other script when the first does not, and a generic so something always
 * renders. The generic is appended rather than asked for, because it follows
 * from the primary's category.
 *
 * Thai is the case at hand, but the same problem exists for Arabic,
 * Devanagari, Korean and the rest — hence a script picker rather than a Thai
 * switch.
 */

const DEFAULT_SCRIPT = "thai";

/**
 * CSS keywords rather than families.
 *
 * They belong at the end of a stack, not in the bilingual slot: a migrated
 * stack of ["Geist Sans", "ui-sans-serif", "system-ui"] has no fallback font,
 * and treating `ui-sans-serif` as one hid the warning that the primary covers
 * no Thai.
 */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "inherit",
  "initial",
  "unset",
]);

function isGeneric(family: string): boolean {
  return GENERIC_FAMILIES.has(family.trim().toLowerCase());
}

function label(script: string): string {
  return script
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface FontStackEditorProps {
  font: TypeFont;
  /** Removal is refused for the last entry: a role needs something to render. */
  canRemove: boolean;
  onChange: (families: string[]) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  /** Hands the picked file up; the studio stores it and names the family. */
  onUpload: (file: File) => void;
  /** Why the last picked file was refused, or empty when it was not. */
  uploadError: string;
  /** Whether the uploaded file has been found yet. Local entries only. */
  fileStatus: LocalFontStatus;
}

export function FontStackEditor({
  font,
  canRemove,
  onChange,
  onRename,
  onRemove,
  onUpload,
  fileStatus,
  uploadError,
}: FontStackEditorProps) {
  const [script, setScript] = useState(DEFAULT_SCRIPT);

  const named = font.families.filter((family) => !isGeneric(family));
  const [primary = "", fallback = ""] = named;
  const primaryFont = findGoogleFont(primary);
  const generic = primaryFont
    ? genericForCategory(primaryFont.category)
    : "sans-serif";

  const write = (nextPrimary: string, nextFallback: string) => {
    /* Rebuilt rather than patched: the stack is only ever these three slots,
       so writing it whole keeps the order right and the generic last. */
    onChange(
      [nextPrimary, nextFallback, generic].filter(
        (family, index, all) =>
          family.length > 0 && all.indexOf(family) === index,
      ),
    );
  };

  const covered = primaryFont?.scripts.includes(script) ?? false;
  /* Both notes below reason from the Google catalogue, which an uploaded file
     is not in. "Not loaded here" would contradict the upload note directly,
     and script coverage is not something we can read off a file we were
     handed. */
  const isLocal = font.source === "local";

  return (
    <div className={styles.fontStack}>
      <div className={styles.fontStackRow}>
        <div className={styles.fontStackField}>
          <TextInput
            /* The name is what the per-role Font dropdown shows, so "Display"
               beats "Font 2". Ids are stable, so renaming moves no tokens. */
            isLabelHidden
            label={`${font.id} name`}
            value={font.name}
            onChange={onRename}
          />
        </div>
        {canRemove && (
          <Button
            aria-label={`Remove ${font.name} font`}
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={onRemove}
          >
            Remove
          </Button>
        )}
      </div>

      <GoogleFontPicker
        family={primary}
        label={`${font.name} font`}
        placeholder="Search Google Fonts"
        onPick={(picked) => write(picked?.family ?? "", fallback)}
      />

      <div className={styles.fontStackRow}>
        <div className={styles.fontStackField}>
          <GoogleFontPicker
            family={fallback}
            label={`${font.name} bilingual fallback`}
            placeholder={`Covers ${label(script)}`}
            script={script}
            onPick={(picked) => write(primary, picked?.family ?? "")}
          />
        </div>
        <div className={styles.fontStackScript}>
          <Selector
            isLabelHidden
            label={`${font.name} fallback script`}
            options={FONT_SCRIPTS.map((name) => ({
              label: label(name),
              value: name,
            }))}
            value={script}
            onChange={setScript}
          />
        </div>
      </div>

      <div className={styles.fontStackUpload}>
        <label className={styles.fontStackUploadLabel}>
          {/* "Replace" would be wrong where there is nothing to replace, which
              is the whole state this has to be honest about. */}
          <span>
            {!isLocal
              ? "Upload a font file"
              : fileStatus === "missing"
                ? "Add the missing file"
                : "Replace file"}
          </span>
          <input
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            type="file"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              /* Cleared so the same file can be picked again after a
                 removal, which otherwise fires no change event. */
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
              ? `Rendering ${primary} from your file. It stays in this browser and is never included in exports — check the licence before shipping it on the web.`
              : `${primary} has no file in this browser, so it falls back to ${generic}. The name still applies wherever it is installed. Add the file to see it here.`}
          </p>
        )}
      </div>

      {primary && !primaryFont && !isLocal && (
        <p className={styles.fontStackHint}>
          {primary} is not a Google font, so it is not loaded here. It still
          applies wherever it is installed.
        </p>
      )}
      {primary && primaryFont && covered && (
        <p className={styles.fontStackHint}>
          {primary} already covers {label(script)}, so a fallback is optional.
        </p>
      )}
      {primary && !covered && !fallback && !isLocal && (
        <p className={styles.fontStackHint}>
          {primary} has no {label(script)} glyphs. Without a fallback the
          browser substitutes a system font.
        </p>
      )}
    </div>
  );
}
