"use client";

import type { PreviewNative, ResolvedElevation } from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import {
  AddButton,
  RemoveButton,
  type StyleSectionProps,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

/**
 * A shadow: a level of the elevation scale.
 *
 * An element that casts one of its own, a contained button, shows it as
 * "Default" until a level is chosen; removing it is the person choosing none.
 */
export function EffectsSection({
  style,
  native,
  elevation,
  onStyleChange,
}: Pick<StyleSectionProps, "style" | "onStyleChange"> & {
  native: PreviewNative;
  elevation: readonly ResolvedElevation[];
}) {
  const own = typeof style.shadow === "string" ? style.shadow : undefined;
  const isDefault = style.shadow === undefined && native.hasShadow === true;
  const level = elevation.find((each) => each.id === own);

  if (!own && !isDefault) {
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
            text: isDefault ? "Default shadow" : `shadow-${level?.id ?? own}`,
          }}
          label="Shadow"
          options={elevation.map((each) => ({
            value: each.id,
            label: `shadow-${each.id}`,
            description: each.name,
          }))}
          value={own}
          onChange={(next) => onStyleChange({ ...style, shadow: next })}
        />
        <RemoveButton
          label="Remove effect"
          onClick={() =>
            onStyleChange({
              ...style,
              shadow: native.hasShadow ? null : undefined,
            })
          }
        />
      </div>
    </InspectSection>
  );
}
