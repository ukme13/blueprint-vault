import { LANDING_STYLE_GROUPS, PREVIEW_LANDING_SLOTS } from "./landing-copy";
import type { SemanticRole } from "./types";

/**
 * Site chrome on `/preview`. Fixed ids; the inspector cannot grow the nav
 * or the footer. Copy is per slot. Type role is per style group.
 */
export const PREVIEW_NAV_LINK_IDS = [
  "shell-nav-1",
  "shell-nav-2",
  "shell-nav-3",
  "shell-nav-4",
  "shell-nav-5",
  "shell-login",
] as const;

export const PREVIEW_FOOTER_COLUMNS = [
  {
    headingId: "shell-foot-h-product",
    heading: "Product",
    links: [
      { id: "shell-foot-product-features", text: "Features" },
      { id: "shell-foot-product-pricing", text: "Pricing" },
      { id: "shell-foot-product-integrations", text: "Integrations" },
      { id: "shell-foot-product-changelog", text: "Changelog" },
    ],
  },
  {
    headingId: "shell-foot-h-company",
    heading: "Company",
    links: [
      { id: "shell-foot-company-about", text: "About us" },
      { id: "shell-foot-company-careers", text: "Careers" },
      { id: "shell-foot-company-press", text: "Press" },
      { id: "shell-foot-company-contact", text: "Contact" },
    ],
  },
  {
    headingId: "shell-foot-h-resources",
    heading: "Resources",
    links: [
      { id: "shell-foot-resources-docs", text: "Documentation" },
      { id: "shell-foot-resources-guides", text: "Guides" },
      { id: "shell-foot-resources-support", text: "Support" },
      { id: "shell-foot-resources-status", text: "Status" },
    ],
  },
  {
    headingId: "shell-foot-h-legal",
    heading: "Legal",
    links: [
      { id: "shell-foot-legal-privacy", text: "Privacy" },
      { id: "shell-foot-legal-terms", text: "Terms" },
      { id: "shell-foot-legal-cookies", text: "Cookies" },
      { id: "shell-foot-legal-licences", text: "Licences" },
    ],
  },
] as const;

const FOOTER_HEADING_IDS = PREVIEW_FOOTER_COLUMNS.map(
  (column) => column.headingId,
);

const FOOTER_LINK_IDS = PREVIEW_FOOTER_COLUMNS.flatMap((column) =>
  column.links.map((link) => link.id),
);

export const PREVIEW_FOOTER_BASE_IDS = [
  "shell-foot-copy",
  "shell-foot-credit",
] as const;

export const PREVIEW_SHELL_IDS = [
  "shell-brand",
  "shell-nav-1",
  "shell-nav-2",
  "shell-nav-3",
  "shell-nav-4",
  "shell-nav-5",
  "shell-action",
  "shell-login",
  "shell-footer",
  ...FOOTER_HEADING_IDS,
  ...FOOTER_LINK_IDS,
  ...PREVIEW_FOOTER_BASE_IDS,
] as const;

export type PreviewShellId = (typeof PREVIEW_SHELL_IDS)[number];

export const PREVIEW_SHELL_COPY: Record<PreviewShellId, string> = {
  "shell-brand": "Blueprint",
  "shell-nav-1": "Home",
  "shell-nav-2": "Features",
  "shell-nav-3": "Pricing",
  "shell-nav-4": "About us",
  "shell-nav-5": "Contact",
  "shell-action": "Sign up",
  "shell-login": "Login",
  "shell-footer":
    "A studio for palettes, type and layout — then a page that proves them.",
  "shell-foot-h-product": "Product",
  "shell-foot-h-company": "Company",
  "shell-foot-h-resources": "Resources",
  "shell-foot-h-legal": "Legal",
  "shell-foot-product-features": "Features",
  "shell-foot-product-pricing": "Pricing",
  "shell-foot-product-integrations": "Integrations",
  "shell-foot-product-changelog": "Changelog",
  "shell-foot-company-about": "About us",
  "shell-foot-company-careers": "Careers",
  "shell-foot-company-press": "Press",
  "shell-foot-company-contact": "Contact",
  "shell-foot-resources-docs": "Documentation",
  "shell-foot-resources-guides": "Guides",
  "shell-foot-resources-support": "Support",
  "shell-foot-resources-status": "Status",
  "shell-foot-legal-privacy": "Privacy",
  "shell-foot-legal-terms": "Terms",
  "shell-foot-legal-cookies": "Cookies",
  "shell-foot-legal-licences": "Licences",
  "shell-foot-copy":
    "© 2026 Blueprint. Placeholder content for typography preview.",
  "shell-foot-credit": "Made for type testing",
};

