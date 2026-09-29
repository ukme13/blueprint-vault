"use client";

import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {
  MAX_REM_ROOT_PX,
  MIN_REM_ROOT_PX,
  TYPE_SCALE_UNITS,
  clampRemRootPx,
  familiesToCss,
  formatLength,
  isRoleUnlinkedOnDevice,
  type TypeFont,
  type TypeScaleUnit,
  type TypeStep,
  type TypeSystem,
} from "@blueprint/ui";
import { SheetSelector } from "../SheetSelector";
import { SpecimenTextField } from "./SpecimenTextField";
import type { TypographyProject } from "./typography-project";
import styles from "./typography-workspace.module.css";

type Preferences = Pick<
  TypographyProject,
  "unit" | "remRootPx" | "specimenText"
>;

interface TypeStepCanvasProps {
  system: TypeSystem;
  /** Largest first. */
  steps: TypeStep[];
  deviceId: string;
  preferences: Preferences;
  onPreferencesChange: (patch: Partial<Preferences>) => void;
  /** The font entry the steps render in. */
  previewFont: TypeFont | undefined;
  onPreviewFontChange: (id: string) => void;
  /** Only the weights the family ships, and the one showing. */
  previewWeights: number[];
  previewWeight: number;
  onPreviewWeightChange: (weight: number) => void;
}

/**
 * The Editor view: every step of the scale as editable specimen text, with
 * its size and the roles bound to it, under the unit and preview controls.
 */
export function TypeStepCanvas({
  system,
  steps,
  deviceId,
  preferences,
  onPreferencesChange,
  previewFont,
  onPreviewFontChange,
  previewWeights,
  previewWeight,
  onPreviewWeightChange,
}: TypeStepCanvasProps) {
  const { unit, remRootPx, specimenText } = preferences;

  return (
    <section aria-label="Generated type steps" className={styles.canvas}>
      {/* Sits above the steps so the unit is chosen where the sizes are
          read, not buried in the export dialog. */}
      <div className="flex flex-wrap items-end gap-2 pb-3">
        <SegmentedControl
          label="Size unit"
          size="sm"
          value={unit}
          onChange={(value) =>
            onPreferencesChange({ unit: value as TypeScaleUnit })
          }
        >
          {TYPE_SCALE_UNITS.map((each) => (
            <SegmentedControlItem
              key={each}
              label={each.toUpperCase()}
              value={each}
            />
          ))}
        </SegmentedControl>
        {unit === "rem" && (
          <NumberInput
            isIntegerOnly
            isWheelEnabled={false}
            label="rem root"
            labelTooltip="The html font-size rem divides by. Default 16. The export names this as a comment when it is not 16; it does not set html { font-size }."
            max={MAX_REM_ROOT_PX}
            min={MIN_REM_ROOT_PX}
            size="sm"
            units="px"
            value={remRootPx}
            width={112}
            onChange={(value) =>
              onPreferencesChange({ remRootPx: clampRemRootPx(value) })
            }
          />
        )}

        {/* Only worth showing once there is a choice to make. */}
        {system.fonts.length > 1 && (
          <SegmentedControl
            label="Preview font"
            size="sm"
            value={previewFont?.id ?? ""}
            onChange={onPreviewFontChange}
          >
            {system.fonts.map((font) => (
              <SegmentedControlItem
                key={font.id}
                label={font.name}
                value={font.id}
              />
            ))}
          </SegmentedControl>
        )}

        {previewWeights.length > 1 && (
          <div className="w-28">
            <SheetSelector
              isLabelHidden
              label="Preview weight"
              options={previewWeights.map((weight) => ({
                label: String(weight),
                value: String(weight),
              }))}
              size="sm"
              value={String(previewWeight)}
              onChange={(value) => onPreviewWeightChange(Number(value))}
            />
          </div>
        )}
      </div>
      <ul className={styles.stepList}>
        {steps.map((step) => {
          const stepRoles = system.roles.filter(
            (role) =>
              !isRoleUnlinkedOnDevice(role, deviceId) &&
              role.stepOffset === step.offset,
          );
          return (
            <li key={step.step} className={styles.stepRow}>
              <SpecimenTextField
                style={{
                  fontFamily: familiesToCss(previewFont?.families ?? []),
                  fontSize: `${step.fontSizePx}px`,
                  fontWeight: previewWeight,
                }}
                value={specimenText}
                onChange={(next) => onPreferencesChange({ specimenText: next })}
              />
              <span className={styles.stepMeta}>
                <code>{formatLength(step.fontSizePx, unit, remRootPx)}</code>
                {Math.abs(step.exactFontSizePx - step.fontSizePx) > 0.01 && (
                  <small
                    className={styles.stepExact}
                    title={`Exact ${step.exactFontSizePx.toFixed(2)}px before rounding`}
                  >
                    {step.exactFontSizePx.toFixed(2)}
                  </small>
                )}
                {step.isBase && <small>base</small>}
                {stepRoles.map((role) => (
                  <small key={role.id}>{role.id}</small>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
