"use client";

import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import {
  contrastDraftToOpen,
  DEFAULT_CONTRAST_SETTINGS,
  type ContrastSettings,
  type ContrastStandard,
  type ContrastTarget,
} from "@blueprint/ui";
import { SettingsSheet } from "../SettingsSheet";
import { ContrastColourField } from "./ContrastColourField";

/**
 * Contrast checks, as a phone sets them.
 *
 * The same choices the desktop shows beside the Contrast button — on or off,
 * WCAG 2 or WCAG 3, and what every shade is measured against — in a sheet.
 * Nothing is invented for the phone: the thresholds belong to each standard
 * and are not settings, so the sheet does not pretend they are.
 *
 * The switch is here for the reason it is in the Vision sheet: on a phone the
 * button opens this, so the switch is the only way to turn checks off again.
 */

interface ContrastSheetProps {
  isOpen: boolean;
  /** What is committed now, which Cancel returns to. */
  settings: ContrastSettings;
  onApply: (settings: ContrastSettings) => void;
  onClose: () => void;
}

export function ContrastSheet({
  isOpen,
  settings,
  onApply,
  onClose,
}: ContrastSheetProps) {
  const [draft, setDraft] = useState<ContrastSettings>(() =>
    contrastDraftToOpen(settings),
  );
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setDraft(contrastDraftToOpen(settings));
  }

  const update = (change: Partial<ContrastSettings>) =>
    setDraft((current) => ({ ...current, ...change }));

  return (
    <SettingsSheet
      isOpen={isOpen}
      title="Contrast"
      onApply={() => {
        onApply(draft);
        onClose();
      }}
      onCancel={onClose}
      onReset={() => setDraft(DEFAULT_CONTRAST_SETTINGS)}
    >
      <Switch
        description="Mark every shade with its contrast against the colour below."
        label="Show contrast checks"
        value={draft.isOn}
        onChange={(isOn) => update({ isOn })}
      />

      <>
        <Text aria-hidden type="label">
          Standard
        </Text>
        <SegmentedControl
          label="Standard"
          layout="fill"
          size="sm"
          value={draft.standard}
          onChange={(value) => update({ standard: value as ContrastStandard })}
        >
          <SegmentedControlItem label="WCAG 2" value="wcag2" />
          <SegmentedControlItem label="WCAG 3" value="wcag3" />
        </SegmentedControl>
      </>

      {/* One setting: what to measure against, and the colour when it is
          custom. The segmented control never draws its label — it is an
          aria-label only — so the visible one is here, as the Vision sheet
          shows "Deficiency" and "Severity". Hidden from assistive tech,
          which already has the control's own name. */}
      <>
        <Text aria-hidden type="label">
          Measure against
        </Text>
        <SegmentedControl
          label="Measure against"
          layout="fill"
          size="sm"
          value={draft.target}
          onChange={(value) => update({ target: value as ContrastTarget })}
        >
          <SegmentedControlItem label="White" value="white" />
          <SegmentedControlItem label="Black" value="black" />
          <SegmentedControlItem label="Custom" value="custom" />
        </SegmentedControl>

        {draft.target === "custom" && (
          <ContrastColourField
            label="Custom contrast colour"
            value={draft.customColour}
            onChange={(customColour) => update({ customColour })}
          />
        )}
      </>
    </SettingsSheet>
  );
}
