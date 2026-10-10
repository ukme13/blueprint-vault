import { describe, expect, it } from "vitest";
import { seedTypographyProject } from "./seed-project";
import { readTypographyProjectData } from "./typography-project";

const stored = () =>
  JSON.parse(JSON.stringify(seedTypographyProject("Test"))) as Record<
    string,
    unknown
  >;

describe("a stored typography project and the inspector's styles", () => {
  it("reads a project without any exactly as it did, with no field added", () => {
    const read = readTypographyProjectData(stored());
    expect(read).not.toBeNull();
    expect("previewStyles" in read!).toBe(false);
  });

  it("reads the styles it holds", () => {
    const value = {
      ...stored(),
      previewStyles: { "landing-hero": { gap: 4, opacity: 80 } },
    };
    expect(readTypographyProjectData(value)?.previewStyles).toEqual({
      "landing-hero": { gap: 4, opacity: 80 },
    });
  });

  it("drops what is not readable instead of failing the project", () => {
    const value = {
      ...stored(),
      previewStyles: { "landing-hero": { gap: "wide" }, nope: 3 },
    };
    const read = readTypographyProjectData(value);
    expect(read).not.toBeNull();
    expect("previewStyles" in read!).toBe(false);
  });
});
