"use client";

import { useState } from "react";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Slider } from "@astryxdesign/core/Slider";
import { Switch } from "@astryxdesign/core/Switch";
import {
  COLOUR_VISION_DEFICIENCIES,
  DEFAULT_VISION_SETTINGS,
  MIN_COLOUR_VISION_SEVERITY,
  colourVisionOptionLabel,
  visionDraftToOpen,
  type ColourVisionDeficiency,
  type VisionSettings,
} from "@blueprint/ui";
import { usePaletteView } from "./palette/PaletteViewContext";
import { SettingsSheet } from "./SettingsSheet";

/**
 * Colour-vision simulation, as a phone sets it.
 *
 * The same three settings the chip carries on a desktop — on or off, which
 * deficiency, how strongly — laid out down the sheet instead of along the
 * toolbar. Radios rather than a selector: four options on a phone are quicker
 * to read in full than to open a list to find.
 *
 * The switch is the one control the desktop does not show, because there the
 * chip is the switch. Here tapping the chip opens this sheet, so without it a
 * simulation turned on from a phone could never be turned off from one.
 */

interface VisionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VisionSheet({ isOpen, onClose }: VisionSheetProps) {
  const view = usePaletteView();

  /* The draft is taken when the sheet opens, not while it is closed, so
     Cancel always returns to what was on screen when it was opened. Tracked
     by the open state rather than in an effect: React's pattern for state
     that follows a prop. */
  const [draft, setDraft] = useState<VisionSettings>(() =>
    visionDraftToOpen(view),
  );
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setDraft(visionDraftToOpen(view));
  }

  const update = (change: Partial<VisionSettings>) =>
    setDraft((current) => ({ ...current, ...change }));

  return (
    <SettingsSheet
      isOpen={isOpen}
      title="Vision simulation"
      onApply={() => {
        view.setVisionSettings(draft);
        onClose();
      }}
      onCancel={onClose}
      onReset={() => setDraft(DEFAULT_VISION_SETTINGS)}
    >
      <Switch
        description="Draw the palette as someone with this colour vision sees it."
        label="Simulate colour vision"
        value={draft.isSimulationOn}
        onChange={(isSimulationOn) => update({ isSimulationOn })}
      />

      <RadioList
        label="Deficiency"
        value={draft.deficiency}
        onChange={(value) =>
          update({ deficiency: value as ColourVisionDeficiency })
        }
      >
        {COLOUR_VISION_DEFICIENCIES.map((deficiency) => (
          <RadioListItem
            key={deficiency}
            /* Named for the severity in the draft, so the label changes as
               the slider below moves — the same renaming the desktop
               selector does below full strength. */
            label={colourVisionOptionLabel(deficiency, draft.severity)}
            value={deficiency}
          />
        ))}
      </RadioList>

      {/* Stepped at 0.1, which is exactly what Machado tabulates, and
          stopping at 0.1 because 0.0 is the switch being off. */}
      <Slider
        formatValue={(value) => `${Math.round(value * 100)}%`}
        label="Severity"
        max={1}
        min={MIN_COLOUR_VISION_SEVERITY}
        step={0.1}
        value={draft.severity}
        valueDisplay="text"
        onChange={(value: number | [number, number]) =>
          update({ severity: value as number })
        }
      />
    </SettingsSheet>
  );
}
