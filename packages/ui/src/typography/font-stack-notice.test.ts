import { describe, expect, it } from "vitest";
import { canPreviewFamily } from "./font-stack-notice";

describe("whether the preview can render a family", () => {
  it("says nothing is wrong before a font is chosen", () => {
    /* An empty slot is not a family that failed to load, and a note under an
       empty field would be the studio talking to itself. */
    expect(
      canPreviewFamily({ family: "", isInCatalogue: false, isLocal: false }),
    ).toBe(true);
  });

  it("renders a family from the catalogue", () => {
    expect(
      canPreviewFamily({
        family: "Sarabun",
        isInCatalogue: true,
        isLocal: false,
      }),
    ).toBe(true);
  });

  it("renders an uploaded file, which is in no catalogue", () => {
    expect(
      canPreviewFamily({
        family: "Brand-Regular",
        isInCatalogue: false,
        isLocal: true,
      }),
    ).toBe(true);
  });

  it("cannot render a family that is neither", () => {
    /* Geist Sans, as a migrated project has it: a real family the browser may
       well have installed, and nothing this preview can fetch. */
    expect(
      canPreviewFamily({
        family: "Geist Sans",
        isInCatalogue: false,
        isLocal: false,
      }),
    ).toBe(false);
  });
});
