"use client";

import { useState } from "react";
import {
  GapIcon,
  IndividualPaddingIcon,
  PaddingBottomIcon,
  PaddingHorizontalIcon,
  PaddingLeftIcon,
  PaddingRightIcon,
  PaddingTopIcon,
  PaddingVerticalIcon,
  TokenIcon,
  readPadding,
  withPadding,
  type PreviewPaddingTarget,
} from "@blueprint/ui";
import {
  InspectField,
  InspectIconButton,
  InspectSection,
} from "./InspectPrimitives";
import {
  sameOf,
  spacingOptions,
  stepDisplay,
  type LayoutSectionProps,
} from "./inspect-shared";
import { describePx } from "./native-metrics";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

/* Figma's own, each drawn in the 24px box a leading mark sits in. */
const PADDING_ICONS = {
  x: <PaddingHorizontalIcon />,
  y: <PaddingVerticalIcon />,
  top: <PaddingTopIcon />,
  right: <PaddingRightIcon />,
  bottom: <PaddingBottomIcon />,
  left: <PaddingLeftIcon />,
} as const;

/** Gap and padding: the room an element holds, as steps of the spacing scale. */
export function AutoLayoutSection({
  style,
  fields,
  spacing,
  metrics,
  onStyleChange,
}: LayoutSectionProps) {
  const hasGap = fields.includes("gap");
  const hasPadding = fields.includes("padding");
  /* Open from the start when the sides already disagree: a pair of fields
     cannot show that. */
  const [isIndividual, setIsIndividual] = useState(
    () =>
      readPadding(style, "x").kind === "mixed" ||
      readPadding(style, "y").kind === "mixed",
  );
  if (!hasGap && !hasPadding) return null;
  const options = spacingOptions(spacing);

  const paddingHint = (target: PreviewPaddingTarget) => {
    const sides = {
      x: [metrics?.paddingLeft, metrics?.paddingRight],
      y: [metrics?.paddingTop, metrics?.paddingBottom],
      top: [metrics?.paddingTop],
      right: [metrics?.paddingRight],
      bottom: [metrics?.paddingBottom],
      left: [metrics?.paddingLeft],
      all: [
        metrics?.paddingTop,
        metrics?.paddingRight,
        metrics?.paddingBottom,
        metrics?.paddingLeft,
      ],
    }[target];
    return describePx(sides);
  };

  const paddingField = (target: PreviewPaddingTarget, label: string) => {
    const reading = readPadding(style, target);
    const step = sameOf(reading);
    return (
      <TokenSelect
        clearLabel="Default"
        defaultHint={paddingHint(target)}
        display={stepDisplay(spacing, step)}
        isMixed={reading.kind === "mixed"}
        label={label}
        leading={PADDING_ICONS[target as keyof typeof PADDING_ICONS]}
        options={options}
        trailing={<TokenIcon />}
        value={step === undefined ? undefined : String(step)}
        onChange={(next) =>
          onStyleChange(
            withPadding(
              style,
              target,
              next === undefined ? undefined : Number(next),
            ),
          )
        }
      />
    );
  };

  return (
    <InspectSection title="Auto layout">
      {hasGap ? (
        <div className={styles.row}>
          <InspectField label="Gap">
            <TokenSelect
              clearLabel="Default"
              defaultHint={describePx([metrics?.gap])}
              display={stepDisplay(spacing, style.gap)}
              label="Gap"
              leading={<GapIcon />}
              options={options}
              trailing={<TokenIcon />}
              value={style.gap === undefined ? undefined : String(style.gap)}
              onChange={(next) =>
                onStyleChange({
                  ...style,
                  gap: next === undefined ? undefined : Number(next),
                })
              }
            />
          </InspectField>
        </div>
      ) : null}
      {hasPadding ? (
        <div className={styles.grid}>
          {isIndividual ? (
            <>
              <InspectField label="Padding">
                {paddingField("top", "Padding top")}
              </InspectField>
              <InspectField>
                {paddingField("right", "Padding right")}
              </InspectField>
              <InspectIconButton
                icon={<IndividualPaddingIcon />}
                isPressed
                label="Individual padding"
                onClick={() => setIsIndividual(false)}
              />
              <InspectField>
                {paddingField("bottom", "Padding bottom")}
              </InspectField>
              <InspectField>
                {paddingField("left", "Padding left")}
              </InspectField>
              <span />
            </>
          ) : (
            <>
              <InspectField label="Padding">
                {paddingField("x", "Padding horizontal")}
              </InspectField>
              <InspectField>
                {paddingField("y", "Padding vertical")}
              </InspectField>
              <InspectIconButton
                icon={<IndividualPaddingIcon />}
                isPressed={false}
                label="Individual padding"
                onClick={() => setIsIndividual(true)}
              />
            </>
          )}
        </div>
      ) : null}
    </InspectSection>
  );
}
