import {
  BUTTON_TONES,
  buttonSchemeForRoleId,
  normalizeButtonSchemes,
  type ButtonScheme,
} from "../button-tones";
import {
  isSignallingRole,
  PREVIEW_REQUIRED_TOKENS,
  PREVIEW_ROLE_IDS,
} from "./preview-assessment";
import { semanticVariableName } from "./semantic";

/**
 * Who reads a semantic role by name.
 *
 * Most of the layer is a designer's vocabulary and belongs entirely to them.
 * A handful of roles are not: something in this repository asks for them by
 * name, and gets nothing if they are gone. Deleting `action.primary` empties
 * every primary button on the next paint, and nothing anywhere errors — the
 * declaration simply drops at computed-value time and the element keeps
 * whatever it inherited.
 *
 * So the answer is a list, in words, rather than a boolean. "You cannot delete
 * this" is a wall; "the Button primary tone and the Astryx bridge read this"
 * is something a person can act on, by repointing it or by changing what reads
 * it.
 *
 * Reading a role is not the same as declaring one. `theme.css` declares all
 * seventy-two so the studio's own chrome has them whatever a workspace holds;
 * that is the studio supplying the names, not consuming them. Only the two it
 * genuinely reaches for through `var()` are counted here.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

/**
 * The role variables the Astryx bridge feeds into Astryx's own tokens.
 *
 * A constant rather than a read, because this module is bundled for a browser
 * and `node:fs` is not. `role-consumers.test.ts` reads `astryx-bridge.css` —
 * the same file the bridge guard reads — and fails with the list to paste when
 * the two drift, which is the arrangement the docs export guard already uses
 * for generated files.
 *
 * Variable names rather than token ids, and deliberately: `--color-fg-on-action`
 * could be `fg.on-action` or `fg.on.action`, so the mapping only runs one way.
 * A caller asks with an id and it is turned into a name here.
 */
export const ASTRYX_BRIDGE_ROLE_VARIABLES: readonly string[] = [
  "--color-action-muted",
  "--color-action-primary",
  "--color-action-primary-border",
  "--color-action-primary-fg",
  "--color-action-primary-surface",
  "--color-border-default",
  "--color-border-strong",
  "--color-fg-accent",
  "--color-fg-disabled",
  "--color-fg-on-action",
  "--color-fg-primary",
  "--color-fg-secondary",
  "--color-status-error",
  "--color-status-error-border",
  "--color-status-error-fg",
  "--color-status-error-surface",
  "--color-status-info",
  "--color-status-info-border",
  "--color-status-info-fg",
  "--color-status-info-surface",
  "--color-status-success",
  "--color-status-success-border",
  "--color-status-success-fg",
  "--color-status-success-surface",
  "--color-status-warning",
  "--color-status-warning-border",
  "--color-status-warning-fg",
  "--color-status-warning-surface",
  "--color-surface-base",
  "--color-surface-overlay",
  "--color-surface-raised",
  "--color-surface-skeleton",
  "--color-surface-subtle",
  "--color-surface-track",
];

/**
 * The role variables the studio's own stylesheet reads, as against declares.
 *
 * Two of them. `theme.css` is 618 lines and 235 declarations, and all but
 * these are the studio providing a name rather than depending on one. Held to
 * the file by the same test as the bridge list.
 */
export const STUDIO_CHROME_ROLE_VARIABLES: readonly string[] = [
  "--color-action-primary-active",
  "--color-surface-raised",
];

/** Every variable one button scheme reads, and the words for that scheme. */
function buttonToneVariables(
  schemes: readonly ButtonScheme[],
): Map<string, string> {
  const byVariable = new Map<string, string>();

  for (const scheme of schemes) {
    /* A scheme listed with no row is a table mid-edit, and `button-tones.test.ts`
       is where that is somebody's problem. Here it is one tone's worth of
       consumers missing, not a module that throws on import and takes every
       test in the file with it. */
    const roles = BUTTON_TONES[scheme];
    if (!roles) continue;

    for (const value of Object.values(roles) as string[]) {
      /* The table holds `var(--color-x)` strings, because that is what a
         component sets. Read back out rather than kept as a second list of
         names beside it: a row added to the table is picked up here without
         anybody remembering to. */
      for (const [, name] of value.matchAll(/var\((--color-[a-z0-9-]+)\)/g)) {
        byVariable.set(name!, `Button ${scheme} tone`);
      }
    }
  }

  return byVariable;
}

const BRIDGE = new Set(ASTRYX_BRIDGE_ROLE_VARIABLES);
const STUDIO_CHROME = new Set(STUDIO_CHROME_ROLE_VARIABLES);
const PREVIEW = new Set(PREVIEW_ROLE_IDS);
const PREVIEW_REQUIRED = new Set(PREVIEW_REQUIRED_TOKENS);

/**
 * Which button schemes this workspace still has.
 *
 * Absent means the seed set, so every existing caller and every file written
 * before schemes were data keeps the same locks it has today.
 */
export interface RoleConsumerOptions {
  buttonSchemes?: readonly ButtonScheme[];
}

function toneIsEnabled(
  id: string,
  schemes: ReadonlySet<ButtonScheme>,
): boolean {
  const scheme = buttonSchemeForRoleId(id);
  return scheme === undefined || schemes.has(scheme);
}

/**
 * What reads this role, in the words somebody should be shown.
 *
 * Empty for a role nothing reaches for by name, which is most of them and all
 * of anybody's own. A freshly duplicated token is always empty: its id is new,
 * so nothing can have been written against it.
 *
 * Ordered from the most concrete consumer to the most general, because that is
 * the order somebody wants to read it in: a named component first, then the
 * things that measure.
 *
 * Button schemes are workspace data. A workspace that dropped `info` no
 * longer has a Button info tone, and the bridge and the preview stop naming
 * those roles too — they would simply have one less mapping, the same way
 * they already skip a token that is not in the layer.
 */
export function usedBy(id: string, options?: RoleConsumerOptions): string[] {
  const schemes = normalizeButtonSchemes(options?.buttonSchemes);
  const enabled = new Set(schemes);
  const variable = semanticVariableName(id);
  const consumers: string[] = [];

  const tone = buttonToneVariables(schemes).get(variable);
  if (tone) consumers.push(tone);
  if (BRIDGE.has(variable) && toneIsEnabled(id, enabled)) {
    consumers.push("Astryx bridge");
  }
  if (STUDIO_CHROME.has(variable)) consumers.push("Studio chrome");
  if (PREVIEW.has(id) && toneIsEnabled(id, enabled)) {
    /* The four the preview cannot do without are worth saying differently:
       without one of them `previewShadesFor` returns null and the whole panel
       disappears, rather than one check going missing from it. */
    consumers.push(
      PREVIEW_REQUIRED.has(id)
        ? "Palette preview (required)"
        : "Palette preview",
    );
    /* The pair grid measures signalling roles that already exist. It does not
       read a name, so an invented `action.token` must not inherit a lock from
       a grid that would simply have one less pair if the row went. */
    if (isSignallingRole(id)) consumers.push("Colour-vision pair grid");
  }

  return consumers;
}

/** Whether anything reads this role by name. */
export function isLoadBearing(
  id: string,
  options?: RoleConsumerOptions,
): boolean {
  return usedBy(id, options).length > 0;
}

/** `["Astryx bridge", "Studio chrome"]` as "the Astryx bridge and the …". */
export function listConsumers(consumers: string[]): string {
  if (consumers.length === 0) return "nothing";
  if (consumers.length === 1) return consumers[0]!;
  return `${consumers.slice(0, -1).join(", ")} and ${consumers.at(-1)!}`;
}
