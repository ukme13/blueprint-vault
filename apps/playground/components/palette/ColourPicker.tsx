"use client";

import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Popover } from "@astryxdesign/core/Popover";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  COLOUR_FORMAT_LABELS,
  formatColour,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  isOklchInSrgb,
  oklchToHex,
  parseColour,
  rgbToHex,
  rgbToOklch,
  type Hsv,
} from "@blueprint/ui";
import { useColourFormat } from "./ColourFormatContext";
import { ColourFormatSelector } from "./ColourFormatSelector";
import styles from "./palette-workspace.module.css";

interface ColourPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  trigger?: ReactNode;
  triggerLabel?: string;
}

export function ColourPicker({
  label,
  value,
  onChange,
  trigger,
  triggerLabel,
}: ColourPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPhone = useMediaQuery("(max-width: 640px)");

  const triggerButton = (
    <button
      aria-label={triggerLabel ?? `Choose ${label}`}
      className={
        trigger ? styles.colourPickerEditTrigger : styles.colourPickerTrigger
      }
      style={trigger ? undefined : { backgroundColor: value }}
      type="button"
      onClick={isPhone ? () => setIsOpen(true) : undefined}
    >
      {trigger}
    </button>
  );

  /* On a phone the picker is a sheet from the bottom edge, not a popover in
     the middle of the screen. Opened from inside another sheet — the shade
     inspector, a track's details — it is a second modal dialog, and the top
     layer stacks it above the first with its own backdrop; closing it
     returns to the sheet underneath. No z-index is involved. */
  if (isPhone) {
    return (
      <>
        {triggerButton}
        {/* Escape closes the top sheet only. Astryx closes a sheet from a
            React keydown on its dialog, and this sheet sits inside the one it
            was opened from in the React tree, so the same Escape bubbled on
            and closed that one too.

            A div, not a span: Astryx moves a menu or popover out of any span
            above it, to the span's parent. That put the format menu outside
            this sheet's modal dialog, where the dialog makes everything inert:
            the menu showed and could not be tapped. */}
        <div
          className={styles.stackedSheet}
          onKeyDown={(event) => {
            if (event.key === "Escape") event.stopPropagation();
          }}
        >
          <BottomSheet
            height="hug"
            isOpen={isOpen}
            label={`${label} picker`}
            onOpenChange={setIsOpen}
          >
            <div className={styles.colourPickerSheet}>
              <ColourPickerPanel
                inSheet
                label={label}
                value={value}
                onChange={onChange}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </BottomSheet>
        </div>
      </>
    );
  }

  return (
    <Popover
      alignment="start"
      hasCloseButton={false}
      isOpen={isOpen}
      label={`${label} picker`}
      placement="end"
      width={340}
      content={
        <ColourPickerPanel
          label={label}
          value={value}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
        />
      }
      onOpenChange={setIsOpen}
    >
      {triggerButton}
    </Popover>
  );
}

interface ColourPickerPanelProps extends ColourPickerProps {
  onClose: () => void;
  /**
   * In a sheet on a phone: a drag on the field must not move the sheet, and
   * the sheet has no close button of its own.
   */
  inSheet?: boolean;
}

interface ChannelControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  gradient?: string;
  hasOutOfGamut?: boolean;
  thumbColour?: string;
  onChange: (value: number) => void;
}

