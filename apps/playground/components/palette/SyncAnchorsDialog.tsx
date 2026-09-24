"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  Button,
  CONTRAST_PROFILE_SPECS,
  CONTRAST_PROFILES,
  syncTonesWithAnchors,
  type ColorTrack,
  type ContrastProfile,
  type SemanticToken,
} from "@blueprint/ui";
import { AdaptiveDialog } from "../AdaptiveDialog";
import styles from "./semantic-table.module.css";

/**
 * Point the seeded tones back at the palette's locked source colours.
 *
 * Asks first, and says how much will move: a sync rewrites the references of
 * every seeded tone that has drifted from its source, and some of those will
 * be tokens somebody repointed on purpose. Names, removed tones and tones
 * added by hand are left alone. It is one step of the Semantics history, so
 * Undo takes it back.
 */
interface SyncAnchorsDialogProps {
  isOpen: boolean;
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  onSync: (next: SemanticToken[]) => void;
  onClose: () => void;
}

export function SyncAnchorsDialog({
  isOpen,
  tokens,
  palettes,
  onSync,
  onClose,
}: SyncAnchorsDialogProps) {
  const [profile, setProfile] = useState<ContrastProfile>("standard");
  const { layer, changed } = syncTonesWithAnchors(tokens, palettes, profile);

  return (
    <AdaptiveDialog
      footer={
        <>
          <Button
            scheme="neutral"
            size="medium"
            variant="outlined"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={changed.length === 0}
            scheme="primary"
            size="medium"
            onClick={() => {
              onSync(layer);
              onClose();
            }}
          >
            {changed.length === 0
              ? "In sync"
              : `Sync ${changed.length} ${changed.length === 1 ? "token" : "tokens"}`}
          </Button>
        </>
      }
      isOpen={isOpen}
      title="Sync with palette anchors"
      onClose={onClose}
    >
      <p className={styles.toneHint}>
        Moves each seeded tone to its track&apos;s locked source colour, with
        hover, active and edge set by the profile. Names, tones you removed and
        tones you added stay as they are.
      </p>

      <div className={styles.toneFields}>
        <span className={styles.toneFieldLabel}>Contrast profile</span>
        <SegmentedControl
          label="Contrast profile"
          layout="fill"
          size="sm"
          value={profile}
          onChange={(value) => setProfile(value as ContrastProfile)}
        >
          {CONTRAST_PROFILES.map((each) => (
            <SegmentedControlItem
              key={each}
              label={CONTRAST_PROFILE_SPECS[each].label}
              value={each}
            />
          ))}
        </SegmentedControl>
      </div>

      <p aria-live="polite" className={styles.toneSummary}>
        {changed.length === 0
          ? "Every seeded tone already matches the palette."
          : `${changed.length} ${changed.length === 1 ? "token" : "tokens"} will change, including any you repointed by hand.`}
      </p>
    </AdaptiveDialog>
  );
}
