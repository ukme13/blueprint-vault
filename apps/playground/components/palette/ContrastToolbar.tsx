"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Button, ContrastIcon, type ContrastTarget } from "@blueprint/ui";
import { useIsPhone } from "../use-is-phone";
import { ColourPicker } from "./ColourPicker";
import { ContrastControl } from "./ContrastControl";
import { ContrastPolarityToggle } from "./ContrastPolarityToggle";
import { ContrastSheet } from "./ContrastSheet";
import { usePaletteView } from "./PaletteViewContext";
import styles from "./palette-workspace.module.css";

interface ContrastToolbarProps {
  /** What every shade is measured against, and the colour when it is custom. */
  target: ContrastTarget;
  customColour: string;
  onTargetChange: (target: ContrastTarget) => void;
  onCustomColourChange: (colour: string) => void;
}

/**
 * Everything the toolbar has for the Contrast tool.
 *
 * On a wider screen the group (Contrast, and once it is on WCAG 2 and WCAG 3),
 * and beside it, while it is on, the polarity word and what to measure
 * against. On a phone one chip that opens a sheet with the same choices. What
 * is measured against lives with the studio, which reads it for the matrix;
 * on or off, the standard and the polarity are the view's.
 */
export function ContrastToolbar({
  target,
  customColour,
  onTargetChange,
  onCustomColourChange,
}: ContrastToolbarProps) {
  const {
    isContrastModeOpen,
    setContrastModeOpen,
    closeContrastMode,
    contrastStandard,
    setContrastStandard,
    chooseContrastStandard,
    contrastPolarity,
    togglePolarity,
  } = usePaletteView();
  const isPhone = useIsPhone();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      {/* On a phone Contrast is one chip that opens its sheet; the group is
          the desktop's, where every choice is a press away. */}
      {isPhone ? (
        <Button
          aria-pressed={isContrastModeOpen}
          className={styles.contrastModeButton}
          data-active={isContrastModeOpen}
          leftIcon={<ContrastIcon className="size-3.5" />}
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={() => setIsSheetOpen(true)}
        >
          Contrast
        </Button>
      ) : (
        <ContrastControl
          isOn={isContrastModeOpen}
          standard={contrastStandard}
          onStandardChange={chooseContrastStandard}
          onTurnOff={closeContrastMode}
          onTurnOn={() => setContrastModeOpen(true)}
        />
      )}
      <ContrastSheet
        isOpen={isSheetOpen}
        settings={{
          isOn: isContrastModeOpen,
          standard: contrastStandard,
          target,
          customColour,
        }}
        onApply={(settings) => {
          setContrastModeOpen(settings.isOn);
          setContrastStandard(settings.standard);
          onTargetChange(settings.target);
          onCustomColourChange(settings.customColour);
        }}
        onClose={() => setIsSheetOpen(false)}
      />
      {isContrastModeOpen && (
        <section
          aria-label="Contrast comparison"
          className={styles.contrastOptions}
        >
          <ContrastPolarityToggle
            polarity={contrastPolarity}
            onToggle={togglePolarity}
          />
          <span className={styles.contrastTargetControl}>
            <SegmentedControl
              label="Contrast comparison colour"
              layout="fill"
              size="sm"
              value={target}
              onChange={(value) => onTargetChange(value as ContrastTarget)}
            >
              <SegmentedControlItem label="White" value="white" />
              <SegmentedControlItem label="Black" value="black" />
              <SegmentedControlItem label="Custom" value="custom" />
            </SegmentedControl>
          </span>
          {target === "custom" && (
            <span className={styles.customContrastPicker}>
              <ColourPicker
                label="custom contrast colour"
                value={customColour}
                onChange={onCustomColourChange}
              />
            </span>
          )}
        </section>
      )}
    </>
  );
}
