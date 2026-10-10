"use client";

import { useState, type ReactNode } from "react";
import {
  AlignVerticalSpaceBetween,
  ArrowLeftRight,
  ArrowUpDown,
  Blend,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Scan,
  SquareDashed,
  SquareRoundCorner,
} from "lucide-react";
import {
  readPadding,
  readRadius,
  withPadding,
  withRadius,
  type PreviewGroupReading,
  type PreviewInspectField,
  type PreviewPaddingTarget,
  type PreviewRadiusCorner,
  type PreviewSlotStyle,
  type ResolvedRadius,
  type SpacingToken,
} from "@blueprint/ui";
import {
  InspectField,
  InspectIconButton,
  InspectNumber,
  InspectSection,
} from "./InspectPrimitives";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

interface LayoutSectionProps {
  style: PreviewSlotStyle;
  fields: readonly PreviewInspectField[];
  spacing: readonly SpacingToken[];
  radius: readonly ResolvedRadius[];
  onStyleChange: (next: PreviewSlotStyle) => void;
}

const icon = "size-3.5";

/** A spacing step as the control shows it: its name, and what it comes to. */
function stepDisplay(
  spacing: readonly SpacingToken[],
  step: number | undefined,
) {
  const token = spacing.find((each) => each.step === step);
  return token
    ? {
        text: (
          <>
            {token.name}
            <small>{token.px}px</small>
          </>
        ),
      }
    : null;
}

function radiusDisplay(
  radius: readonly ResolvedRadius[],
  id: string | undefined,
) {
  const token = radius.find((each) => each.id === id);
  return token
    ? {
        text: (
          <>
            {token.name}
            <small>{token.px}px</small>
          </>
        ),
      }
    : null;
}

function spacingOptions(spacing: readonly SpacingToken[]) {
  return spacing.map((token) => ({
    value: String(token.step),
    label: token.name,
    description: `${token.px}px`,
  }));
}

function radiusOptions(radius: readonly ResolvedRadius[]) {
  return radius.map((token) => ({
    value: token.id,
    label: token.name,
    description: `${token.px}px`,
  }));
}

/** The one value a reading comes to, for the control to show. */
function sameOf<T>(reading: PreviewGroupReading<T>): T | undefined {
  return reading.kind === "same" ? reading.value : undefined;
}

const PADDING_ICONS = {
  x: <ArrowLeftRight aria-hidden className={icon} />,
  y: <ArrowUpDown aria-hidden className={icon} />,
  top: <PanelTop aria-hidden className={icon} />,
  right: <PanelRight aria-hidden className={icon} />,
  bottom: <PanelBottom aria-hidden className={icon} />,
  left: <PanelLeft aria-hidden className={icon} />,
} as const;

const CORNER_ICONS: Record<PreviewRadiusCorner, ReactNode> = {
  topLeft: <CornerUpLeft aria-hidden className={icon} />,
  topRight: <CornerUpRight aria-hidden className={icon} />,
  bottomRight: <CornerDownRight aria-hidden className={icon} />,
  bottomLeft: <CornerDownLeft aria-hidden className={icon} />,
};

const CORNER_LABELS: Record<PreviewRadiusCorner, string> = {
  topLeft: "top left",
  topRight: "top right",
  bottomRight: "bottom right",
  bottomLeft: "bottom left",
};

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

/** Opacity, and a radius for all four corners or for each. */
export function AppearanceSection({
  style,
  fields,
  radius,
  onStyleChange,
}: LayoutSectionProps) {
  const hasOpacity = fields.includes("opacity");
  const hasRadius = fields.includes("radius");
  const [isIndividual, setIsIndividual] = useState(
    () => readRadius(style, "all").kind === "mixed",
  );
  if (!hasOpacity && !hasRadius) return null;
  const options = radiusOptions(radius);

  const cornerField = (corner: PreviewRadiusCorner) => {
    const id = sameOf(readRadius(style, corner));
    return (
      <InspectField>
        <TokenSelect
          clearLabel="Default"
          display={radiusDisplay(radius, id)}
          label={`Radius ${CORNER_LABELS[corner]}`}
          leading={CORNER_ICONS[corner]}
          options={options}
          value={id}
          onChange={(next) => onStyleChange(withRadius(style, corner, next))}
        />
      </InspectField>
    );
  };

  const all = readRadius(style, "all");
  return (
    <InspectSection title="Appearance">
      {/* Without an opacity the radius is the first column, and its switch
          the second. */}
      <div
        className={styles.grid}
        style={hasOpacity ? undefined : { gridTemplateColumns: "1fr 24px" }}
      >
        {hasOpacity ? (
          <InspectField label="Opacity">
            <InspectNumber
              icon={<Blend aria-hidden className={icon} />}
              label="Opacity"
              max={100}
              min={0}
              suffix="%"
              value={style.opacity ?? 100}
              onCommit={(next) =>
                onStyleChange({
                  ...style,
                  opacity: next === 100 ? undefined : next,
                })
              }
            />
          </InspectField>
        ) : null}
        {hasRadius ? (
          <>
            <InspectField label="Corner radius">
              <TokenSelect
                clearLabel="Default"
                display={radiusDisplay(radius, sameOf(all))}
                isMixed={all.kind === "mixed"}
                label="Corner radius"
                leading={<Scan aria-hidden className={icon} />}
                options={options}
                value={sameOf(all)}
                onChange={(next) =>
                  onStyleChange(withRadius(style, "all", next))
                }
              />
            </InspectField>
            <InspectIconButton
              icon={<SquareRoundCorner aria-hidden className={icon} />}
              isPressed={isIndividual}
              label="Individual corners"
              onClick={() => setIsIndividual((current) => !current)}
            />
          </>
        ) : null}
      </div>
      {hasRadius && isIndividual ? (
        <div className={styles.grid}>
          {cornerField("topLeft")}
          {cornerField("topRight")}
          <span />
          {cornerField("bottomLeft")}
          {cornerField("bottomRight")}
          <span />
        </div>
      ) : null}
    </InspectSection>
  );
}
