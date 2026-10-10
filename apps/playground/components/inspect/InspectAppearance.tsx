"use client";

import { useState, type ReactNode } from "react";
import {
  CornerBottomLeftIcon,
  CornerBottomRightIcon,
  CornerRadiusIcon,
  CornerTopLeftIcon,
  CornerTopRightIcon,
  OpacityIcon,
  TokenIcon,
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
  radiusDisplay,
  radiusOptions,
  sameOf,
  type LayoutSectionProps,
} from "./inspect-shared";
import { describePx, type NativeMetrics } from "./native-metrics";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

const CORNER_ICONS: Record<PreviewRadiusCorner, ReactNode> = {
  topLeft: <CornerTopLeftIcon />,
  topRight: <CornerTopRightIcon />,
  bottomRight: <CornerBottomRightIcon />,
  bottomLeft: <CornerBottomLeftIcon />,
};

const CORNER_METRIC: Record<PreviewRadiusCorner, keyof NativeMetrics> = {
  topLeft: "radiusTopLeft",
  topRight: "radiusTopRight",
  bottomRight: "radiusBottomRight",
  bottomLeft: "radiusBottomLeft",
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
  metrics,
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
          defaultHint={describePx([metrics?.[CORNER_METRIC[corner]]])}
          display={radiusDisplay(radius, id)}
          label={`Radius ${CORNER_LABELS[corner]}`}
          leading={CORNER_ICONS[corner]}
          options={options}
          trailing={<TokenIcon />}
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
              icon={<OpacityIcon />}
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
                defaultHint={describePx(
                  Object.values(CORNER_METRIC).map((key) => metrics?.[key]),
                )}
                display={radiusDisplay(radius, sameOf(all))}
                isMixed={all.kind === "mixed"}
                label="Corner radius"
                leading={<CornerRadiusIcon />}
                options={options}
                trailing={<TokenIcon />}
                value={sameOf(all)}
                onChange={(next) =>
                  onStyleChange(withRadius(style, "all", next))
                }
              />
            </InspectField>
            <InspectIconButton
              icon={<CornerRadiusIcon />}
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
