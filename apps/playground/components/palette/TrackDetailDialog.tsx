"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Dialog } from "@astryxdesign/core/Dialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  Button,
  generatePalette,
  hexToRgb,
  normalizeHex,
  rgbToOklch,
  type ColorTrack,
} from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import styles from "./palette-workspace.module.css";

interface TrackDetailDialogProps {
  palette: ColorTrack | null;
  canDelete: boolean;
  isOpen: boolean;
  onDelete: (id: string) => void;
  onDuplicate: (id: string, name: string, seedHex: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (id: string, name: string, seedHex: string) => void;
}

export function TrackDetailDialog({
  palette,
  canDelete,
  isOpen,
  onDelete,
  onDuplicate,
  onOpenChange,
  onSave,
}: TrackDetailDialogProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [seedDraft, setSeedDraft] = useState("#000000");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (!palette || !isOpen) return;
    setNameDraft(palette.name);
    setSeedDraft(palette.seedHex);
  }, [isOpen, palette]);

  const sourceOklch = useMemo(() => {
    const [lightness, chroma, hue] = rgbToOklch(...hexToRgb(seedDraft));
    return `${(lightness * 100).toFixed(2)}% ${chroma.toFixed(4)} ${hue.toFixed(2)}`;
  }, [seedDraft]);
  const previewShades = useMemo(
    () => {
      if (!palette) return [];

      return generatePalette(
        { id: palette.id, name: nameDraft, seedHex: seedDraft },
        palette.shades.map((shade) => shade.L * 100),
        palette.shades.map((shade) => shade.weight),
      ).shades;
    },
    [nameDraft, palette, seedDraft],
  );

  if (!palette) return null;

  const closeDialog = () => onOpenChange(false);
  const validName = nameDraft.trim();

  return (
    <>
      <Dialog
        className={styles.trackDetailDialog}
        isOpen={isOpen}
        maxHeight="82vh"
        padding={0}
        purpose="form"
        width={720}
        onOpenChange={onOpenChange}
      >
        <header className={styles.trackDialogHeader}>
          <input
            aria-label="Colour name"
            maxLength={40}
            placeholder="Colour name"
            type="text"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
          />
          <IconButton
            icon={
              <svg
                aria-hidden="true"
                fill="none"
                height="18"
                viewBox="0 0 18 18"
                width="18"
              >
                <path
                  d="m4 4 10 10m0-10L4 14"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              </svg>
            }
            label="Close colour details"
            size="sm"
            variant="ghost"
            onClick={closeDialog}
          />
        </header>

        <section className={styles.trackDialogContent}>
          <section className={styles.trackDialogSection}>
            <h3>Source colour</h3>
            <div className={styles.trackSourceValue}>
              <span className={styles.trackDialogColourPicker}>
                <ColourPicker
                  label={`${validName || palette.name} source colour`}
                  value={seedDraft}
                  onChange={(value) => setSeedDraft(normalizeHex(value))}
                />
              </span>
              <span>
                <small>OKLCH</small>
                <code>oklch({sourceOklch})</code>
              </span>
              <code>{seedDraft.toUpperCase()}</code>
            </div>
          </section>

          <section className={styles.trackDialogSection}>
            <h3>Shades</h3>
            <div
              aria-label={`${validName || palette.name} shade preview`}
              className={styles.trackShadePreview}
            >
              {previewShades.map((shade) => (
                <span
                  key={shade.weight}
                  style={{ backgroundColor: shade.hex }}
                  title={`${shade.weight} · ${shade.hex}`}
                />
              ))}
            </div>
          </section>
        </section>

        <footer className={styles.trackDialogFooter}>
          <Button
            disabled={!canDelete}
            scheme="error"
            size="medium"
            variant="contained"
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete
          </Button>
          <Button
            scheme="neutral"
            size="medium"
            variant="outlined"
            onClick={() => {
              onDuplicate(palette.id, validName || palette.name, seedDraft);
              closeDialog();
            }}
          >
            Duplicate
          </Button>
          <span className={styles.trackDialogFooterSpacer} />
          <Button
            scheme="neutral"
            size="medium"
            variant="text"
            onClick={closeDialog}
          >
            Cancel
          </Button>
          <Button
            disabled={!validName}
            scheme="primary"
            size="medium"
            variant="contained"
            onClick={() => {
              onSave(palette.id, validName, seedDraft);
              closeDialog();
            }}
          >
            Save changes
          </Button>
        </footer>
      </Dialog>

      <AlertDialog
        actionLabel="Delete colour"
        description={`This permanently removes ${palette.name} and all of its generated shades.`}
        isOpen={isDeleteOpen}
        title={`Delete ${palette.name}?`}
        onAction={() => {
          setIsDeleteOpen(false);
          onDelete(palette.id);
          closeDialog();
        }}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
