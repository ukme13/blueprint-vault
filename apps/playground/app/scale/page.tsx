import { ColourFormatProvider } from "../../components/palette/ColourFormatContext";
import { ScaleStudio } from "../../components/scale/ScaleStudio";

/** The scale studio: spacing, radius and elevation. */
export default function ScalePage() {
  /* The export dialog reads the shared colour format, so this page provides it
     the way the palette studio does — the choice is the workspace's, not one
     studio's. */
  return (
    <ColourFormatProvider>
      <ScaleStudio />
    </ColourFormatProvider>
  );
}
