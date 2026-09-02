"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  FONT_SCRIPTS,
  findGoogleFont,
  familyForSlot,
  fontStackNotice,
  fontUploadAction,
  genericForCategory,
  isLocalSlot,
  type FontSlot,
  type TypeFont,
} from "@blueprint/ui";
import { FontUploadField } from "./FontUploadField";
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

/*
 * The generic list moved to `@blueprint/ui`. `setLocalFont` needs the same
 * answer when it keeps a stack's existing generic, and two copies of "is this
 * a real family" would eventually disagree.
 *
 * Why it matters here: a migrated stack of ["Geist Sans", "ui-sans-serif",
 * "system-ui"] has no fallback font, and treating `ui-sans-serif` as one hid
 * the warning that the primary covers no Thai.
 */

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
  /** A family chosen for one slot, with the generic the stack should end on. */
  onPick: (slot: FontSlot, family: string, generic: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  /** Hands the picked file up; the studio stores it and names the family. */
  onUpload: (slot: FontSlot, file: File) => void;
  /** Why the last picked file was refused, per slot. */
  uploadError: (slot: FontSlot) => string;
  /** Whether a slot's uploaded file has been found yet. */
  fileStatus: (slot: FontSlot) => LocalFontStatus;
}

export function FontStackEditor({
  font,
  canRemove,
  onPick,
  onRename,
  onRemove,
  onUpload,
  fileStatus,
  uploadError,
}: FontStackEditorProps) {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  /* One per slot, so the row pinned in each picker's menu reaches that slot's
     input and no other. This is the same separation the inputs themselves
     have, carried through to what opens them. */
  const primaryFileRef = useRef<HTMLInputElement | null>(null);
  const fallbackFileRef = useRef<HTMLInputElement | null>(null);

  const primary = familyForSlot(font, "primary");
  const fallback = familyForSlot(font, "fallback");
  const primaryFont = findGoogleFont(primary);
  const generic = primaryFont
    ? genericForCategory(primaryFont.category)
    : "sans-serif";

  const covered = primaryFont?.scripts.includes(script) ?? false;
  const primaryIsLocal = isLocalSlot(font, "primary");

  /* Which of the three notes applies, decided in @blueprint/ui so that only
     one of them can. Two used to be able to fire together, and the second was
     guessing about a family it had never seen. */
  const notice = fontStackNotice({
    primary,
    isPrimaryKnown: !!primaryFont,
    isPrimaryLocal: primaryIsLocal,
    coversScript: covered,
    hasFallback: !!fallback,
  });

  /* The fallback is three controls that a Latin-only stack never touches, so
     it opens on demand. A stack that already has one is past the question.

     The script stays out of the collapse. It defaults to Thai, which is a
     guess, and hiding it would leave somebody who cares about Arabic reading
     a note about Thai with no way to see it was about the wrong script. */
  const [wasOpened, setWasOpened] = useState(false);
  const isFallbackOpen = !!fallback || wasOpened;

  /* The verb is shared between the row someone reads and the `aria-label` on
     the input it clicks, so the two cannot disagree about which state a slot
     is in. The slot's name stays out of the row: inside a menu opened from
     this field it would only repeat the field's own label. */
  const primaryName = `${font.name} font`;
  const fallbackName = `${font.name} ${label(script)} fallback`;
  const primaryAction = fontUploadAction(primaryIsLocal, fileStatus("primary"));
  const fallbackAction = fontUploadAction(
    isLocalSlot(font, "fallback"),
    fileStatus("fallback"),
  );

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
            /* Sized against the name field beside it. See the note on the
               role row's trash: `cn` is a plain join, so the CVA size stays
               on the element and only the important suffix beats it. */
            className="h-8! w-8! [&_svg]:size-4!"
            scheme="neutral"
            size="icon"
            variant="outlined"
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>

      <GoogleFontPicker
        family={primary}
        label={primaryName}
        /* An info icon at the end of the label, which is where Astryx puts a
           note about the field rather than about what was entered. It is a
           standing fact about the family, not something to fix. */
        labelTooltip={
          notice === "not-in-catalogue"
            ? `${primary} is not a Google font, so it is not loaded here. It still applies wherever it is installed.`
            : undefined
        }
        placeholder="Search Google Fonts"
        uploadLabel={`${primaryAction} font`}
        onPick={(picked) => onPick("primary", picked?.family ?? "", generic)}
        onUpload={() => primaryFileRef.current?.click()}
      />
      <FontUploadField
        action={primaryAction}
        family={primary}
        fileStatus={fileStatus("primary")}
        generic={generic}
        inputRef={primaryFileRef}
        isLocal={primaryIsLocal}
        name={primaryName}
        uploadError={uploadError("primary")}
        onUpload={(file) => onUpload("primary", file)}
      />

      <div className={styles.fontStackRow}>
        <div className={styles.fontStackField}>
          {isFallbackOpen ? (
            <GoogleFontPicker
              family={fallback}
              label={`${font.name} bilingual fallback`}
              /* The reassurance sits here rather than under the row, because
                 what it explains is why this field may be left alone. */
              labelTooltip={
                notice === "covers-script"
                  ? `${primary} already covers ${label(script)}, so a fallback is optional.`
                  : undefined
              }
              placeholder={`Covers ${label(script)}`}
              script={script}
              uploadLabel={`${fallbackAction} font`}
              onPick={(picked) =>
                onPick("fallback", picked?.family ?? "", generic)
              }
              onUpload={() => fallbackFileRef.current?.click()}
            />
          ) : (
            <Button
              className={styles.fontStackAdd}
              scheme="neutral"
              size="small"
              variant="outlined"
              onClick={() => setWasOpened(true)}
            >
              {/* "Add a Thai fallback" reads fine and "Add a Arabic
                  fallback" does not, so the script goes after the noun and
                  no script needs an article. */}
              Add a fallback for {label(script)}
            </Button>
          )}
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

      {isFallbackOpen && (
        <FontUploadField
          action={fallbackAction}
          family={fallback}
          fileStatus={fileStatus("fallback")}
          generic={generic}
          inputRef={fallbackFileRef}
          isLocal={isLocalSlot(font, "fallback")}
          name={fallbackName}
          uploadError={uploadError("fallback")}
          onUpload={(file) => onUpload("fallback", file)}
        />
      )}

      {/* The one note that asks for something stays as text, and in both
          states, because it is the reason to open the field at all. The
          other two are facts, and sit in their field's label instead. */}
      {notice === "missing-glyphs" && (
        <p className={styles.fontStackHint} data-missing="true">
          {primary} has no {label(script)} glyphs. Without a fallback the
          browser substitutes a system font.
        </p>
      )}
    </div>
  );
}
