export type TypographyViewport = "desktop" | "mobile";
export type TypographyTextTransform = "none" | "uppercase" | "capitalize";

export interface TypographyFontFamily {
  id: string;
  name: string;
  value: string;
}

export interface ResponsiveTypographyValue {
  fontSizePx: number;
  lineHeight: number;
  letterSpacingPx: number;
}

export interface ResponsiveTypographyRole {
  id: string;
  name: string;
  group: string;
  fontFamilyId: string;
  fontWeight: number;
  textTransform: TypographyTextTransform;
  desktop: ResponsiveTypographyValue;
  mobile: ResponsiveTypographyValue;
}

export interface ResponsiveTypographySystem {
  id: string;
  name: string;
  breakpointPx: number;
  fonts: TypographyFontFamily[];
  roles: ResponsiveTypographyRole[];
}
