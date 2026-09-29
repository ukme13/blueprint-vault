"use client";

import { useRef, useState, type RefObject } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { Plus, Trash2, X } from "lucide-react";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  FALLBACK_SLOTS,
  MAX_FALLBACKS,
  canPreviewFamily,
  familyForSlot,
  findGoogleFont,
  fontUploadAction,
  genericForCategory,
  isLocalSlot,
  type FontSlot,
  type TypeFont,
} from "@blueprint/ui";
import { FontUploadField } from "./FontUploadField";
import { FontSlotChip } from "./FontSlotChip";
import type { LocalFontStatus } from "./use-local-fonts";
import styles from "./typography-workspace.module.css";

/**
 * Edit one font as a primary family and up to three fallbacks behind it,
 * as a row of chips in the order the browser reads them.
 *
 * CSS falls back per glyph, so a stack is an ordered list and nothing here
 * has to detect a script: whichever family first has the glyph renders it.
 * That is also why the studio does not check what a fallback covers.
 *
 * Each chip opens its slot's picker, searched from Google Fonts or uploaded,
 * in a popover (a sheet on a phone). A fallback chip carries its own remove;
 * the dashed chip at the end adds the next fallback and opens its picker.
 * The file inputs and their notes stay on the card, not in the popover: the
 * picker closes as the file dialog opens, and a missing file must be seen
 * without opening anything.
 */

interface FontStackEditorProps {
  font: TypeFont;
  /** Removal is refused for the last entry: a role needs something to render. */
  canRemove: boolean;
  /** A family chosen for one slot, with the generic the stack should end on. */
  onPick: (slot: FontSlot, family: string, generic: string) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  /** Takes one fallback out, closing the gap behind it. */
  onRemoveSlot: (slot: FontSlot) => void;
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
  onRemoveSlot,
  onUpload,
  fileStatus,
  uploadError,
}: FontStackEditorProps) {
  /* One file input per slot, built once rather than per rendered chip: a
     ref created while rendering would be a new object each time. */
  const primaryFile = useRef<HTMLInputElement | null>(null);
  const firstFile = useRef<HTMLInputElement | null>(null);
  const secondFile = useRef<HTMLInputElement | null>(null);
  const thirdFile = useRef<HTMLInputElement | null>(null);
  const fileRefs: Record<FontSlot, RefObject<HTMLInputElement | null>> = {
    primary: primaryFile,
    fallback: firstFile,
    fallback2: secondFile,
    fallback3: thirdFile,
  };

  const primary = familyForSlot(font, "primary");
  const primaryFont = findGoogleFont(primary);
  const generic = primaryFont
    ? genericForCategory(primaryFont.category)
    : "sans-serif";
  const isPreviewable = canPreviewFamily({
    family: primary,
    isInCatalogue: !!primaryFont,
    isLocal: isLocalSlot(font, "primary"),
  });

  /* How many fallback chips to show: the stored families, or one more for
     a fallback just added and not yet chosen. An empty slot cannot be
     stored, since the families array is the list the browser reads. */
  const [opened, setOpened] = useState(0);
  /* The slot whose picker is open, if any. */
  const [picking, setPicking] = useState<FontSlot | null>(null);
  const showToast = useToast();
  const filled = FALLBACK_SLOTS.filter((slot) => familyForSlot(font, slot));
  const rowCount = Math.min(Math.max(filled.length, opened), MAX_FALLBACKS);
  const rows = FALLBACK_SLOTS.slice(0, rowCount);

  const slotName = (slot: FontSlot) =>
    slot === "primary"
      ? `${font.name} font`
      : `${font.name} fallback ${FALLBACK_SLOTS.indexOf(slot) + 1}`;
  const action = (slot: FontSlot) =>
    fontUploadAction(isLocalSlot(font, slot), fileStatus(slot));

  /* A slot's chip, which opens its picker. */
  const chip = (slot: FontSlot) => (
    <FontSlotChip
      family={familyForSlot(font, slot)}
      isOpen={picking === slot}
      isPrimary={slot === "primary"}
      /* A standing fact about the family, not something to fix. */
      labelTooltip={
        slot === "primary" && !isPreviewable
          ? `${primary} is not a Google font, so it is not loaded here. It still applies wherever it is installed.`
          : undefined
      }
      name={slotName(slot)}
      uploadLabel={`${action(slot)} font`}
      onOpenChange={(open) => setPicking(open ? slot : null)}
      onPick={(picked) => onPick(slot, picked?.family ?? "", generic)}
      onUpload={() => fileRefs[slot].current?.click()}
    />
  );

  return (
    <section
      aria-label={`${font.name} stack`}
      /* `fontStack` is the scope the module hangs the upload row's
         separator on, inside the Typeahead menu, which is Astryx's. */
      className={`${styles.fontStack} flex flex-col gap-3 rounded-lg border border-border-default bg-surface-raised p-4`}
    >
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
            size="icon"
            variant="outlined"
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className={styles.fontChips}>
        {chip("primary")}
        {rows.map((slot) => (
          <span key={slot} className={styles.fontChipGroup}>
            {chip(slot)}
            <button
              aria-label={`Remove ${slotName(slot)}`}
              className={styles.fontChipRemove}
              type="button"
              onClick={() => {
                setOpened(rowCount - 1);
                setPicking(null);
                onRemoveSlot(slot);
              }}
            >
              <X aria-hidden />
            </button>
          </span>
        ))}
        {/* Kept at the limit rather than removed: a control that vanishes
            reads as a bug; one that answers says no where the click was. */}
        <button
          aria-label={`Add a fallback to ${font.name}`}
          className={styles.fontChipAdd}
          type="button"
          onClick={() => {
            if (rowCount >= MAX_FALLBACKS) {
              showToast({
                body: `A stack holds ${MAX_FALLBACKS} fallbacks. Remove one to add another.`,
                /* Deduped, so leaning on the button says it once. */
                uniqueID: `fallback-limit-${font.id}`,
              });
              return;
            }
            setOpened(rowCount + 1);
            setPicking(FALLBACK_SLOTS[rowCount]!);
          }}
        >
          <Plus aria-hidden />
          Add fallback
        </button>
      </div>

      {(["primary", ...rows] as FontSlot[]).map((slot) => (
        <FontUploadField
          key={slot}
          action={action(slot)}
          family={familyForSlot(font, slot)}
          fileStatus={fileStatus(slot)}
          generic={generic}
          inputRef={fileRefs[slot]}
          isLocal={isLocalSlot(font, slot)}
          name={slotName(slot)}
          uploadError={uploadError(slot)}
          onUpload={(file) => onUpload(slot, file)}
        />
      ))}
    </section>
  );
}
