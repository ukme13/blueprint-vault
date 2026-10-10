"use client";

import { Equal } from "lucide-react";
import {
  PREVIEW_STROKE_POSITIONS,
  PREVIEW_STROKE_WEIGHTS,
  type PreviewStrokePosition,
} from "@blueprint/ui";
import { InspectField, InspectSection } from "./InspectPrimitives";
import {
  AddButton,
  icon,
  RemoveButton,
  tokenDisplay,
  useTokenOptions,
  type StyleSectionProps,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

const STROKE_GROUPS = ["border"] as const;

const POSITION_LABEL: Record<PreviewStrokePosition, string> = {
  inside: "Inside",
  center: "Center",
  outside: "Outside",
};

/** An edge: a border token, which side of the edge it sits, and how heavy. */
export function StrokeSection({
  style,
  tokens,
  tokenColors,
  onStyleChange,
}: StyleSectionProps) {
  const options = useTokenOptions(tokens, tokenColors, STROKE_GROUPS);
  const { stroke } = style;
  const firstBorder = tokens.find((token) => token.id.startsWith("border."));

  if (!stroke) {
    return (
      <InspectSection
        action={
          <AddButton
            label="Add stroke"
            onClick={() =>
              onStyleChange({
                ...style,
                stroke: {
                  tokenId: firstBorder?.id ?? "border.default",
                  position: "inside",
                  weight: 1,
                },
              })
            }
          />
        }
        isEmpty
        title="Stroke"
      />
    );
  }

  return (
    <InspectSection title="Stroke">
      <div className={styles.item}>
        <TokenSelect
          display={tokenDisplay(tokens, tokenColors, stroke.tokenId)}
          hasSearch
          label="Stroke colour"
          options={options}
          value={stroke.tokenId}
          onChange={(next) =>
            next &&
            onStyleChange({ ...style, stroke: { ...stroke, tokenId: next } })
          }
        />
        <RemoveButton
          label="Remove stroke"
          onClick={() => onStyleChange({ ...style, stroke: undefined })}
        />
      </div>
      <div className={styles.row}>
        <InspectField label="Position">
          <TokenSelect
            display={{ text: POSITION_LABEL[stroke.position] }}
            label="Stroke position"
            options={PREVIEW_STROKE_POSITIONS.map((position) => ({
              value: position,
              label: POSITION_LABEL[position],
            }))}
            value={stroke.position}
            onChange={(next) =>
              next &&
              onStyleChange({
                ...style,
                stroke: { ...stroke, position: next as PreviewStrokePosition },
              })
            }
          />
        </InspectField>
        <InspectField label="Weight">
          <TokenSelect
            display={{ text: stroke.weight }}
            label="Stroke weight"
            leading={<Equal aria-hidden className={icon} />}
            options={PREVIEW_STROKE_WEIGHTS.map((weight) => ({
              value: String(weight),
              label: String(weight),
              description: `${weight}px`,
            }))}
            value={String(stroke.weight)}
            onChange={(next) =>
              next &&
              onStyleChange({
                ...style,
                stroke: { ...stroke, weight: Number(next) },
              })
            }
          />
        </InspectField>
      </div>
    </InspectSection>
  );
}
