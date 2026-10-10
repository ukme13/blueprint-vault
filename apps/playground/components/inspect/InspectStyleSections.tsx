"use client";

import { useMemo } from "react";
import { Equal, Minus, Plus } from "lucide-react";
import {
  PREVIEW_FILL_TOKEN_GROUPS,
  PREVIEW_STROKE_POSITIONS,
  PREVIEW_STROKE_WEIGHTS,
  PREVIEW_TEXT_COLOR_GROUPS,
  previewTokenSelectorOptions,
  semanticVariableName,
  type PreviewInspectKind,
  type PreviewSectionFill,
  type PreviewSlotStyle,
  type PreviewStrokePosition,
  type ResolvedElevation,
  type SemanticToken,
} from "@blueprint/ui";
import { PreviewColourSwatch } from "../PreviewColourSwatch";
import {
  InspectField,
  InspectIconButton,
  InspectSection,
} from "./InspectPrimitives";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

interface StyleSectionProps {
  kind: PreviewInspectKind;
  style: PreviewSlotStyle;
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  onStyleChange: (next: PreviewSlotStyle) => void;
}

const icon = "size-3.5";

/** A token as a control shows it: its colour, and its name. */
function tokenDisplay(
  tokens: readonly SemanticToken[],
  tokenColors: Record<string, string> | undefined,
  id: string | undefined,
) {
  const token = tokens.find((each) => each.id === id);
  return token
    ? {
        icon: (
          <PreviewColourSwatch
            hex={tokenColors?.[token.id]}
            variable={semanticVariableName(token.id)}
          />
        ),
        text: token.name,
      }
    : null;
}

/** A token list with a swatch on each, from the groups a field draws from. */
function useTokenOptions(
  tokens: readonly SemanticToken[],
  tokenColors: Record<string, string> | undefined,
  groups: readonly string[],
) {
  return useMemo(
    () =>
      previewTokenSelectorOptions(tokens, groups).map((section) => ({
        ...section,
        options: section.options.map((option) => ({
          ...option,
          icon: (
            <PreviewColourSwatch
              hex={tokenColors?.[option.value]}
              variable={semanticVariableName(option.value)}
            />
          ),
        })),
      })),
    [tokens, tokenColors, groups],
  );
}

const STROKE_GROUPS = ["border"] as const;

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <InspectIconButton
      icon={<Plus aria-hidden className={icon} />}
      label={label}
      onClick={onClick}
    />
  );
}

function RemoveButton({
  label,
  isDisabled,
  onClick,
}: {
  label: string;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <InspectIconButton
      icon={<Minus aria-hidden className={icon} />}
      isDisabled={isDisabled}
      label={label}
      onClick={onClick}
    />
  );
}

/**
 * What an element is coloured: text its ink, a button what it is filled with,
 * a band its ground. Always a token; the first two can be put back to the
 * page's own, a band always has one.
 */
export function FillSection({
  kind,
  style,
  tokens,
  tokenColors,
  colourTokenId,
  bandFill,
  bandError,
  onColourChange,
  onBandFillChange,
  onStyleChange,
}: StyleSectionProps & {
  /** The text's colour token, for a text slot. */
  colourTokenId?: string;
  /** A band's own fill, which may be an image. */
  bandFill?: PreviewSectionFill | null;
  bandError?: string | null;
  onColourChange: (tokenId: string | undefined) => void;
  onBandFillChange: (tokenId: string) => void;
}) {
  const textOptions = useTokenOptions(
    tokens,
    tokenColors,
    PREVIEW_TEXT_COLOR_GROUPS,
  );
  const fillOptions = useTokenOptions(
    tokens,
    tokenColors,
    PREVIEW_FILL_TOKEN_GROUPS,
  );

  if (kind === "band") {
    const tokenId =
      bandFill?.kind === "image" ? bandFill.fallbackTokenId : bandFill?.tokenId;
    return (
      <InspectSection title="Fill">
        <div className={styles.item}>
          <TokenSelect
            display={tokenDisplay(tokens, tokenColors, tokenId)}
            hasSearch
            label="Fill"
            options={fillOptions}
            value={tokenId}
            onChange={(next) => next && onBandFillChange(next)}
          />
        </div>
        {bandError ? (
          <p className={styles.note} role="alert">
            {bandError}
          </p>
        ) : null}
        {bandFill?.kind === "image" ? (
          <p className={styles.note}>
            An image is laid over this colour. Replace or remove it from the ⋯
            on the band.
          </p>
        ) : null}
      </InspectSection>
    );
  }

  const value = kind === "button" ? style.fill : colourTokenId;
  return (
    <InspectSection title="Fill">
      <div className={styles.item}>
        <TokenSelect
          clearLabel="Default"
          display={tokenDisplay(tokens, tokenColors, value)}
          hasSearch
          label="Fill"
          options={kind === "button" ? fillOptions : textOptions}
          placeholder="Default"
          value={value}
          onChange={(next) =>
            kind === "button"
              ? onStyleChange({ ...style, fill: next })
              : onColourChange(next)
          }
        />
        <RemoveButton
          isDisabled={value === undefined}
          label="Remove fill"
          onClick={() =>
            kind === "button"
              ? onStyleChange({ ...style, fill: undefined })
              : onColourChange(undefined)
          }
        />
      </div>
    </InspectSection>
  );
}

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

/** A shadow: a level of the elevation scale. */
export function EffectsSection({
  style,
  elevation,
  onStyleChange,
}: Pick<StyleSectionProps, "style" | "onStyleChange"> & {
  elevation: readonly ResolvedElevation[];
}) {
  const level = elevation.find((each) => each.id === style.shadow);

  if (!style.shadow) {
    return (
      <InspectSection
        action={
          <AddButton
            label="Add effect"
            onClick={() =>
              onStyleChange({
                ...style,
                shadow: (
                  elevation.find((each) => each.id === "low") ?? elevation[0]
                )?.id,
              })
            }
          />
        }
        isEmpty
        title="Effects"
      />
    );
  }

  return (
    <InspectSection title="Effects">
      <div className={styles.item}>
        <TokenSelect
          display={{
            icon: <i aria-hidden className={styles.effectIcon} />,
            text: `shadow-${level?.id ?? style.shadow}`,
          }}
          label="Shadow"
          options={elevation.map((each) => ({
            value: each.id,
            label: `shadow-${each.id}`,
            description: each.name,
          }))}
          value={style.shadow}
          onChange={(next) => onStyleChange({ ...style, shadow: next })}
        />
        <RemoveButton
          label="Remove effect"
          onClick={() => onStyleChange({ ...style, shadow: undefined })}
        />
      </div>
    </InspectSection>
  );
}
