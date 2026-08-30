"use client";

import { useMemo, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Dialog } from "@astryxdesign/core/Dialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  assessTrackTransitions,
  Button,
  COLOUR_FORMAT_LABELS,
  formatColour,
  generatePalette,
  normalizeHex,
  type ColorTrack,
} from "@blueprint/ui";
import { ColourPicker } from "./ColourPicker";
import { useColourFormat } from "./ColourFormatContext";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface TrackDetailDialogProps {
  palette: ColorTrack | null;
  canDelete: boolean;
  isOpen: boolean;
  lightnessValues: number[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string, name: string, seedHex: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onResetAdjustments: (id: string) => void;
  onSave: (id: string, name: string, seedHex: string) => void;
  weights: number[];
}

export function TrackDetailDialog({
  palette,
  canDelete,
  isOpen,
  lightnessValues,
  onDelete,
  onDuplicate,
  onOpenChange,
  onResetAdjustments,
  onSave,
  weights,
}: TrackDetailDialogProps) {
  const { seen } = usePaletteView();
  const { colourFormat } = useColourFormat();
  const [nameDraft, setNameDraft] = useState("");
  const [seedDraft, setSeedDraft] = useState("#000000");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  /* Reset the drafts during render rather than in an effect, so the dialog
     never paints one frame of the previous track's values.

     A `key` on the dialog would be the usual alternative, but it does not work
     here: closing sets the active track to null, so the key would change while
     the dialog is closing and remount it mid-transition, cutting off Astryx's
     exit animation.

     Setting state during render is supported: React re-runs this component
     immediately, before painting, so no extra frame reaches the screen.
     Reference equality on the track mirrors the previous effect's [isOpen,
     palette] dependencies exactly. */
  const [lastPalette, setLastPalette] = useState<ColorTrack | null>(null);
  const activePalette = isOpen ? palette : null;

  if (activePalette !== lastPalette) {
    setLastPalette(activePalette);
    if (activePalette) {
      setNameDraft(activePalette.name);
      setSeedDraft(activePalette.seedHex);
    }
  }

  const previewShades = useMemo(() => {
    if (!palette) return [];

    return generatePalette(
      {
        id: palette.id,
        name: nameDraft,
        seedHex: seedDraft,
        adjustments: palette.adjustments,
      },
      lightnessValues,
      weights,
    ).shades;
  }, [lightnessValues, nameDraft, palette, seedDraft, weights]);

  const transitionWarnings = useMemo(
    () => assessTrackTransitions(previewShades),
    [previewShades],
  );

  if (!palette) return null;

  const closeDialog = () => onOpenChange(false);
  const validName = nameDraft.trim();
  const anchorCount = Object.keys(palette.adjustments.anchors).length;
  const manualCount = Object.keys(palette.adjustments.manualOverrides).length;
  const adjustmentCount = anchorCount + manualCount;

  return (
    <>
      <Dialog
        className={styles.trackDetailDialog}
        isOpen={isOpen}
        maxHeight="82vh"
        padding={0}
        purpose="info"
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
                <small>{COLOUR_FORMAT_LABELS[colourFormat]}</small>
                <code>{formatColour(seedDraft, colourFormat)}</code>
              </span>
            </div>
          </section>

          <section className={styles.trackDialogSection}>
            <header className={styles.trackDialogSectionHeader}>
              <h3>Shades</h3>
              {adjustmentCount > 0 && (
                <Button
                  scheme="neutral"
                  size="xs"
                  variant="text"
                  onClick={() => setIsResetOpen(true)}
                >
                  Reset changes
                </Button>
              )}
            </header>
            <div
              aria-label={`${validName || palette.name} shade preview`}
              className={styles.trackShadePreview}
            >
              {previewShades.map((shade) => (
                <span
                  key={shade.weight}
                  style={{ backgroundColor: seen(shade.hex) }}
                  title={`${shade.weight} · ${shade.hex}`}
                />
              ))}
            </div>
            {transitionWarnings.length > 0 && (
              <ul
                aria-label="Transition warnings"
                aria-live="polite"
                className={styles.trackTransitionWarnings}
              >
                {transitionWarnings.map((warning) => (
                  <li key={warning.code}>
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="14"
                      viewBox="0 0 16 16"
                      width="14"
                    >
                      <path
                        d="M8 2.5 14 13H2L8 2.5Z"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="1.25"
                      />
                      <path
                        d="M8 6v3.25m0 1.75v.1"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.25"
                      />
                    </svg>
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            )}
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
        actionLabel="Reset changes"
        description={`This removes ${anchorCount} custom ${anchorCount === 1 ? "anchor" : "anchors"} and ${manualCount} manual ${manualCount === 1 ? "shade" : "shades"} from ${palette.name}. The source colour will not change.`}
        isOpen={isResetOpen}
        title="Reset custom shade changes?"
        onAction={() => {
          setIsResetOpen(false);
          onResetAdjustments(palette.id);
        }}
        onOpenChange={setIsResetOpen}
      />

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
