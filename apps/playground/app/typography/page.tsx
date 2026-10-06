"use client";

import { ColourFormatProvider } from "../../components/palette/ColourFormatContext";
import { TypographyStudio } from "../../components/typography/TypographyStudio";

/* The provider for the export dialog, which every studio shares and which
   writes colours in the notation the studio's pickers use. */
export default function Page() {
  return (
    <ColourFormatProvider>
      <TypographyStudio />
    </ColourFormatProvider>
  );
}
