"use client";

import { Collapsible } from "@astryxdesign/core/Collapsible";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  resolveSpacing,
  resolveSpacingRamp,
  resolveSpacingSlots,
  type SpacingScale,
  type SpacingUnit,
} from "@blueprint/ui";
import { SpacingTokenRow } from "./SpacingTokenRow";
import type { SpacingView } from "./use-spacing-view";
import styles from "./scale-workspace.module.css";

interface SpacingStepListProps {
  scale: SpacingScale;
  view: SpacingView;
  /** Keep a step, or prune it: one step in history. */
  onToggleStep: (step: number) => void;
}

/**
 * The whole ramp, in the inspector: every offered step, pruned ones dimmed,
 * each kept or pruned in place. A click on a kept row puts the preview's
 * active slot on that step, so the list can be browsed with the preview in
 * view on the canvas beside it.
 */
export function SpacingStepList({
  scale,
  view,
  onToggleStep,
}: SpacingStepListProps) {
  const { preview, activeSlot, onPreviewChange } = view;
  const slots = resolveSpacingSlots(resolveSpacing(scale), preview.slots);
  const selected = slots?.[activeSlot];

  return (
    <section
      aria-label="Generated spacing steps"
      className={styles.settingGroup}
    >
      <Collapsible
        defaultIsOpen
        trigger={<span className={styles.groupTrigger}>Steps</span>}
      >
        {/* The unit the values read in, above them at the right: inside
            the panel, so the trigger's row holds only its label and its
            chevron. */}
        <div className={styles.stepListUnit}>
          <SegmentedControl
            label="Value unit"
            size="sm"
            value={preview.unit}
            onChange={(value) =>
              onPreviewChange({ unit: value as SpacingUnit })
            }
          >
            <SegmentedControlItem label="px" value="px" />
            <SegmentedControlItem label="rem" value="rem" />
          </SegmentedControl>
        </div>
        <ol className={styles.tokenList}>
          {resolveSpacingRamp(scale).map((token) => (
            <SpacingTokenRow
              key={token.step}
              isKept={token.kept}
              isSelected={token.kept && token.step === selected?.step}
              token={token}
              unit={preview.unit}
              onSelect={() =>
                onPreviewChange({
                  slots: { ...preview.slots, [activeSlot]: token.step },
                })
              }
              onToggleKept={() => onToggleStep(token.step)}
            />
          ))}
        </ol>
      </Collapsible>
    </section>
  );
}
