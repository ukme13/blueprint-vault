import type { SemanticRole } from "./types";

/**
 * Copy for the `/preview` landing page.
 *
 * Frozen slots, same rule as site chrome: the inspector can reword and restyle,
 * it cannot add a section. Typography's article stays on `previewDocument`.
 *
 * Style groups are the repeated component parts: filter `component` + `part`,
 * then map to ids. Solo sections (hero, quote, CTA) omit those fields.
 */
export const LANDING_HERO_TITLE = "Finish the piece in one place";

export type LandingComponent =
  "section-head" | "feature-card" | "quad-card" | "split" | "plan";

export type LandingPart =
  | "eyebrow"
  | "title"
  | "lead"
  | "body"
  | "cta"
  | "name"
  | "blurb"
  | "price"
  | "unit"
  | "feature"
  | "tag";

export const PREVIEW_LANDING_SLOTS: ReadonlyArray<{
  id: string;
  slot: SemanticRole;
  preferredRoleId?: string;
  text: string;
  /** Inspector subtitle when the seed text is too long to show whole. */
  label?: string;
  component?: LandingComponent;
  part?: LandingPart;
}> = [
  { id: "landing-hero-eyebrow", slot: "label", text: "Design system studio" },
  {
    id: "landing-hero-title",
    slot: "display",
    preferredRoleId: "h2",
    text: LANDING_HERO_TITLE,
  },
  {
    id: "landing-hero-lead",
    slot: "title",
    preferredRoleId: "h6",
    text: "Blueprint is a studio for colour, type and layout. Build the tokens, then preview them on a page the way a client will.",
  },
  { id: "landing-hero-cta", slot: "label", text: "See the preview" },
  { id: "landing-hero-ghost", slot: "label", text: "Open the studio" },
  {
    id: "landing-hero-note",
    slot: "caption",
    text: "No card needed to try it",
  },

  {
    id: "landing-features-title",
    slot: "heading",
    preferredRoleId: "h6",
    component: "section-head",
    part: "title",
    text: "The system, not the dump",
  },
  {
    id: "landing-features-lead",
    slot: "title",
    preferredRoleId: "h4",
    component: "section-head",
    part: "lead",
    text: "Three things Blueprint keeps in one workspace.",
  },
  {
    id: "landing-feat-1-title",
    slot: "title",
    preferredRoleId: "h6",
    component: "feature-card",
    part: "title",
    text: "Shared palettes",
  },
  {
    id: "landing-feat-1-body",
    slot: "body",
    component: "feature-card",
    part: "body",
    label: "Shared palettes",
    text: "Colour, type and spacing live as one set of tokens, so a button in preview matches the export.",
  },
  {
    id: "landing-feat-2-title",
    slot: "title",
    preferredRoleId: "h6",
    component: "feature-card",
    part: "title",
    text: "Type that travels",
  },
  {
    id: "landing-feat-2-body",
    slot: "body",
    component: "feature-card",
    part: "body",
    label: "Type that travels",
    text: "Headings, captions and body keep their roles when the page leaves the studio.",
  },
  {
    id: "landing-feat-3-title",
    slot: "title",
    preferredRoleId: "h6",
    component: "feature-card",
    part: "title",
    text: "Live preview",
  },
  {
    id: "landing-feat-3-body",
    slot: "body",
    component: "feature-card",
    part: "body",
    label: "Live preview",
    text: "Sign-off happens on a real page. No screenshot thread.",
  },

  {
    id: "landing-split-a-eyebrow",
    slot: "label",
    component: "split",
    part: "eyebrow",
    text: "Token file",
  },
  {
    id: "landing-split-a-title",
    slot: "heading",
    preferredRoleId: "h4",
    component: "split",
    part: "title",
    text: "Your roles, in the export",
  },
  {
    id: "landing-split-a-body",
    slot: "body",
    component: "split",
    part: "body",
    label: "Your roles, in the export",
    text: "Blueprint stores the type decisions with the palette. A heading stays a heading when it leaves the studio, so design is not a second transcription.",
  },
  {
    id: "landing-split-a-cta",
    slot: "label",
    component: "split",
    part: "cta",
    text: "How roles work",
  },

  {
    id: "landing-split-b-eyebrow",
    slot: "label",
    component: "split",
    part: "eyebrow",
    text: "Real people",
  },
  {
    id: "landing-split-b-title",
    slot: "heading",
    preferredRoleId: "h4",
    component: "split",
    part: "title",
    text: "Help from the studio",
  },
  {
    id: "landing-split-b-body",
    slot: "body",
    component: "split",
    part: "body",
    label: "Help from the studio",
    text: "When something is stuck, you talk to someone who uses Blueprint. They have seen the same tokens you have.",
  },
  {
    id: "landing-split-b-cta",
    slot: "label",
    component: "split",
    part: "cta",
    text: "Talk to us",
  },

  {
    id: "landing-quad-title",
    slot: "heading",
    preferredRoleId: "h6",
    component: "section-head",
    part: "title",
    text: "What the system actually holds",
  },
  {
    id: "landing-quad-lead",
    slot: "title",
    preferredRoleId: "h4",
    component: "section-head",
    part: "lead",
    text: "Not a pile of extras. The few things that keep a page together.",
  },
  {
    id: "landing-quad-1-title",
    slot: "label",
    component: "quad-card",
    part: "title",
    text: "Shared library",
  },
  {
    id: "landing-quad-1-body",
    slot: "body",
    component: "quad-card",
    part: "body",
    label: "Shared library",
    text: "One set of roles for every surface, so a caption looks like a caption everywhere.",
  },
  {
    id: "landing-quad-2-title",
    slot: "label",
    component: "quad-card",
    part: "title",
    text: "Quiet interface",
  },
  {
    id: "landing-quad-2-body",
    slot: "body",
    component: "quad-card",
    part: "body",
    label: "Quiet interface",
    text: "The chrome stays out of the way while you read.",
  },
  {
    id: "landing-quad-3-title",
    slot: "label",
    component: "quad-card",
    part: "title",
    text: "Live proofs",
  },
  {
    id: "landing-quad-3-body",
    slot: "body",
    component: "quad-card",
    part: "body",
    label: "Live proofs",
    text: "See the page as a client will, while you are still editing.",
  },
  {
    id: "landing-quad-4-title",
    slot: "label",
    component: "quad-card",
    part: "title",
    text: "Any screen",
  },
  {
    id: "landing-quad-4-body",
    slot: "body",
    component: "quad-card",
    part: "body",
    label: "Any screen",
    text: "Open the same preview on a phone and keep the tokens.",
  },

  {
    id: "landing-quote",
    slot: "title",
    preferredRoleId: "h4",
    text: "We stopped guessing hex in three files. The tokens came with the page, which was the whole point.",
  },
  { id: "landing-cite-name", slot: "label", text: "Mei Okada" },
  {
    id: "landing-cite-role",
    slot: "caption",
    text: "Design lead, Harbour Press",
  },

  {
    id: "landing-pricing-title",
    slot: "heading",
    preferredRoleId: "h6",
    component: "section-head",
    part: "title",
    text: "Plans that stay out of the way",
  },
  {
    id: "landing-pricing-lead",
    slot: "title",
    preferredRoleId: "h4",
    component: "section-head",
    part: "lead",
    text: "Start with a product. Add people when the system needs them.",
  },
  {
    id: "landing-plan-1-name",
    slot: "label",
    component: "plan",
    part: "name",
    text: "Starter",
  },
  {
    id: "landing-plan-1-blurb",
    slot: "caption",
    component: "plan",
    part: "blurb",
    text: "For a single product.",
  },
  {
    id: "landing-plan-1-price",
    slot: "heading",
    component: "plan",
    part: "price",
    text: "$19",
  },
  {
    id: "landing-plan-1-unit",
    slot: "caption",
    component: "plan",
    part: "unit",
    text: "/ user / month",
  },
  {
    id: "landing-plan-1-f1",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Three surfaces at a time",
  },
  {
    id: "landing-plan-1-f2",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Token grid included",
  },
  {
    id: "landing-plan-1-f3",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Mail support",
  },
  {
    id: "landing-plan-1-cta",
    slot: "label",
    component: "plan",
    part: "cta",
    text: "Choose Starter",
  },
  {
    id: "landing-plan-2-name",
    slot: "label",
    component: "plan",
    part: "name",
    text: "Growth",
  },
  {
    /* The featured plan's chip: the one place Chip radius shows on the page. */
    id: "landing-plan-2-tag",
    slot: "caption",
    component: "plan",
    part: "tag",
    text: "Popular",
  },
  {
    id: "landing-plan-2-blurb",
    slot: "caption",
    component: "plan",
    part: "blurb",
    text: "For a small team.",
  },
  {
    id: "landing-plan-2-price",
    slot: "heading",
    component: "plan",
    part: "price",
    text: "$39",
  },
  {
    id: "landing-plan-2-unit",
    slot: "caption",
    component: "plan",
    part: "unit",
    text: "/ user / month",
  },
  {
    id: "landing-plan-2-f1",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Unlimited surfaces",
  },
  {
    id: "landing-plan-2-f2",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Preview and inspect",
  },
  {
    id: "landing-plan-2-f3",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Same-day replies",
  },
  {
    id: "landing-plan-2-cta",
    slot: "label",
    component: "plan",
    part: "cta",
    text: "Choose Growth",
  },
  {
    id: "landing-plan-3-name",
    slot: "label",
    component: "plan",
    part: "name",
    text: "Enterprise",
  },
  {
    id: "landing-plan-3-blurb",
    slot: "caption",
    component: "plan",
    part: "blurb",
    text: "For a whole org.",
  },
  {
    id: "landing-plan-3-price",
    slot: "heading",
    component: "plan",
    part: "price",
    text: "Custom",
  },
  {
    id: "landing-plan-3-unit",
    slot: "caption",
    component: "plan",
    part: "unit",
    text: "/ talk to us",
  },
  {
    id: "landing-plan-3-f1",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Single sign-on",
  },
  {
    id: "landing-plan-3-f2",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "Your own roles",
  },
  {
    id: "landing-plan-3-f3",
    slot: "body",
    component: "plan",
    part: "feature",
    text: "A named editor at Blueprint",
  },
  {
    id: "landing-plan-3-cta",
    slot: "label",
    component: "plan",
    part: "cta",
    text: "Contact sales",
  },

  {
    id: "landing-cta-title",
    slot: "heading",
    preferredRoleId: "h6",
    text: "Try Blueprint on a page you already have",
  },
  {
    id: "landing-cta-lead",
    slot: "title",
    preferredRoleId: "h4",
    text: "Open a workspace, paint the tokens, and see whether the type holds.",
  },
  { id: "landing-cta-primary", slot: "label", text: "Start free" },
  { id: "landing-cta-ghost", slot: "label", text: "Book a walkthrough" },
  {
    id: "landing-cta-note",
    slot: "caption",
    text: "Fourteen days. No card.",
  },

  /* A sign-up band under the CTA: the one place Input radius shows. */
  {
    id: "landing-newsletter-eyebrow",
    slot: "label",
    text: "Blueprint · Newsletter",
  },
  {
    id: "landing-newsletter-title",
    slot: "heading",
    preferredRoleId: "h2",
    text: "Better design systems, twice a month.",
  },
  {
    id: "landing-newsletter-lead",
    slot: "title",
    preferredRoleId: "h6",
    text: "One token study, one working method, and useful notes on colour, type and layout.",
  },
  { id: "landing-newsletter-cta", slot: "label", text: "Subscribe" },
  {
    id: "landing-newsletter-note",
    slot: "caption",
    text: "No spam. Unsubscribe at any time.",
  },
];

