/** The three studios under /spacing, /radius and /elevation. */
export type ScaleSection = "spacing" | "radius" | "elevation";

export const SCALE_SECTION_LABEL: Record<ScaleSection, string> = {
  spacing: "Spacing",
  radius: "Radius",
  elevation: "Elevation",
};

export function scaleSectionFromPath(pathname: string): ScaleSection {
  if (pathname === "/radius" || pathname.startsWith("/radius/")) {
    return "radius";
  }
  if (pathname === "/elevation" || pathname.startsWith("/elevation/")) {
    return "elevation";
  }
  return "spacing";
}
