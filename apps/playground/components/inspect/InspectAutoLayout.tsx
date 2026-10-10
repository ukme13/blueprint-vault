"use client";

import { useState } from "react";
import {
  AlignVerticalSpaceBetween,
  ArrowLeftRight,
  ArrowUpDown,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  SquareDashed,
} from "lucide-react";
import {
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
  icon,
  sameOf,
  spacingOptions,
  stepDisplay,
  type LayoutSectionProps,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

const PADDING_ICONS = {
  x: <ArrowLeftRight aria-hidden className={icon} />,
  y: <ArrowUpDown aria-hidden className={icon} />,
  top: <PanelTop aria-hidden className={icon} />,
  right: <PanelRight aria-hidden className={icon} />,
  bottom: <PanelBottom aria-hidden className={icon} />,
  left: <PanelLeft aria-hidden className={icon} />,
} as const;

/** Gap and padding: the room an element holds, as steps of the spacing scale. */
export function AutoLayoutSection({
  style,
  fields,
  spacing,
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

  const paddingField = (target: PreviewPaddingTarget, label: string) => {
    const reading = readPadding(style, target);
    const step = sameOf(reading);
    return (
      <TokenSelect
        clearLabel="Default"
        display={stepDisplay(spacing, step)}
        isMixed={reading.kind === "mixed"}
        label={label}
        leading={PADDING_ICONS[target as keyof typeof PADDING_ICONS]}
        options={options}
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
              display={stepDisplay(spacing, style.gap)}
              label="Gap"
              leading={
                <AlignVerticalSpaceBetween aria-hidden className={icon} />
              }
              options={options}
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
                icon={<SquareDashed aria-hidden className={icon} />}
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
                icon={<SquareDashed aria-hidden className={icon} />}
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
