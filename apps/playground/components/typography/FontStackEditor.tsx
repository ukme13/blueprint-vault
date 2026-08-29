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
}

export function FontStackEditor({
  font,
  canRemove,
  onChange,
  onRename,
  onRemove,
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

      {primary && !primaryFont && (
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
      {primary && !covered && !fallback && (
        <p className={styles.fontStackHint}>
          {primary} has no {label(script)} glyphs. Without a fallback the
          browser substitutes a system font.
        </p>
      )}
    </div>
  );
}
