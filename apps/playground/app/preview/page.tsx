import { PaletteViewProvider } from "../../components/palette/PaletteViewContext";
import { SystemPreview } from "../../components/preview/SystemPreview";

/**
 * The whole design system on one page.
 *
 * Inside PaletteViewProvider so the colour-vision choice is the workspace's
 * one preference rather than a second copy that disagrees with the palette
 * studio's.
 */
export default function PreviewPage() {
  return (
    <PaletteViewProvider>
      <SystemPreview />
    </PaletteViewProvider>
  );
}
