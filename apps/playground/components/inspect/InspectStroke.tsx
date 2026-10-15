"use client";

import {
  StrokeWeightIcon,
  PREVIEW_STROKE_POSITIONS,
  PREVIEW_STROKE_WEIGHTS,
  type PreviewNative,
  type PreviewStroke,
  type PreviewStrokePosition,
} from "@blueprint/ui";
import {
  InspectField,
  InspectSection,
  InspectStatic,
} from "./InspectPrimitives";
import {
  AddButton,
  RemoveButton,
  tokenDisplay,
  useTokenOptions,
  VisibilityButton,
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

const SIDE_LABEL = { top: "Top", bottom: "Bottom" } as const;

/**
 * An edge: a border token, which side of the edge it sits, and how heavy.
 *
 * Shows the edge the element is drawn with until it is changed, so an
 * outlined button does not have an empty Stroke. Changing it makes it the
 * person's; removing it is the person choosing none, which Reset undoes. An
 * element drawn with no edge starts empty, and a divider's is on one side
 * only, which is not a thing to choose.
 */
export function StrokeSection({
  style,
  native,
  tokens,
  tokenColors,
  onStyleChange,
}: Omit<StyleSectionProps, "kind"> & { native: PreviewNative }) {
  const options = useTokenOptions(tokens, tokenColors, STROKE_GROUPS);
  const firstBorder = tokens.find((token) => token.id.startsWith("border."));
  /* Taken away is not the same as never set: only the first has an edge to show. */
  const stroke: PreviewStroke | undefined =
    style.stroke === null ? undefined : (style.stroke ?? native.stroke);

  /* Changing what is hidden shows it: what is edited is what is seen. */
  const change = (next: Partial<PreviewStroke>) =>
    stroke &&
    onStyleChange({
      ...style,
      stroke: { ...stroke, ...next },
      isStrokeHidden: undefined,
    });

  const addStroke = () =>
    onStyleChange({
      ...style,
      stroke: {
        tokenId: native.stroke?.tokenId ?? firstBorder?.id ?? "border.default",
        position: "inside",
        weight: 1,
        ...(native.stroke?.side ? { side: native.stroke.side } : {}),
      },
      isStrokeHidden: undefined,
    });

  if (!stroke) {
    return (
      <InspectSection
        action={<AddButton label="Add stroke" onClick={addStroke} />}
        isEmpty
        title="Stroke"
        onAdd={addStroke}
      />
    );
  }

  return (
    <InspectSection title="Stroke">
      <div
        className={styles.item}
        data-hidden={style.isStrokeHidden || undefined}
      >
        <TokenSelect
          display={tokenDisplay(tokens, tokenColors, stroke.tokenId)}
          hasSearch
          label="Stroke colour"
          options={options}
          value={stroke.tokenId}
          onChange={(next) => next && change({ tokenId: next })}
        />
        <VisibilityButton
          isHidden={style.isStrokeHidden === true}
          noun="stroke"
          onClick={() =>
            onStyleChange({
              ...style,
              isStrokeHidden: style.isStrokeHidden ? undefined : true,
            })
          }
        />
        <RemoveButton
          label="Remove stroke"
          onClick={() =>
            onStyleChange({
              ...style,
              isStrokeHidden: undefined,
              /* Where the page draws an edge of its own, none is a choice to
                 keep; where it does not, it is only the absence. */
              stroke: native.stroke ? null : undefined,
            })
          }
        />
      </div>
      <div className={styles.row}>
        {stroke.side ? (
          <InspectField label="Edge">
            <InspectStatic label="Stroke edge">
              {SIDE_LABEL[stroke.side]}
            </InspectStatic>
          </InspectField>
        ) : (
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
                next && change({ position: next as PreviewStrokePosition })
              }
            />
          </InspectField>
        )}
        <InspectField label="Weight">
          <TokenSelect
            display={{ text: stroke.weight }}
            label="Stroke weight"
            leading={<StrokeWeightIcon />}
            options={PREVIEW_STROKE_WEIGHTS.map((weight) => ({
              value: String(weight),
              label: String(weight),
              description: `${weight}px`,
            }))}
            value={String(stroke.weight)}
            onChange={(next) => next && change({ weight: Number(next) })}
          />
        </InspectField>
      </div>
    </InspectSection>
  );
}