function ChannelControl({
  label,
  value,
  min,
  max,
  step,
  gradient,
  hasOutOfGamut,
  thumbColour,
  onChange,
}: ChannelControlProps) {
  return (
    <label className={styles.colourChannel}>
      <span>{label}</span>
      <input
        aria-label={`${label} value`}
        max={max}
        min={min}
        step={step}
        type="number"
        value={Number(value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        aria-label={`${label} slider`}
        data-has-out-of-gamut={hasOutOfGamut || undefined}
        max={max}
        min={min}
        step={step}
        style={
          {
            background: gradient,
            "--slider-thumb-colour": thumbColour,
          } as CSSProperties
        }
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface OklchGradient {
  background: string;
  hasOutOfGamut: boolean;
}

function createOklchGradient(
  channel: 0 | 1 | 2,
  current: [number, number, number],
): OklchGradient {
  const ranges = [
    { min: 0, max: 1 },
    { min: 0, max: 0.4 },
    { min: 0, max: 360 },
  ] as const;
  const range = ranges[channel];
  let hasOutOfGamut = false;
  const samples = Array.from({ length: 49 }, (_, index) => {
    const progress = index / 48;
    const channels = [...current] as [number, number, number];
    channels[channel] = range.min + (range.max - range.min) * progress;
    const isDisplayable = isOklchInSrgb(...channels);
    if (!isDisplayable) hasOutOfGamut = true;
    return {
      colour: isDisplayable
        ? `oklch(${channels[0]} ${channels[1]} ${channels[2]})`
        : "var(--color-fg-disabled)",
      isDisplayable,
      progress,
    };
  });
  const stops: string[] = [];

  samples.forEach((sample, index) => {
    const previous = samples[index - 1];

    if (previous && previous.isDisplayable !== sample.isDisplayable) {
      const boundary = ((previous.progress + sample.progress) / 2) * 100;
      stops.push(`${previous.colour} ${boundary.toFixed(2)}%`);
      stops.push(`${sample.colour} ${boundary.toFixed(2)}%`);
    }

    stops.push(`${sample.colour} ${(sample.progress * 100).toFixed(2)}%`);
  });

  return {
    background: `linear-gradient(90deg, ${stops.join(", ")})`,
    hasOutOfGamut,
  };
}

function ColourPickerPanel({
  label,
  value,
  onChange,
  onClose,
  inSheet = false,
}: ColourPickerPanelProps) {
  /* A drag on the field is choosing a colour. In a sheet, a touch that pulls
     down from the top of the sheet's scroll is also how the sheet is swiped
     shut, and the sheet listens with native listeners, which React's
     stopPropagation reaches too late. So the field stops its own touches from
     travelling up, natively. */
  const fieldRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (!node || !inSheet) return;
      const stop = (event: TouchEvent) => event.stopPropagation();
      node.addEventListener("touchstart", stop, { passive: true });
      node.addEventListener("touchmove", stop, { passive: true });
      return () => {
        node.removeEventListener("touchstart", stop);
        node.removeEventListener("touchmove", stop);
      };
    },
    [inSheet],
  );
  const { colourFormat } = useColourFormat();
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const rgb = useMemo(
    () => hexToRgb(value).map((channel) => channel * 255),
    [value],
  );
  const [draft, setDraft] = useState(() => formatColour(value, colourFormat));

  /* Re-sync the draft during render rather than in an effect, so the input
     never shows one frame of the previous colour or format.

     A `key` would be wrong here: the value changes continuously while dragging
     the picker, and remounting would drop focus mid-edit. Setting state during
     render is supported — React re-runs this component before painting. */
  const [lastInput, setLastInput] = useState(
    () => `${value}\u0000${colourFormat}`,
  );
  const currentInput = `${value}\u0000${colourFormat}`;

  if (currentInput !== lastInput) {
    setLastInput(currentInput);
    setDraft(formatColour(value, colourFormat));
  }

  const updateColour = (next: Hsv) => onChange(hsvToHex(next));

  const updateSaturationAndValue = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    const nextValue = Math.min(
      1,
      Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height),
    );
    updateColour({ ...hsv, saturation, value: nextValue });
  };

  const handleAreaKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    let next = hsv;

    if (event.key === "ArrowLeft")
      next = { ...hsv, saturation: Math.max(0, hsv.saturation - step) };
    else if (event.key === "ArrowRight")
      next = { ...hsv, saturation: Math.min(1, hsv.saturation + step) };
    else if (event.key === "ArrowUp")
      next = { ...hsv, value: Math.min(1, hsv.value + step) };
    else if (event.key === "ArrowDown")
      next = { ...hsv, value: Math.max(0, hsv.value - step) };
    else return;

    event.preventDefault();
    updateColour(next);
  };

  const updateDraft = (nextValue: string) => {
    setDraft(nextValue);
    try {
      onChange(parseColour(nextValue, colourFormat));
    } catch {
      // Keep an incomplete value visible until it becomes valid.
    }
  };

  const commitDraft = () => {
    try {
      onChange(parseColour(draft, colourFormat));
    } catch {
      setDraft(formatColour(value, colourFormat));
      return;
    }
    /* Close after this Enter finishes. The popover returns focus to its
       trigger on close; doing that during keydown lets the same Enter land
       on the trigger and open the picker again. */
    window.setTimeout(() => onClose(), 0);
  };

  const updateRgb = (index: number, channel: number) => {
    const next = [...rgb] as [number, number, number];
    next[index] = Math.min(255, Math.max(0, channel));
    onChange(rgbToHex(next[0] / 255, next[1] / 255, next[2] / 255));
  };

  return (
    <section className={styles.colourPicker}>
      <header className={styles.colourPickerHeader}>
        <ColourFormatSelector label="Colour format" width={112} />
        {/* A phone's sheet closes from its backdrop, a swipe down or Escape, so it carries no close button of its own. */}
        {!inSheet && (
          <IconButton
            icon={
              <svg
                aria-hidden="true"
                fill="none"
                height="18"
                viewBox="0 0 18 18"
                width="18"
              >
                <path
                  d="m4 4 10 10m0-10L4 14"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              </svg>
            }
            label={`Close ${label} picker`}
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        )}
      </header>

      {colourFormat === "hex" && (
        <>
          <button
            ref={fieldRef}
            aria-label={`${label} saturation ${Math.round(hsv.saturation * 100)} percent and brightness ${Math.round(hsv.value * 100)} percent`}
            className={styles.colourField}
            style={{ backgroundColor: `hsl(${hsv.hue} 100% 50%)` }}
            type="button"
            onKeyDown={handleAreaKeyDown}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateSaturationAndValue(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                updateSaturationAndValue(event);
            }}
          >
            <span
              className={styles.colourFieldThumb}
              style={{
                backgroundColor: value,
                left: `${hsv.saturation * 100}%`,
                top: `${(1 - hsv.value) * 100}%`,
              }}
            />
          </button>
          <label className={styles.hueControl}>
            <span className={styles.visuallyHidden}>Hue</span>
            <input
              aria-label={`${label} hue`}
              max="360"
              min="0"
              step="1"
              type="range"
              value={Math.round(hsv.hue)}
              onChange={(event) =>
                updateColour({ ...hsv, hue: Number(event.target.value) })
              }
            />
          </label>
        </>
      )}

      {colourFormat === "oklch" && (
        <OklchChannels value={value} onChange={onChange} />
      )}

      {colourFormat === "rgb" && (
        <section className={styles.colourChannels}>
          {(["Red", "Green", "Blue"] as const).map((channel, index) => (
            <ChannelControl
              key={channel}
              label={channel}
              min={0}
              max={255}
              step={1}
              value={rgb[index]!}
              gradient={`linear-gradient(90deg, ${rgbToHex(...(rgb.map((item, itemIndex) => (itemIndex === index ? 0 : item) / 255) as [number, number, number]))}, ${rgbToHex(...(rgb.map((item, itemIndex) => (itemIndex === index ? 255 : item) / 255) as [number, number, number]))})`}
              thumbColour={value}
              onChange={(next) => updateRgb(index, next)}
            />
          ))}
        </section>
      )}

      <footer className={styles.colourPickerFooter}>
        <span className={styles.colourHexInput}>
          <TextInput
            isLabelHidden
            label={`${label} ${COLOUR_FORMAT_LABELS[colourFormat]} value`}
            size="lg"
            startIcon={
              <i
                className={styles.colourHexSwatch}
                style={{ backgroundColor: value }}
              />
            }
            value={draft}
            width="100%"
            onChange={updateDraft}
            onEnter={commitDraft}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.stopPropagation();
              commitDraft();
            }}
          />
        </span>
      </footer>
    </section>
  );
}

