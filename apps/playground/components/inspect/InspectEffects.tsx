"use client";

import type { PreviewNative, ResolvedElevation } from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import {
  AddButton,
  RemoveButton,
  VisibilityButton,
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

  const addEffect = () =>
    onStyleChange({
      ...style,
      shadow: (elevation.find((each) => each.id === "low") ?? elevation[0])?.id,
      isShadowHidden: undefined,
    });

  if (!own && !isDefault) {
    return (
      <InspectSection
        action={<AddButton label="Add effect" onClick={addEffect} />}
        isEmpty
        title="Effects"
        onAdd={addEffect}
      />
    );
  }

  return (
    <InspectSection title="Effects">
      <div
        className={styles.item}
        data-hidden={style.isShadowHidden || undefined}
      >
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
          onChange={(next) =>
            onStyleChange({ ...style, shadow: next, isShadowHidden: undefined })
          }
        />
        <VisibilityButton
          isHidden={style.isShadowHidden === true}
          noun="effect"
          onClick={() =>
            onStyleChange({
              ...style,
              isShadowHidden: style.isShadowHidden ? undefined : true,
            })
          }
        />
        <RemoveButton
          label="Remove effect"
          onClick={() =>
            onStyleChange({
              ...style,
              isShadowHidden: undefined,
              shadow: native.hasShadow ? null : undefined,
            })
          }
        />
      </div>
    </InspectSection>
  );
}
