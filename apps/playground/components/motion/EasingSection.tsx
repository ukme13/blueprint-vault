"use client";

import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  EASING_PRESETS,
  formatCurveText,
  matchEasingPreset,
  parseCurveText,
  setEasingCurve,
  type CubicBezier,
  type DurationToken,
  type EasingToken,
  type MotionScale,
  type MotionSpeed,
  playedMs,
} from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import { BezierEditor } from "./BezierEditor";
import { LivePreviewBar } from "./LivePreviewBar";
import styles from "./motion-studio.module.css";

const CUSTOM = "custom";

/**
 * The Easing section: which curve, a preset to start from, the curve itself to
 * pull into shape, its four numbers to type, and the live preview that plays it
 * in the duration chosen above.
 */
export function EasingSection({
  scale,
  easing,
  duration,
  speed,
  replayKey,
  onSelect,
  onChange,
}: {
  scale: MotionScale;
  easing: EasingToken | undefined;
  /** The duration the preview is played in. */
  duration: DurationToken | undefined;
  speed: MotionSpeed;
  replayKey: number;
  onSelect: (id: string) => void;
  onChange: (scale: MotionScale, editKey: string) => void;
}) {
  if (!easing) {
    return (
      <section aria-label="Easing" className={styles.settingGroup}>
        <h2>Easing</h2>
        <p className={styles.settingHint}>This scale has no easings.</p>
      </section>
    );
  }
  const preset = matchEasingPreset(easing.curve);
  const editKey = `motion:easing:${easing.id}`;
  const setCurve = (curve: CubicBezier) =>
    onChange(setEasingCurve(scale, easing.id, curve), editKey);

  return (
    <section aria-label="Easing" className={styles.settingGroup}>
      <h2>Easing</h2>
      <SheetSelector
        label="Easing token"
        options={scale.easings.map((each) => ({
          label: each.name,
          value: each.id,
        }))}
        size="md"
        value={easing.id}
        onChange={(value) => onSelect(value as string)}
      />
      <SheetSelector
        label="Easing preset"
        options={[
          ...EASING_PRESETS.map((each) => ({
            label: each.name,
            value: each.id,
          })),
          ...(preset ? [] : [{ label: "Custom", value: CUSTOM }]),
        ]}
        size="md"
        value={preset?.id ?? CUSTOM}
        onChange={(value) => {
          const chosen = EASING_PRESETS.find((each) => each.id === value);
          if (chosen) setCurve(chosen.curve);
        }}
      />
      <BezierEditor
        curve={easing.curve}
        label={easing.name}
        onChange={setCurve}
      />
      <BezierField curve={easing.curve} onChange={setCurve} />
      <div className={styles.previewRow}>
        <span className={styles.previewLabel}>Preview</span>
        <LivePreviewBar
          durationMs={playedMs(duration?.ms ?? 0, speed)}
          easingCss={easing.css}
          replayKey={replayKey}
        />
      </div>
    </section>
  );
}

/**
 * The four numbers as text. What parses is applied as it is typed; what does
 * not is left alone until it does. While the field is being typed in it is not
 * rewritten under the cursor; when the handles move it follows them.
 */
function BezierField({
  curve,
  onChange,
}: {
  curve: CubicBezier;
  onChange: (curve: CubicBezier) => void;
}) {
  const text = formatCurveText(curve);
  const [draft, setDraft] = useState(text);
  const [seen, setSeen] = useState(text);
  const [isFocused, setIsFocused] = useState(false);

  /* Followed during render rather than in an effect, so the field never shows
     a frame of the previous curve: set state while rendering is supported, and
     React runs this component again before it paints. */
  if (text !== seen) {
    setSeen(text);
    if (!isFocused) setDraft(text);
  }

  return (
    <TextInput
      label="Bezier"
      size="md"
      value={draft}
      onBlur={() => {
        setIsFocused(false);
        setDraft(text);
      }}
      onChange={(next: string) => {
        setDraft(next);
        const parsed = parseCurveText(next);
        if (parsed) onChange(parsed);
      }}
      onFocus={() => setIsFocused(true)}
    />
  );
}