/**
 * Lightness, chroma and hue as three sliders.
 *
 * The OKLCH channels of the picker, on their own, so the phone's shade sheet
 * can show them without the picker around them: a sheet already has the room
 * a popover had to open a second popover to find.
 */
export function OklchChannels({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const oklch = useMemo(() => rgbToOklch(...hexToRgb(value)), [value]);
  const oklchGradients = useMemo(
    () => [
      createOklchGradient(0, oklch),
      createOklchGradient(1, oklch),
      createOklchGradient(2, oklch),
    ],
    [oklch],
  );

  const updateOklch = (index: number, channel: number) => {
    const next = [...oklch] as [number, number, number];
    next[index] = channel;
    onChange(oklchToHex(...next));
  };

  return (
    <section className={styles.colourChannels}>
      <ChannelControl
        label="Lightness"
        min={0}
        max={100}
        step={0.1}
        value={oklch[0] * 100}
        gradient={oklchGradients[0]!.background}
        hasOutOfGamut={oklchGradients[0]!.hasOutOfGamut}
        thumbColour={value}
        onChange={(next) => updateOklch(0, next / 100)}
      />
      <ChannelControl
        label="Chroma"
        min={0}
        max={0.4}
        step={0.001}
        value={oklch[1]}
        gradient={oklchGradients[1]!.background}
        hasOutOfGamut={oklchGradients[1]!.hasOutOfGamut}
        thumbColour={value}
        onChange={(next) => updateOklch(1, next)}
      />
      <ChannelControl
        label="Hue"
        min={0}
        max={360}
        step={0.1}
        value={oklch[2]}
        gradient={oklchGradients[2]!.background}
        hasOutOfGamut={oklchGradients[2]!.hasOutOfGamut}
        thumbColour={value}
        onChange={(next) => updateOklch(2, next)}
      />
    </section>
  );
}
