"use client";

import {
  COLOUR_FORMAT_LABELS,
  COLOUR_FORMATS,
  type ColourFormat,
} from "@blueprint/ui";
import { useColourFormat } from "./ColourFormatContext";
import { SheetSelector } from "../SheetSelector";

const OPTIONS = COLOUR_FORMATS.map((format) => ({
  label: COLOUR_FORMAT_LABELS[format],
  value: format,
}));

interface ColourFormatSelectorProps {
  label: string;
  width: number;
}

export function ColourFormatSelector({
  label,
  width,
}: ColourFormatSelectorProps) {
  const { colourFormat, setColourFormat } = useColourFormat();

  return (
    <SheetSelector
      isLabelHidden
      label={label}
      options={OPTIONS}
      placement="below"
      size="sm"
      value={colourFormat}
      width={width}
      onChange={(value) => setColourFormat(value as ColourFormat)}
    />
  );
}
