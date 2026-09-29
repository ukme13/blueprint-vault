"use client";

import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  workspacePresetDetails,
  type WorkspacePreset,
} from "@blueprint/ui";
import styles from "./new-project-dialog.module.css";

/**
 * The panel beside the gallery, as Adobe's New Document keeps one: the
 * name, what the chosen preset starts with, and the buttons that act on
 * it. Every value is the preset's own or the default it leaves alone, so
 * Blueprint seed reads as violet, teal and Inter at a Major Third rather
 * than as blanks.
 */
export function PresetDetails({
  preset,
  name,
  error,
  onNameChange,
  onCancel,
}: {
  preset: WorkspacePreset;
  name: string;
  error: string;
  onNameChange: (name: string) => void;
  onCancel: () => void;
}) {
  const details = workspacePresetDetails(preset);
  const ratio = details.ratioName
    ? `${details.ratioName}, ${details.ratio}`
    : String(details.ratio);

  return (
    <aside aria-label="Preset details" className={styles.details}>
      <Text type="supporting" weight="semibold">
        Preset details
      </Text>
      <TextInput
        label="Project name"
        placeholder={DEFAULT_WORKSPACE_NAME}
        value={name}
        onChange={onNameChange}
      />

      <section aria-label="Colour" className={styles.detailGroup}>
        <Text type="supporting" weight="semibold">
          Colour
        </Text>
        <dl className={styles.detailList}>
          <Swatch hex={details.primaryHex} label="Primary" />
          <Swatch hex={details.secondaryHex} label="Secondary" />
          <Swatch hex={details.neutralHex} label="Neutral" />
        </dl>
      </section>

      <section aria-label="Type" className={styles.detailGroup}>
        <Text type="supporting" weight="semibold">
          Type
        </Text>
        <dl className={styles.detailList}>
          <Detail label="Typeface" value={details.typeface} />
          <Detail label="Base size" value={`${details.baseFontSizePx}px`} />
          <Detail label="Scale" value={ratio} />
          <Detail label="Steps" value={String(details.stepCount)} />
        </dl>
      </section>

      <Text type="supporting">{preset.summary}</Text>
      {error ? (
        <p className={styles.detailError} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.detailActions}>
        <Button
          scheme="neutral"
          type="button"
          variant="text"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button scheme="primary" type="submit">
          Create workspace
        </Button>
      </div>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <dt>
        <Text type="supporting">{label}</Text>
      </dt>
      <dd>
        <Text type="label">{value}</Text>
      </dd>
    </div>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className={styles.detailRow}>
      <dt>
        <Text type="supporting">{label}</Text>
      </dt>
      <dd>
        <span
          aria-hidden="true"
          className={styles.detailSwatch}
          style={{ background: hex }}
        />
        <Text type="code">{hex.toUpperCase()}</Text>
      </dd>
    </div>
  );
}
