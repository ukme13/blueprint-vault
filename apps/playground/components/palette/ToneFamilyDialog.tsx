"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  addToneFamily,
  Button,
  CONTRAST_PROFILE_SPECS,
  CONTRAST_PROFILES,
  generateToneFamily,
  resolveSemantic,
  sourceWeight,
  toneFamilyContrast,
  toneFamilyIds,
  type ColorTrack,
  type ContrastProfile,
  type SemanticToken,
} from "@blueprint/ui";
import { AdaptiveDialog } from "../AdaptiveDialog";
import { SheetSelector } from "../SheetSelector";
import styles from "./semantic-table.module.css";

/**
 * Add a tone: a name, a track, where on it the fill sits, and a profile.
 *
 * Adds the whole family — the fill, its hover and active, a soft ground and
 * its hover, a foreground, an edge, and the label on the fill — in one go, the
 * same eight a seeded tone has, so a new brand colour is one step rather than
 * eight rows added and repointed by hand. Every token stays editable after.
 */
interface ToneFamilyDialogProps {
  isOpen: boolean;
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  onAdd: (next: SemanticToken[]) => void;
  onClose: () => void;
}

function swatch(hex: string | undefined) {
  return (
    <span
      aria-hidden
      className={styles.toneSwatch}
      style={{ background: hex ?? "transparent" }}
    />
  );
}

export function ToneFamilyDialog({
  isOpen,
  tokens,
  palettes,
  onAdd,
  onClose,
}: ToneFamilyDialogProps) {
  const firstTrack = palettes[0];
  const [name, setName] = useState("");
  const [trackId, setTrackId] = useState(firstTrack?.id ?? "");
  const [baseWeight, setBaseWeight] = useState<number | undefined>(undefined);
  const [profile, setProfile] = useState<ContrastProfile>("standard");

  /* A fresh form each time it opens, set during render rather than in an
     effect so the first frame is already the fresh one. */
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setName("");
      setTrackId(firstTrack?.id ?? "");
      setBaseWeight(undefined);
      setProfile("standard");
    }
  }

  const track = palettes.find((each) => each.id === trackId);
  const source = track ? sourceWeight(track) : undefined;
  const base = baseWeight ?? source ?? 500;
  const family = generateToneFamily(
    palettes,
    { name: name || "tone", trackId, baseWeight: base },
    profile,
  );
  const contrast = toneFamilyContrast(family, palettes, profile);
  const ids = toneFamilyIds(name);
  const taken = new Set(tokens.map((token) => token.id));
  const clashes = name ? ids.all.filter((id) => taken.has(id)) : [];
  const hex = (index: number) =>
    family[index]
      ? resolveSemantic(family[index]!, "light", palettes)?.hex
      : undefined;
  const canAdd =
    name.trim() !== "" && clashes.length === 0 && family.length > 0;

  const verdict = (ratio: number | null) =>
    ratio === null
      ? "—"
      : `${ratio.toFixed(1)}:1${ratio >= contrast.target ? "" : " (below)"}`;

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
            disabled={!canAdd}
            scheme="primary"
            size="medium"
            onClick={() => {
              const { layer, clashes: refused } = addToneFamily(tokens, family);
              if (refused.length > 0) return;
              onAdd(layer);
              onClose();
            }}
          >
            Add tone
          </Button>
        </>
      }
      isOpen={isOpen}
      title="Add tone"
      onClose={onClose}
    >
      <TextInput
        description={
          name
            ? `Adds ${ids.fill}, its states, and ${ids.onFill}.`
            : "accent, promo, tertiary. A name with a dot keeps its group."
        }
        label="Tone name"
        placeholder="accent"
        value={name}
        width="100%"
        onChange={setName}
      />
      {clashes.length > 0 && (
        <p className={styles.toneError} role="alert">
          Already in the layer: {clashes.join(", ")}.
        </p>
      )}

      <div className={styles.toneFields}>
        <SheetSelector
          label="Track"
          options={palettes.map((each) => ({
            value: each.id,
            label: each.name,
            icon: swatch(
              each.shades.find((shade) => shade.anchorType === "source")?.hex,
            ),
          }))}
          value={trackId}
          onChange={(value) => {
            setTrackId(value);
            setBaseWeight(undefined);
          }}
        />
        <SheetSelector
          label="Base weight"
          options={(track?.shades ?? []).map((shade) => ({
            value: String(shade.weight),
            label:
              shade.weight === source
                ? `${shade.weight} · locked source`
                : String(shade.weight),
            icon: swatch(shade.hex),
          }))}
          value={String(base)}
          onChange={(value) => setBaseWeight(Number(value))}
        />
      </div>

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
        <p className={styles.toneHint}>
          {CONTRAST_PROFILE_SPECS[profile].description}
        </p>
      </div>

      <section aria-label="Tone preview" className={styles.tonePreview}>
        <span className={styles.toneSwatches}>
          {swatch(hex(0))}
          {swatch(hex(1))}
          {swatch(hex(2))}
        </span>
        <span className={styles.toneHint}>
          Fill, hover, active. Label on the fill: {verdict(contrast.light)}{" "}
          light, {verdict(contrast.dark)} dark, against a {contrast.target}:1
          target.
        </span>
      </section>
    </AdaptiveDialog>
  );
}
