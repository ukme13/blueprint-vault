"use client";

import { useState } from "react";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import {
  Button,
  fallbackFileMoves,
  isLocalSlot,
  localFontKey,
  type TypeFont,
} from "@blueprint/ui";
import { FontStackEditor } from "./FontStackEditor";
import {
  forgetFontEntry,
  forgetFontSlot,
  moveLocalFont,
  storeLocalFont,
  type LocalFontStatus,
} from "./use-local-fonts";
import type { useTypographySystem } from "./use-typography-system";
import styles from "./typography-workspace.module.css";

type FontActions = Pick<
  ReturnType<typeof useTypographySystem>,
  | "addFont"
  | "removeFont"
  | "removeFontSlot"
  | "renameFont"
  | "setGoogleFont"
  | "setLocalFont"
>;

interface FontsSettingsProps extends FontActions {
  fonts: readonly TypeFont[];
  /** Whether each uploaded file is found, by `localFontKey`. */
  fileStatus: Map<string, LocalFontStatus>;
  /**
   * Called after the stored files change, so the studio's loader looks
   * again. The loader stays with the studio: the preview needs uploaded
   * faces whether or not these settings are on screen.
   */
  onFilesChange: () => void;
}

/**
 * The Fonts panel: one stack editor per font entry, and Add font.
 *
 * It keeps a font's uploaded files in step with its stack. A Google pick
 * forgets the file the slot held; removing a slot forgets its file and
 * moves the files behind it forward; an upload that is refused says why
 * beside the input that refused it.
 *
 * A section named for its trigger: the heading it had cannot sit inside
 * the trigger, which is a button.
 */
export function FontsSettings({
  fonts,
  fileStatus,
  onFilesChange,
  addFont,
  removeFont,
  removeFontSlot,
  renameFont,
  setGoogleFont,
  setLocalFont,
}: FontsSettingsProps) {
  /* Why the last picked file was refused, per slot, so the message appears
     beside the input that refused it. */
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  return (
    <section aria-label="Fonts" className={styles.settingGroup}>
      <Collapsible
        defaultIsOpen
        trigger={<span className={styles.groupTrigger}>Fonts</span>}
      >
        {fonts.map((font) => (
          <FontStackEditor
            key={font.id}
            canRemove={fonts.length > 1}
            font={font}
            fileStatus={(slot) =>
              fileStatus.get(localFontKey(font.id, slot)) ?? "checking"
            }
            uploadError={(slot) =>
              uploadErrors[localFontKey(font.id, slot)] ?? ""
            }
            onPick={(slot, family, generic) => {
              /* Picking a Google family for a slot that held a file leaves
                 those bytes referenced by nothing — and only that slot's,
                 since the other one may still point at its own. */
              if (isLocalSlot(font, slot)) {
                void forgetFontSlot(font.id, slot);
                onFilesChange();
              }
              setGoogleFont(font.id, slot, family, generic);
            }}
            onRemove={() => {
              void forgetFontEntry(font.id);
              removeFont(font.id);
            }}
            onRemoveSlot={(slot) => {
              /* The file goes first, then the ones behind it follow their
                 family forward a slot. Both before the state change, so a
                 reload mid-way finds files under the keys the stored stack
                 names — and in this order, because moving into the slot
                 being emptied would overwrite the file on its way out. */
              const moves = fallbackFileMoves(font, slot);
              if (isLocalSlot(font, slot) || moves.length > 0) {
                void forgetFontSlot(font.id, slot)
                  .then(() =>
                    Promise.all(
                      moves.map((move) =>
                        moveLocalFont(font.id, move.from, move.to),
                      ),
                    ),
                  )
                  .then(onFilesChange);
              }
              removeFontSlot(font.id, slot);
            }}
            onRename={(name) => renameFont(font.id, name)}
            onUpload={(slot, file) => {
              void storeLocalFont(font.id, slot, file).then((result) => {
                setUploadErrors((current) => ({
                  ...current,
                  [localFontKey(font.id, slot)]: result.rejected ?? "",
                }));
                if (!result.family) return;
                setLocalFont(font.id, slot, result.family);
                onFilesChange();
              });
            }}
          />
        ))}
        <Button
          className={styles.addEntryButton}
          scheme="primary"
          size="medium"
          variant="contained"
          onClick={addFont}
        >
          Add font
        </Button>
      </Collapsible>
    </section>
  );
}
