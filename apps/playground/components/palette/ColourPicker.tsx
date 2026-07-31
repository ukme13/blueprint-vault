"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Popover } from "@astryxdesign/core/Popover";
import { TextInput } from "@astryxdesign/core/TextInput";
import { hexToHsv, hsvToHex, normalizeHex, type Hsv } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface ColourPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColourPicker({ label, value, onChange }: ColourPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

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
      <button
        aria-label={`Choose ${label}`}
        className={styles.colourPickerTrigger}
        style={{ backgroundColor: value }}
        type="button"
      />
    </Popover>
  );
}

interface ColourPickerPanelProps extends ColourPickerProps {
  onClose: () => void;
}

function ColourPickerPanel({
  label,
  value,
  onChange,
  onClose,
}: ColourPickerPanelProps) {
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const [hexDraft, setHexDraft] = useState(value);

  useEffect(() => {
    setHexDraft(value);
  }, [value]);

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

    if (event.key === "ArrowLeft") {
      next = { ...hsv, saturation: Math.max(0, hsv.saturation - step) };
    } else if (event.key === "ArrowRight") {
      next = { ...hsv, saturation: Math.min(1, hsv.saturation + step) };
    } else if (event.key === "ArrowUp") {
      next = { ...hsv, value: Math.min(1, hsv.value + step) };
    } else if (event.key === "ArrowDown") {
      next = { ...hsv, value: Math.max(0, hsv.value - step) };
    } else {
      return;
    }

    event.preventDefault();
    updateColour(next);
  };

  const updateHexDraft = (nextValue: string) => {
    setHexDraft(nextValue);

    try {
      onChange(normalizeHex(nextValue));
    } catch {
      // Keep the incomplete value visible until it becomes valid.
    }
  };

  return (
    <section className={styles.colourPicker}>
      <header className={styles.colourPickerHeader}>
        <strong>
          HEX
          <svg
            aria-hidden="true"
            fill="none"
            height="14"
            viewBox="0 0 16 16"
            width="14"
          >
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </strong>
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
      </header>

      <button
        aria-label={`${label} saturation ${Math.round(hsv.saturation * 100)} percent and brightness ${Math.round(hsv.value * 100)} percent`}
        className={styles.colourField}
        style={{
          backgroundColor: `hsl(${hsv.hue} 100% 50%)`,
        }}
        type="button"
        onKeyDown={handleAreaKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateSaturationAndValue(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateSaturationAndValue(event);
          }
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

      <footer className={styles.colourPickerFooter}>
        <span className={styles.colourHexInput}>
          <TextInput
            isLabelHidden
            label={`${label} HEX value`}
            size="lg"
            startIcon={
              <i
                className={styles.colourHexSwatch}
                style={{ backgroundColor: value }}
              />
            }
            value={hexDraft}
            width="100%"
            onChange={updateHexDraft}
            onEnter={() => {
              try {
                onChange(normalizeHex(hexDraft));
                onClose();
              } catch {
                setHexDraft(value);
              }
            }}
          />
        </span>
      </footer>
    </section>
  );
}
