"use client";

import type { ResolvedElevation } from "@blueprint/ui";
import { InspectSection } from "./InspectPrimitives";
import {
  AddButton,
  RemoveButton,
  type StyleSectionProps,
} from "./inspect-shared";
import styles from "./inspect-panel.module.css";
import { TokenSelect } from "./TokenSelect";

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