export const PREVIEW_LANDING_IDS = PREVIEW_LANDING_SLOTS.map(
  (entry) => entry.id,
);

const SEED_LANDING_TEXT = new Map(
  PREVIEW_LANDING_SLOTS.map((entry) => [entry.id, entry.text]),
);

/**
 * Earlier seeds for slots the product renamed. Exact match, plus any copy
 * that still names Veltra.
 */
const RETIRED_LANDING_COPY: Record<string, readonly string[]> = {
  "landing-hero-eyebrow": ["Editorial software", "Business software"],
  "landing-hero-title": ["Your digital transformation begins here"],
  "landing-hero-lead": [
    "Blueprint is a workspace for writers, editors and designers who share a page. Draft, mark up and publish without the type getting lost between tools.",
    "Unlock the full potential of your business. Start your journey today and work with tools that grow with your team.",
  ],
  "landing-hero-cta": ["See the product", "Explore features"],
  "landing-hero-ghost": ["Start a draft", "Get started"],
  "landing-hero-note": ["No credit card required"],
  "landing-features-title": [
    "The work, not the tooling",
    "SaaS solutions that drive results",
  ],
  "landing-features-lead": [
    "Three things every desk in Blueprint can do from the first sitting.",
    "Explore our suite of powerful software solutions.",
  ],
  "landing-feat-1-title": ["Shared drafts", "Enterprise planning"],
  "landing-feat-1-body": [
    "Several people can be in the same piece. Comments sit next to the line they belong to.",
    "Seamlessly manage and integrate all core business functions to improve efficiency and productivity across every team.",
  ],
  "landing-feat-2-title": ["Project management"],
  "landing-feat-2-body": [
    "Headings, captions and body keep their roles when the piece moves from draft to layout.",
    "Keep projects on track by planning, running and reviewing your initiatives in one shared workspace.",
  ],
  "landing-feat-3-title": ["Review in place", "Analytics and reporting"],
  "landing-feat-3-body": [
    "Sign-off happens on the page. No export, no screenshot thread.",
    "Turn daily activity into clear reports, so decisions are based on evidence instead of guesswork.",
  ],
  "landing-split-a-eyebrow": ["House style", "Built to fit"],
  "landing-split-a-title": [
    "Your roles, in the file",
    "Customisation and integration",
  ],
  "landing-split-a-body": [
    "Blueprint stores the type decisions with the writing. A heading stays a heading when it leaves the desk, so design is not a second transcription.",
    "Our platform is flexible and can be shaped around your business requirements. Every organisation works differently, so the software should follow your process, not replace it.",
  ],
  "landing-split-a-cta": ["Learn more"],
  "landing-split-b-eyebrow": ["Always with you"],
  "landing-split-b-title": ["Help from the desk", "Dedicated support"],
  "landing-split-b-body": [
    "When something is stuck, you talk to someone who uses Blueprint. They have seen the same page you have.",
    "Veltra provides ongoing support and training so your team gets value from day one. Real people answer, and they know your setup.",
  ],
  "landing-split-b-cta": ["Learn more"],
  "landing-quad-title": [
    "What the file actually holds",
    "Discover what sets Veltra apart",
  ],
  "landing-quad-lead": [
    "Not a pile of extras. The few things that keep a piece together.",
    "Our suite is packed with practical features.",
  ],
  "landing-quad-1-title": ["Seamless integration"],
  "landing-quad-1-body": [
    "One set of roles for every desk, so a caption looks like a caption everywhere.",
    "Connect Veltra to the systems you already use, with a short and predictable switch.",
  ],
  "landing-quad-2-title": ["Friendly interface"],
  "landing-quad-2-body": [
    "A clear interface means your team can start work with very little training.",
  ],
  "landing-quad-3-title": ["Real-time analytics"],
  "landing-quad-3-body": [
    "See the page as it will print, while you are still editing.",
    "See live data and act early, instead of reading last month's numbers.",
  ],
  "landing-quad-4-title": ["Off the desk", "Mobile access"],
  "landing-quad-4-body": [
    "Open the same piece on a phone and keep the marks.",
    "Open your data from anywhere, on any device, and keep the team connected.",
  ],
  "landing-quote": [
    "We stopped pasting the same story into three tools. The type came with it, which was the whole point.",
    "We replaced four tools with one, and the team stopped arguing about where the truth lives.",
  ],
  "landing-cite-name": ["Anna Lindqvist"],
  "landing-cite-role": [
    "Managing editor, Harbour Press",
    "Head of Operations, Northline Group",
  ],
  "landing-pricing-title": ["Simple pricing"],
  "landing-pricing-lead": [
    "Start with a desk. Add people when the issue needs them.",
    "Start small and move up when the team grows.",
  ],
  "landing-plan-1-blurb": [
    "For a single desk.",
    "For small teams getting started.",
  ],
  "landing-plan-1-f1": ["Three pieces at a time", "Up to 10 users"],
  "landing-plan-1-f2": ["House style included", "Core planning tools"],
  "landing-plan-1-f3": ["Email support"],
  "landing-plan-2-blurb": [
    "For a small masthead.",
    "For teams that need reporting.",
  ],
  "landing-plan-2-f1": ["Unlimited pieces", "Unlimited users"],
  "landing-plan-2-f2": ["Proofs and marks", "Advanced analytics"],
  "landing-plan-2-f3": ["Priority support"],
  "landing-plan-3-blurb": ["For a whole list.", "For complex organisations."],
  "landing-plan-3-f2": ["Custom integrations"],
  "landing-plan-3-f3": ["Dedicated manager"],
  "landing-cta-title": [
    "Try Blueprint on a piece you already have",
    "Ready to see it on your own data?",
  ],
  "landing-cta-lead": [
    "Open a workspace, paste a draft, and see whether the type holds.",
    "Set up a workspace in a few minutes. Invite the team when you are ready.",
  ],
  "landing-cta-primary": ["Start free trial"],
  "landing-cta-ghost": ["Book a demo"],
  "landing-cta-note": ["14 day trial. No credit card required."],
};

