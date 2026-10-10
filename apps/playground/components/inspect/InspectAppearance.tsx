"use client";

import { useState, type ReactNode } from "react";
import {
  Blend,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Scan,
  SquareRoundCorner,
} from "lucide-react";
import {
  readRadius,
  withRadius,
  type PreviewRadiusCorner,
} from "@blueprint/ui";
import {
  InspectField,
  InspectIconButton,
  InspectNumber,
  InspectSection,
} from "./InspectPrimitives";
import {
  icon,
  radiusDisplay,
  radiusOptions,
  sameOf,
  type LayoutSectionProps,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

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
