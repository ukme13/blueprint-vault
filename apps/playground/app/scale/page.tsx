import { ColourFormatProvider } from "../../components/palette/ColourFormatContext";
import { SpacingStudio } from "../../components/scale/SpacingStudio";

/** The scale studio: spacing today, radius and elevation to follow. */
export default function ScalePage() {
  /* The export dialog reads the shared colour format, so this page provides it
     the way the palette studio does — the choice is the workspace's, not one
     studio's. */
  return (
    <ColourFormatProvider>
      <SpacingStudio />
    </ColourFormatProvider>
  );
}
