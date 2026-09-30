import { Suspense, type ReactNode } from "react";
import { ColourFormatProvider } from "../../components/palette/ColourFormatContext";
import { ScaleStudio } from "../../components/scale/ScaleStudio";

/**
 * Spacing, radius and elevation share this layout so undo history survives
 * moving between their routes.
 */
export default function ScaleStudiosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ColourFormatProvider>
      {/* The studio reads its view from the query string, which a
          prerendered page may only do inside a Suspense boundary. */}
      <Suspense fallback={null}>
        <ScaleStudio />
      </Suspense>
      {children}
    </ColourFormatProvider>
  );
}
