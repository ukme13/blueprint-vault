"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import type { DistributionMode } from "@blueprint/ui";

interface PaletteControlsProps {
  numShades: number;
  distributionMode: DistributionMode;
  maxLightness: number;
  minLightness: number;
  lightnessValues: number[];
  onNumShadesChange: (value: number) => void;
  onDistributionModeChange: (value: DistributionMode) => void;
  onMaxLightnessChange: (value: number) => void;
  onMinLightnessChange: (value: number) => void;
  onLightnessChange: (index: number, value: number) => void;
}

export function PaletteControls({
  numShades,
  distributionMode,
  maxLightness,
  minLightness,
  lightnessValues,
  onNumShadesChange,
  onDistributionModeChange,
  onMaxLightnessChange,
  onMinLightnessChange,
  onLightnessChange,
}: PaletteControlsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-neutral-700 pt-4">
        <Slider
          label="Shade Steps"
          value={numShades}
          onChange={onNumShadesChange}
          min={11}
          max={21}
          step={1}
          valueDisplay="text"
        />

        <Selector
          label="Distribution"
          value={distributionMode}
          onChange={(value: string) =>
            onDistributionModeChange(value as DistributionMode)
          }
          options={[
            { value: "linear", label: "Linear" },
            { value: "ease-in-out", label: "Ease In-Out" },
            { value: "ease-in", label: "Ease In" },
            { value: "ease-out", label: "Ease Out" },
            { value: "custom", label: "Custom" },
          ]}
        />

        <Slider
          label="Max L"
          value={maxLightness}
          onChange={onMaxLightnessChange}
          min={70}
          max={100}
          step={1}
          valueDisplay="text"
          formatValue={(value: number) => `${value}%`}
        />

        <Slider
          label="Min L"
          value={minLightness}
          onChange={onMinLightnessChange}
          min={2}
          max={30}
          step={1}
          valueDisplay="text"
          formatValue={(value: number) => `${value}%`}
        />
      </div>

      {distributionMode === "custom" && lightnessValues.length > 0 && (
        <div className="border-t border-neutral-700 pt-4">
          <p className="text-xs font-bold text-neutral-400 mb-3">
            Fine-tune Individual Lightness Values
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${numShades}, minmax(0, 1fr))`,
              gap: "0.25rem",
            }}
          >
            {lightnessValues.map((lightness, index) => (
              <div key={index} className="space-y-1">
                <Slider
                  label={`Lightness ${index}`}
                  isLabelHidden
                  orientation="vertical"
                  min={0}
                  max={100}
                  step={1}
                  value={lightness}
                  onChange={(value: number) => onLightnessChange(index, value)}
                  valueDisplay="none"
                  style={{ height: 80 }}
                />
                <div className="text-center">
                  <div className="text-[10px] font-mono font-bold text-neutral-300">
                    {Math.round(lightness)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
