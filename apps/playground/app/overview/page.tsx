import { PaletteViewProvider } from "../../components/palette/PaletteViewContext";
import { OverviewStudio } from "../../components/overview/OverviewStudio";

/**
 * Bento-style Design System Overview page.
 *
 * Displays a 4-column bento board highlighting color ramps, typography
 * hierarchy, interactive buttons, and navigation tools bound to the active
 * workspace tokens.
 */
export default function OverviewPage() {
  return (
    <PaletteViewProvider>
      <OverviewStudio />
    </PaletteViewProvider>
  );
}