export function refreshRetiredLandingCopy<
  T extends { id: string; text: string },
>(document: T[]): T[] {
  return document.map((block) => {
    const seed = SEED_LANDING_TEXT.get(block.id);
    if (!seed || seed === block.text) return block;
    const retired = RETIRED_LANDING_COPY[block.id];
    if (!retired?.includes(block.text) && !/\bVeltra\b/.test(block.text)) {
      return block;
    }
    return { ...block, text: seed };
  });
}

/** Ids of one repeated component part. */
export function landingIdsFor(
  component: LandingComponent,
  part: LandingPart,
): string[] {
  return PREVIEW_LANDING_SLOTS.filter(
    (entry) => entry.component === component && entry.part === part,
  ).map((entry) => entry.id);
}

export type LandingCardComponent = Extract<
  LandingComponent,
  "feature-card" | "quad-card"
>;

/** Title/body pairs for one repeated card, in seed order. */
export function landingCardSlots(component: LandingCardComponent): Array<{
  titleId: string;
  bodyId: string;
}> {
  const bodies = landingIdsFor(component, "body");
  return landingIdsFor(component, "title").flatMap((titleId, index) => {
    const bodyId = bodies[index];
    return bodyId ? [{ titleId, bodyId }] : [];
  });
}

const LANDING_GROUP_DEFS = [
  {
    id: "feature-card-titles",
    label: "Feature card titles",
    component: "feature-card",
    part: "title",
  },
  {
    id: "feature-card-bodies",
    label: "Feature card bodies",
    component: "feature-card",
    part: "body",
  },
  {
    id: "quad-card-titles",
    label: "Quad card titles",
    component: "quad-card",
    part: "title",
  },
  {
    id: "quad-card-bodies",
    label: "Quad card bodies",
    component: "quad-card",
    part: "body",
  },
  {
    id: "split-eyebrows",
    label: "Split eyebrows",
    component: "split",
    part: "eyebrow",
  },
  {
    id: "split-titles",
    label: "Split titles",
    component: "split",
    part: "title",
  },
  {
    id: "split-bodies",
    label: "Split bodies",
    component: "split",
    part: "body",
  },
  { id: "split-ctas", label: "Split CTAs", component: "split", part: "cta" },
  {
    id: "section-titles",
    label: "Section titles",
    component: "section-head",
    part: "title",
  },
  {
    id: "section-leads",
    label: "Section leads",
    component: "section-head",
    part: "lead",
  },
  { id: "plan-names", label: "Plan names", component: "plan", part: "name" },
  { id: "plan-blurbs", label: "Plan blurbs", component: "plan", part: "blurb" },
  { id: "plan-prices", label: "Plan prices", component: "plan", part: "price" },
  { id: "plan-units", label: "Plan units", component: "plan", part: "unit" },
  {
    id: "plan-features",
    label: "Plan features",
    component: "plan",
    part: "feature",
  },
  { id: "plan-ctas", label: "Plan CTAs", component: "plan", part: "cta" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  component: LandingComponent;
  part: LandingPart;
}>;

export const LANDING_STYLE_GROUPS = LANDING_GROUP_DEFS.map((def) => ({
  id: def.id,
  label: def.label,
  ids: landingIdsFor(def.component, def.part),
}));
