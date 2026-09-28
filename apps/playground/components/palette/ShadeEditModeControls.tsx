"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { useToast } from "@astryxdesign/core/Toast";
import { Button, type ShadeItem } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface ShadeEditModeControlsProps {
  shade: ShadeItem;
  isSheet: boolean;
  onAnchorChange: (hex: string | null) => void;
  onManualChange: (hex: string | null) => void;
}

/**
 * How an edited shade holds its colour, and the way back: Manual or Anchor
 * and Reset. On a phone the choice is a switch, always shown; in the
 * popover it is a segmented control, shown once the shade has been edited.
 *
 * Never for the source shade. It is the track's seed and always the anchor,
 * so the caller leaves this out while the source is being edited.
 */
export function ShadeEditModeControls({
  shade,
  isSheet,
  onAnchorChange,
  onManualChange,
}: ShadeEditModeControlsProps) {
  const toast = useToast();
  const isAnchor = shade.anchorType === "custom";

  const changeEditMode = (mode: string) => {
    const becomesAnchor = mode === "anchor";
    if (becomesAnchor) {
      onAnchorChange(shade.hex);
    } else {
      onManualChange(shade.hex);
    }
    toast({
      autoHideDuration: 1800,
      body: becomesAnchor ? "Changed to anchor" : "Changed to manual colour",
      type: "info",
      uniqueID: "shade-anchor-change",
    });
  };

  const resetColour = () => {
    if (isAnchor) {
      onAnchorChange(null);
    } else {
      onManualChange(null);
    }
    toast({
      autoHideDuration: 1800,
      body: isAnchor ? "Anchor removed" : "Manual colour reset",
      type: "info",
      uniqueID: "shade-anchor-change",
    });
  };

  return (
    <>
      {isSheet && (
        <div className={styles.shadeSheetAnchor}>
          <Switch
            description="Hold this colour and bend the scale around it."
            label="Anchor"
            value={isAnchor}
            onChange={(next) => changeEditMode(next ? "anchor" : "manual")}
          />
        </div>
      )}

      {(shade.isOverridden || isAnchor) && (
        <section
          aria-label="Shade edit controls"
          className={styles.popoverAnchorEditor}
        >
          {!isSheet && (
            <span className={styles.shadeEditModeControl}>
              <SegmentedControl
                label="Shade colour mode"
                layout="fill"
                size="sm"
                value={isAnchor ? "anchor" : "manual"}
                onChange={changeEditMode}
              >
                <SegmentedControlItem label="Manual" value="manual" />
                <SegmentedControlItem label="Anchor" value="anchor" />
              </SegmentedControl>
            </span>
          )}
          <Button
            scheme="neutral"
            size="xs"
            variant="text"
            onClick={resetColour}
          >
            Reset
          </Button>
        </section>
      )}
    </>
  );
}
