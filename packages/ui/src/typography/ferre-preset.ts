import type {
  ResponsiveTypographyRole,
  ResponsiveTypographySystem,
  TypographyTextTransform,
} from "./responsive-types";

type RoleInput = [
  id: string,
  group: string,
  font: "display" | "content",
  weight: number,
  desktopSize: number,
  desktopLineHeight: number,
  mobileSize: number,
  mobileLineHeight: number,
  transform: TypographyTextTransform,
];

const ROLE_INPUTS: RoleInput[] = [
  ["h1", "Heading", "display", 700, 56, 1.1, 24, 1.2, "uppercase"],
  ["h2", "Heading", "display", 700, 44, 1.2, 24, 1.2, "uppercase"],
  ["h3", "Heading", "display", 700, 36, 1.3, 20, 1.3, "uppercase"],
  ["h4", "Heading", "display", 700, 28, 1.4, 18, 1.4, "uppercase"],
  ["subheading", "Heading", "display", 600, 20, 1.4, 16, 1.4, "uppercase"],
  ["blog-h1", "Blog", "content", 600, 24, 1.4, 20, 1.4, "none"],
  ["blog-h2", "Blog", "content", 600, 18, 1.4, 18, 1.4, "none"],
  ["quote-xxl", "Quote", "display", 400, 80, 1, 40, 1, "uppercase"],
  ["quote-xl", "Quote", "display", 400, 56, 1.2, 24, 1.2, "uppercase"],
  ["quote-l", "Quote", "content", 500, 24, 1.4, 18, 1.4, "none"],
  ["quote-m", "Quote", "content", 500, 20, 1.4, 16, 1.4, "none"],
  ["slider", "Other", "display", 600, 16, 1.4, 14, 1.4, "uppercase"],
  [
    "paragraph-m-emphasized",
    "Paragraph",
    "content",
    600,
    16,
    1.4,
    16,
    1.4,
    "none",
  ],
  ["paragraph-m", "Paragraph", "content", 400, 16, 1.4, 16, 1.4, "none"],
  ["paragraph-s", "Paragraph", "content", 400, 14, 1.4, 14, 1.4, "none"],
  [
    "label-button-menu-l",
    "Label",
    "display",
    700,
    28,
    1.3,
    20,
    1.3,
    "uppercase",
  ],
  ["label-button-menu-m", "Label", "display", 500, 16, 1, 16, 1, "capitalize"],
  ["label-button-menu-s", "Label", "display", 500, 14, 1, 14, 1, "capitalize"],
  ["label-link-l", "Label", "content", 500, 24, 1.4, 18, 1.4, "none"],
  ["label-link-m", "Label", "content", 500, 20, 1.4, 16, 1.4, "none"],
  ["label-title", "Label", "display", 500, 16, 1, 14, 1, "capitalize"],
  ["label-caption", "Label", "content", 400, 16, 1.4, 14, 1.4, "none"],
  ["label-input-text", "Label", "content", 400, 16, 1, 16, 1, "none"],
];

function createRole(input: RoleInput): ResponsiveTypographyRole {
  const [
    id,
    group,
    fontFamilyId,
    fontWeight,
    desktopSize,
    desktopLineHeight,
    mobileSize,
    mobileLineHeight,
    textTransform,
  ] = input;
  return {
    id,
    name: id,
    group,
    fontFamilyId,
    fontWeight,
    textTransform,
    desktop: {
      fontSizePx: desktopSize,
      lineHeight: desktopLineHeight,
      letterSpacingPx: 0,
    },
    mobile: {
      fontSizePx: mobileSize,
      lineHeight: mobileLineHeight,
      letterSpacingPx: 0,
    },
  };
}

export const FERRE_TYPOGRAPHY_PRESET: ResponsiveTypographySystem = {
  id: "ferre-en",
  name: "Ferre EN",
  breakpointPx: 768,
  fonts: [
    { id: "display", name: "Display", value: '"Orbitron", sans-serif' },
    { id: "content", name: "Content", value: '"Noto Sans Thai", sans-serif' },
  ],
  roles: ROLE_INPUTS.map(createRole),
};

export function createFerreTypographyPreset(): ResponsiveTypographySystem {
  return structuredClone(FERRE_TYPOGRAPHY_PRESET);
}
