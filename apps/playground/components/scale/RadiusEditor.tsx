"use client";

import { Slider } from "@astryxdesign/core/Slider";
import {
  HybridTokenizedInput,
  MAX_RADIUS_MULTIPLIER,
  MAX_RADIUS_PX,
  MIN_RADIUS_MULTIPLIER,
  MIN_RADIUS_PX,
  bindRadiusToken,
  radiusLinkPreset,
  resolveHybridValue,
  resolveRadius,
  scaledRadiusPx,
  unlinkRadiusToken,
  type RadiusScale,
  type ResolvedRadius,
} from "@blueprint/ui";
import { renderPickerSheet } from "../picker-sheet";
import { useIsPhone } from "../use-is-phone";
import styles from "./scale-workspace.module.css";

interface RadiusEditorProps {
  scale: RadiusScale;
  onChange: (scale: RadiusScale, editKey?: string) => void;
}

export function RadiusInspector({ scale, onChange }: RadiusEditorProps) {
  return (
    <div className={styles.settingGroup}>
      <h2>Roundness</h2>
      <p className={styles.settingHint}>
        Named for what they go on. One multiplier moves the ones that still
        follow it. Type a size to unlink a use — squarer buttons, rounder cards.
      </p>
      <Slider
        label={`Roundness: ${scale.multiplier}×`}
        max={MAX_RADIUS_MULTIPLIER}
        min={MIN_RADIUS_MULTIPLIER}
        step={0.25}
        value={scale.multiplier}
        onChange={(value: number) =>
          onChange({ ...scale, multiplier: value }, "radius:multiplier")
        }
      />
    </div>
  );
}

export function RadiusCanvas({ scale, onChange }: RadiusEditorProps) {
  const tokens = resolveRadius(scale);

  return (
    <section aria-label="Radius">
      <ol className={styles.radiusList}>
        {tokens.map((token) => (
          <RadiusTokenCard
            key={token.id}
            scale={scale}
            token={token}
            onChange={onChange}
          />
        ))}
      </ol>
    </section>
  );
}

function RadiusTokenCard({
  scale,
  token,
  onChange,
}: {
  scale: RadiusScale;
  token: ResolvedRadius;
  onChange: (scale: RadiusScale, editKey?: string) => void;
}) {
  const isPhone = useIsPhone();
  const source = scale.tokens.find((each) => each.id === token.id)!;
  const presets = [radiusLinkPreset(scaledRadiusPx(source, scale.multiplier))];

  return (
    <li className={styles.radiusCard}>
      <span
        aria-hidden="true"
        className={styles.radiusSwatch}
        style={{ borderRadius: `${token.px}px` }}
      />
      <span className={styles.radiusName}>{token.name}</span>
      <code className={styles.radiusMeta}>{token.variable}</code>
      {token.scales ? (
        <HybridTokenizedInput
          decimals={0}
          isLabelHidden
          label={token.name}
          max={MAX_RADIUS_PX}
          min={MIN_RADIUS_PX}
          popoverTitle="Roundness"
          presets={presets}
          sheet={isPhone ? renderPickerSheet : undefined}
          searchPlaceholder="Search presets..."
          step={1}
          value={resolveHybridValue(
            token.px,
            presets,
            source.unlinkedPx ?? null,
            0,
          )}
          valueSuffix="px"
          onChange={(next) => {
            if (next.isPreset) {
              onChange(bindRadiusToken(scale, token.id));
              return;
            }
            onChange(
              unlinkRadiusToken(scale, token.id, next.value),
              `radius:${token.id}`,
            );
          }}
        />
      ) : (
        <span className={styles.radiusMeta}>{token.px}px · fixed</span>
      )}
      {token.scales && !token.linked ? (
        <span className={styles.radiusMeta}>unlinked</span>
      ) : null}
      <span className={styles.radiusMeta}>{token.description}</span>
    </li>
  );
}