/** Earlier seeds for slots the product renamed. Exact match only. */
const RETIRED_SHELL_COPY: Partial<Record<PreviewShellId, readonly string[]>> = {
  "shell-brand": ["M", "Veltra"],
  "shell-footer": [
    "Software for desks that still care how the page reads.",
    "Business software for teams that would rather work than configure.",
  ],
  "shell-foot-copy": [
    "© 2026 M. Placeholder content for typography preview.",
    "© 2026 Veltra. Placeholder content for typography preview.",
  ],
};

export function refreshRetiredShellCopy<T extends { id: string; text: string }>(
  document: T[],
): T[] {
  return document.map((block) => {
    const retired = RETIRED_SHELL_COPY[block.id as PreviewShellId];
    if (!retired?.includes(block.text)) return block;
    return { ...block, text: PREVIEW_SHELL_COPY[block.id as PreviewShellId] };
  });
}

/** Inspector item name. Does not change when copy is rewritten. */
export const PREVIEW_SHELL_LABEL: Record<PreviewShellId, string> = {
  "shell-brand": "Brand",
  "shell-nav-1": "Home",
  "shell-nav-2": "Features",
  "shell-nav-3": "Pricing",
  "shell-nav-4": "About us",
  "shell-nav-5": "Contact",
  "shell-action": "Sign up",
  "shell-login": "Login",
  "shell-footer": "Footer",
  "shell-foot-h-product": "Product",
  "shell-foot-h-company": "Company",
  "shell-foot-h-resources": "Resources",
  "shell-foot-h-legal": "Legal",
  "shell-foot-product-features": "Features",
  "shell-foot-product-pricing": "Pricing",
  "shell-foot-product-integrations": "Integrations",
  "shell-foot-product-changelog": "Changelog",
  "shell-foot-company-about": "About us",
  "shell-foot-company-careers": "Careers",
  "shell-foot-company-press": "Press",
  "shell-foot-company-contact": "Contact",
  "shell-foot-resources-docs": "Documentation",
  "shell-foot-resources-guides": "Guides",
  "shell-foot-resources-support": "Support",
  "shell-foot-resources-status": "Status",
  "shell-foot-legal-privacy": "Privacy",
  "shell-foot-legal-terms": "Terms",
  "shell-foot-legal-cookies": "Cookies",
  "shell-foot-legal-licences": "Licences",
  "shell-foot-copy": "Copyright",
  "shell-foot-credit": "Credit",
};

export const SHELL_SLOTS: Array<{
  id: PreviewShellId;
  slot: SemanticRole;
}> = [
  { id: "shell-brand", slot: "label" },
  { id: "shell-nav-1", slot: "caption" },
  { id: "shell-nav-2", slot: "caption" },
  { id: "shell-nav-3", slot: "caption" },
  { id: "shell-nav-4", slot: "caption" },
  { id: "shell-nav-5", slot: "caption" },
  { id: "shell-action", slot: "label" },
  { id: "shell-login", slot: "caption" },
  { id: "shell-footer", slot: "caption" },
  ...FOOTER_HEADING_IDS.map((id) => ({ id, slot: "label" as const })),
  ...FOOTER_LINK_IDS.map((id) => ({ id, slot: "caption" as const })),
  ...PREVIEW_FOOTER_BASE_IDS.map((id) => ({ id, slot: "caption" as const })),
];

export interface PreviewStyleGroup {
  id: string;
  label: string;
  ids: readonly string[];
}

export const PREVIEW_STYLE_GROUPS: readonly PreviewStyleGroup[] = [
  {
    id: "nav-links",
    label: "Nav links",
    ids: PREVIEW_NAV_LINK_IDS,
  },
  {
    id: "footer-headings",
    label: "Footer headings",
    ids: FOOTER_HEADING_IDS,
  },
  {
    id: "footer-links",
    label: "Footer links",
    ids: FOOTER_LINK_IDS,
  },
  {
    id: "footer-baseline",
    label: "Footer baseline",
    ids: PREVIEW_FOOTER_BASE_IDS,
  },
  ...LANDING_STYLE_GROUPS,
];

export function previewStyleGroupFor(id: string): PreviewStyleGroup | null {
  return PREVIEW_STYLE_GROUPS.find((group) => group.ids.includes(id)) ?? null;
}

/** The ids that take a type-role patch together. Solo slots return themselves. */
export function idsSharingStyle(id: string): string[] {
  const group = previewStyleGroupFor(id);
  return group ? [...group.ids] : [id];
}

export function previewSlotLabel(id: string): string {
  if (id in PREVIEW_SHELL_LABEL) {
    return PREVIEW_SHELL_LABEL[id as PreviewShellId];
  }
  const landing = PREVIEW_LANDING_SLOTS.find((entry) => entry.id === id);
  if (landing) return landing.label ?? landing.text;
  return "Inspect";
}

export function previewInspectorChrome(id: string): {
  title: string;
  subtitle: string;
} {
  const group = previewStyleGroupFor(id);
  const label = previewSlotLabel(id);
  if (group) return { title: group.label, subtitle: label };
  return { title: "Inspect", subtitle: label };
}
