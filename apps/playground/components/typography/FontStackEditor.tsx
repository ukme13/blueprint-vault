"use client";

import { useRef, useState, type RefObject } from "react";
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
import { GoogleFontPicker } from "./GoogleFontPicker";
import type { LocalFontStatus } from "./use-local-fonts";
import styles from "./typography-workspace.module.css";

/**
 * Edit one font as a primary family and up to three fallbacks behind it.
 *
 * CSS falls back per glyph, so a stack is an ordered list and nothing here
 * has to detect a script: whichever family first has the glyph renders it.
 * That is also why the studio does not check what a fallback covers. A
 * designer picking one is testing something, and a check that thinks it knows
 * better is a check in the way.
 *
 * The whole entry is a card because a stack is read as a unit — which family
 * comes first matters, and a flat list of fields does not say where one entry
 * ends and the next begins.
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
  /* One per slot, so the row pinned in each picker's menu reaches that slot's
     input and no other. This is the same separation the inputs themselves
     have, carried through to what opens them.

     Built once for every slot rather than per rendered row: a ref created
     while rendering a row would be a new object each time, and the picker
     that opens it would be holding last render's. */
  const primaryFile = useRef<HTMLInputElement | null>(null);
  const firstFile = useRef<HTMLInputElement | null>(null);
  const secondFile = useRef<HTMLInputElement | null>(null);
  const thirdFile = useRef<HTMLInputElement | null>(null);
  /* Four refs by hand rather than a map in one: the record is built here and
     handed on, and nothing reads a `current` while rendering. */
  const fileRefs: Record<FontSlot, RefObject<HTMLInputElement | null>> = {
    primary: primaryFile,
    fallback: firstFile,
    fallback2: secondFile,
    fallback3: thirdFile,
  };
  const fileRef = (slot: FontSlot) => fileRefs[slot];

  const primary = familyForSlot(font, "primary");
  const primaryFont = findGoogleFont(primary);
  const generic = primaryFont
    ? genericForCategory(primaryFont.category)
    : "sans-serif";
  const primaryIsLocal = isLocalSlot(font, "primary");

  /* What a family covers is the designer's business. Whether this preview can
     load it at all is ours, and is the one thing left worth saying. */
  const isPreviewable = canPreviewFamily({
    family: primary,
    isInCatalogue: !!primaryFont,
    isLocal: primaryIsLocal,
  });

  /* How many fallback rows to show.

     The stored families decide it, so a reload, an import and an undo all
     show the rows the stack actually has. `opened` is only for the row that
     has just been added and holds nothing yet: an empty slot cannot be
     stored, because the families array is the ordered list the browser reads
     and a blank entry in it would be a family called "". */
  const [opened, setOpened] = useState(0);
  const filled = FALLBACK_SLOTS.filter((slot) => familyForSlot(font, slot));
  const rowCount = Math.min(Math.max(filled.length, opened), MAX_FALLBACKS);
  const rows = FALLBACK_SLOTS.slice(0, rowCount);

  /* The verb is shared between the row someone reads and the `aria-label` on
     the input it clicks, so the two cannot disagree about which state a slot
     is in. */
  const slotName = (slot: FontSlot) =>
    slot === "primary"
      ? `${font.name} font`
      : `${font.name} fallback ${FALLBACK_SLOTS.indexOf(slot) + 1}`;

  const uploadFor = (slot: FontSlot) => (
    <FontUploadField
      action={fontUploadAction(isLocalSlot(font, slot), fileStatus(slot))}
      family={familyForSlot(font, slot)}
      fileStatus={fileStatus(slot)}
      generic={generic}
      inputRef={fileRef(slot)}
      isLocal={isLocalSlot(font, slot)}
      name={slotName(slot)}
      uploadError={uploadError(slot)}
      onUpload={(file) => onUpload(slot, file)}
    />
  );

  return (
    <section
      /* A stack is read as a unit — which family comes first is the whole
         meaning — so the entry is a card rather than a run of fields with a
         rule between them. Utilities rather than the module beside it: the
         card is new, and the module is not being rewritten around it. */
      aria-label={`${font.name} stack`}
      /* `fontStack` carries no layout any more. It is the scope the module
         hangs the upload-row separator inside the Typeahead menu on, and that
         menu is Astryx's — there is no prop for it. */
      className={`${styles.fontStack} flex flex-col gap-2 rounded-lg border border-border-base p-3`}
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
        {rowCount < MAX_FALLBACKS && (
          <Button
            aria-label={`Add a fallback to ${font.name}`}
            className="h-8!"
            /* `leftIcon` rather than an icon in the children: children render
               into one span, where an svg and a string stack. The icon slot is
               its own element beside the text, in the button's own flex row. */
            leftIcon={<Plus aria-hidden="true" />}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setOpened(rowCount + 1)}
          >
            Add fallback
          </Button>
        )}
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
        label={slotName("primary")}
        /* An info icon at the end of the label, which is where Astryx puts a
           note about the field rather than about what was entered. It is a
           standing fact about the family, not something to fix. */
        labelTooltip={
          isPreviewable
            ? undefined
            : `${primary} is not a Google font, so it is not loaded here. It still applies wherever it is installed.`
        }
        placeholder="Search Google Fonts"
        uploadLabel={`${fontUploadAction(primaryIsLocal, fileStatus("primary"))} font`}
        onPick={(picked) => onPick("primary", picked?.family ?? "", generic)}
        onUpload={() => fileRef("primary").current?.click()}
      />
      {uploadFor("primary")}

      {rows.map((slot) => (
        <div key={slot} className="flex flex-col gap-2">
          <div className={styles.fontStackRow}>
            <div className={styles.fontStackField}>
              <GoogleFontPicker
                family={familyForSlot(font, slot)}
                label={slotName(slot)}
                placeholder="Search Google Fonts"
                uploadLabel={`${fontUploadAction(isLocalSlot(font, slot), fileStatus(slot))} font`}
                onPick={(picked) => onPick(slot, picked?.family ?? "", generic)}
                onUpload={() => fileRef(slot).current?.click()}
              />
            </div>
            <Button
              aria-label={`Remove ${slotName(slot)}`}
              /* The same button as the entry's trash, with a different glyph:
                 they do the same kind of thing at different scopes, and one of
                 them reading as filled made it look like the louder action. */
              className="h-8! w-8! [&_svg]:size-4!"
              scheme="neutral"
              size="icon"
              variant="outlined"
              onClick={() => {
                setOpened(rowCount - 1);
                onRemoveSlot(slot);
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          {uploadFor(slot)}
        </div>
      ))}
    </section>
  );
}
