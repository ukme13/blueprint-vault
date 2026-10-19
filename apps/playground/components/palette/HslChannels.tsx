"use client";

import { useMemo } from "react";
import { hexToHsl, hslToHex } from "@blueprint/ui";
import { ChannelControl } from "./ChannelControl";
import styles from "./palette-workspace.module.css";

/** Hue, saturation and lightness as three sliders: the picker's HSL format. */
export function HslChannels({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [hue, saturation, lightness] = useMemo(() => hexToHsl(value), [value]);
  const percent = (channel: number) => Math.round(channel * 1000) / 10;

  const update = (next: [number, number, number]) =>
    onChange(hslToHex(...next));

  /* Each track runs the channel it moves across its range with the other two
     held where they are, so the thumb sits on the colour it will make. */
  const hueTrack = `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360]
    .map((at) => `hsl(${at} ${saturation * 100}% ${lightness * 100}%)`)
    .join(", ")})`;
  const saturationTrack = `linear-gradient(90deg, hsl(${hue} 0% ${lightness * 100}%), hsl(${hue} 100% ${lightness * 100}%))`;
  const lightnessTrack = `linear-gradient(90deg, hsl(${hue} ${saturation * 100}% 0%), hsl(${hue} ${saturation * 100}% 50%), hsl(${hue} ${saturation * 100}% 100%))`;

  return (
    <section className={styles.colourChannels}>
      <ChannelControl
        gradient={hueTrack}
        label="Hue"
        max={360}
        min={0}
        step={0.1}
        thumbColour={value}
        value={hue}
        onChange={(next) => update([next, saturation, lightness])}
      />
      <ChannelControl
        gradient={saturationTrack}
        label="Saturation"
        max={100}
        min={0}
        step={0.1}
        thumbColour={value}
        value={percent(saturation)}
        onChange={(next) => update([hue, next / 100, lightness])}
      />
      <ChannelControl
        gradient={lightnessTrack}
        label="Lightness"
        max={100}
        min={0}
        step={0.1}
        thumbColour={value}
        value={percent(lightness)}
        onChange={(next) => update([hue, saturation, next / 100])}
      />
    </section>
  );
}
