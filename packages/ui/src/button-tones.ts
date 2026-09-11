/**
 * Which semantic roles each button scheme draws from.
 *
 * Data, not styling. The Button reads a row of this table into seven local
 * custom properties and every variant is written against those, so a variant
 * never names a tone and a tone never knows about a variant — six schemes and
 * six variants stay twelve things to maintain rather than thirty-six.
 *
 * Its own module because the table is the part that grows: a seventh tone is a
 * row here and nothing else, and `button.tsx` stays a component rather than
 * becoming a palette with a component at the bottom.
 *
 * Every value is a role. There is no `--color-<track>-<weight>` in this file
 * or in the Button, which `button-tones.test.ts` holds: a component that names
 * a shade has frozen a decision the Semantics tab is supposed to own, and it
 * freezes it in the one place a designer cannot reach.
 *
 * `secondary` and `tertiary` were removed from this table once, because they
 * drew from tracks the studio's own theme.css defined and no saved workspace
 * had ever contained — the same fault the Astryx bridge carried for its cyan
 * and purple families. `secondary` is back, and the difference is the whole
 * point: it is a track a person chooses when they create a palette, and a tone
 * with the same seven roles as any other. `tertiary` is not, and will not be
 * until somebody has a third brand colour to put in it.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

/** The tones a Blueprint button can be drawn in. */
export const BUTTON_SCHEMES = [
  "primary",
  "secondary",
  "neutral",
  "success",
  "warning",
  "error",
  "info",
] as const;

export type ButtonScheme = (typeof BUTTON_SCHEMES)[number];

/**
 * The seven roles a scheme supplies, under the names the variants use.
 *
 * `main` is the fill, `contrast` the label on it, `fg` the label everywhere
 * else. The split between `contrast` and `fg` is the whole reason a filled
 * button and an outlined one can be the same colour and still both readable:
 * one sits on the tone, the other sits on the page.
 */
export interface ButtonToneRoles {
  main: string;
  hover: string;
  active: string;
  contrast: string;
  fg: string;
  surface: string;
  surfaceHover: string;
  border: string;
}

/** `action.primary` → the seven roles of that tone, as variable names. */
function tone(id: string, onFill: string): ButtonToneRoles {
  const role = (name: string) => `var(--color-${id.replace(".", "-")}-${name})`;
  return {
    main: `var(--color-${id.replace(".", "-")})`,
    hover: role("hover"),
    active: role("active"),
    contrast: `var(--color-${onFill})`,
    fg: role("fg"),
    surface: role("surface"),
    surfaceHover: role("surface-hover"),
    border: role("border"),
  };
}

export const BUTTON_TONES: Readonly<Record<ButtonScheme, ButtonToneRoles>> = {
  /* `fg.on-action` rather than `fg.on-primary`, because the role predates the
     pattern and renaming it would migrate every saved layer to buy one
     letter's consistency. */
  primary: tone("action.primary", "fg-on-action"),
  secondary: tone("action.secondary", "fg-on-secondary"),
  neutral: tone("action.neutral", "fg-on-neutral"),
  success: tone("status.success", "fg-on-success"),
  warning: tone("status.warning", "fg-on-warning"),
  error: tone("status.error", "fg-on-error"),
  info: tone("status.info", "fg-on-info"),
};

/**
 * A scheme as the local properties every variant reads.
 *
 * A style object rather than Tailwind arbitrary-property classes, and that is
 * not a preference. The classes were `[--btn-main:var(--color-action-primary)]`
 * and they worked while the strings were written out literally, because
 * Tailwind's scanner reads source files as text. Building them from a table
 * means no complete class name appears anywhere for it to find, so it
 * generates no rule, and every button renders with no fill at all — which is
 * how the first version of this table shipped a page of colourless buttons
 * that typechecked, linted and passed every test.
 *
 * There is nothing for Tailwind to generate here anyway: each value is a
 * `var()` pointing at a role the stylesheet already declares. Inline is where
 * a value that needs no compilation belongs.
 */
export function buttonToneStyle(scheme: ButtonScheme): Record<string, string> {
  const roles = BUTTON_TONES[scheme];
  return {
    "--btn-main": roles.main,
    "--btn-contrast": roles.contrast,
    "--btn-fg": roles.fg,
    "--btn-hover": roles.hover,
    "--btn-active": roles.active,
    "--btn-border": roles.border,
    "--btn-soft": roles.surface,
    "--btn-soft-hover": roles.surfaceHover,
  };
}

/**
 * Schemes the studio chrome and the palette preview cannot open without.
 *
 * `primary` is the fill of every contained control that does not name a tone,
 * and `action.primary` is one of the four tokens `previewShadesFor` requires.
 * The others are a client's vocabulary: a workspace with no info status
 * should be able to throw that tone away.
 */
export const REQUIRED_BUTTON_SCHEMES: readonly ButtonScheme[] = ["primary"];

export const BUTTON_SCHEME_LABELS: Record<ButtonScheme, string> = {
  primary: "Primary",
  secondary: "Secondary",
  neutral: "Neutral",
  success: "Success",
  warning: "Warning",
  error: "Error",
  info: "Info",
};

/** `--color-action-primary-hover` → `action.primary-hover`. */
export function roleIdFromColorVariable(variable: string): string {
  const body = variable.replace(/^--color-/, "");
  return body.replace(/^([a-z]+)-/, "$1.");
}

function roleIdsFromTone(roles: ButtonToneRoles): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(roles) as string[]) {
    for (const [, name] of value.matchAll(/var\((--color-[a-z0-9-]+)\)/g)) {
      ids.add(roleIdFromColorVariable(name!));
    }
  }
  return [...ids];
}

/** Every semantic role one scheme reads, fill and companions. */
export function buttonSchemeRoleIds(scheme: ButtonScheme): string[] {
  const roles = BUTTON_TONES[scheme];
  return roles ? roleIdsFromTone(roles) : [];
}

const SCHEME_BY_ROLE_ID: ReadonlyMap<string, ButtonScheme> = (() => {
  const map = new Map<string, ButtonScheme>();
  for (const scheme of BUTTON_SCHEMES) {
    for (const id of buttonSchemeRoleIds(scheme)) {
      map.set(id, scheme);
    }
  }
  return map;
})();

/** Which scheme reads this role, if any. */
export function buttonSchemeForRoleId(id: string): ButtonScheme | undefined {
  return SCHEME_BY_ROLE_ID.get(id);
}

/**
 * A stored scheme list, or the seed set when a file never named one.
 *
 * Unknown strings are dropped. `primary` cannot be omitted: a workspace
 * without it has no default action colour. Order follows `BUTTON_SCHEMES`
 * so two files that name the same tones compare equal.
 */
export function normalizeButtonSchemes(value: unknown): ButtonScheme[] {
  if (value === undefined || value === null) return [...BUTTON_SCHEMES];
  const allowed = new Set<string>(BUTTON_SCHEMES);
  const named = new Set(
    Array.isArray(value)
      ? value.filter(
          (entry): entry is ButtonScheme =>
            typeof entry === "string" && allowed.has(entry),
        )
      : BUTTON_SCHEMES,
  );
  for (const scheme of REQUIRED_BUTTON_SCHEMES) named.add(scheme);
  return BUTTON_SCHEMES.filter((scheme) => named.has(scheme));
}
