"use client";

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  assessSandboxTarget,
  assignSandboxColour,
  pressedSandboxTarget,
  DEFAULT_SANDBOX_COLOURS,
  resolveSandbox,
  resolveSandboxColour,
  SANDBOX_TARGET_LABELS,
  type ColorTrack,
  type ContrastStandard,
  type SandboxTarget,
  type SemanticToken,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
import { useIsPhone } from "../use-is-phone";
import { usePaletteView } from "./PaletteViewContext";
import { SandboxColourPicker } from "./SandboxColourPicker";
import { SandboxHud } from "./SandboxHud";
import { SandboxRamp } from "./SandboxRamp";
import { useElementBox } from "./use-element-box";
import styles from "./accessibility-sandbox.module.css";

interface AccessibilitySandboxProps {
  palettes: ColorTrack[];
  semantics: SemanticToken[];
}

/** How a layer sizes, as Figma words it in the tag under a selection. */
const SIZING: Record<SandboxTarget, string> = {
  background: "Fill × Hug",
  badgeFill: "Hug × Hug",
  badgeText: "Hug × Hug",
  heading: "Fill × Hug",
  body: "Fill × Hug",
  buttonFill: "Hug × Hug",
  buttonText: "Hug × Hug",
};

/** What the hero says, in each standard. */
const HERO_COPY: Record<ContrastStandard, { title: string; body: string }> = {
  wcag2: {
    title: "WCAG 2.2",
    body: "the Web Content Accessibility Guidelines (WCAG) 2.2, an international standard published by the World Wide Web Consortium (W3C) on October 5, 2023, and approved as an ISO/IEC international standard (ISO/IEC 40500:2025) in October 2025.",
  },
  wcag3: {
    title: "WCAG 3",
    body: "WCAG 3.0 is the W3C's draft successor to 2.2. It reads a pair by APCA's Lc, which depends on which colour is the text: 75 for body text, 60 for large text and 45 for UI components.",
  },
};

/**
 * A hero whose every colour can be picked, and the contrast it makes.
 *
 * Clicking a layer selects it, as in Figma: a container selects its fill, and
 * Ctrl or Cmd click, a double click, or Ctrl Enter from the keyboard goes into
 * it for its text. The control bar then recolours what is selected, from a
 * role or a shade, and the card in the corner reads the pair it makes in the
 * standard chosen on the toolbar. The sandbox is a scratch space: what is
 * picked here is not saved and does not touch the project.
 */
export function AccessibilitySandbox({
  palettes,
  semantics,
}: AccessibilitySandboxProps) {
  const { contrastStandard, seen } = usePaletteView();
  const { resolved: mode } = useThemeMode();
  const isPhone = useIsPhone();
  const [colours, setColours] = useState(DEFAULT_SANDBOX_COLOURS);
  const [target, setTarget] = useState<SandboxTarget | null>("background");
  const stage = useRef<HTMLDivElement>(null);
  const box = useElementBox(
    stage,
    target ? `[data-sandbox-target="${target}"]` : null,
  );

  const resolved = useMemo(
    () => resolveSandbox(colours, semantics, palettes, mode),
    [colours, semantics, palettes, mode],
  );
  if (!resolved) return null;
  const { hexes, page } = resolved;
  const paint = (each: SandboxTarget) => seen(hexes[each]);

  const select = (next: SandboxTarget) => (event: MouseEvent) => {
    event.stopPropagation();
    setTarget(next);
  };
  /* The canvas holds the other layers, so it is a group and not a button:
     a button may not contain one. It is still clicked and focused to select
     the background. */
  const layer = (shallow: SandboxTarget, deep?: SandboxTarget) => ({
    "data-sandbox-target": shallow,
    "aria-label": SANDBOX_TARGET_LABELS[shallow],
    ...(shallow === "background"
      ? { role: "group" as const }
      : { role: "button" as const, "aria-pressed": target === shallow }),
    tabIndex: 0,
    onClick: (event: MouseEvent) =>
      select(
        pressedSandboxTarget(target, shallow, deep, {
          isDeepModifier: event.ctrlKey || event.metaKey,
          isTouch: isPhone,
        }),
      )(event),
    onDoubleClick: deep ? select(deep) : undefined,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(deep && event.ctrlKey ? deep : shallow);
    },
  });

  const colour = target ? colours[target] : null;
  const current =
    colour && resolveSandboxColour(colour, semantics, palettes, mode);

  return (
    <section
      aria-label="Accessibility sandbox"
      className={styles.sandbox}
      onKeyDown={(event) => {
        if (event.key === "Escape") setTarget(null);
      }}
    >
      <header className={styles.controlBar}>
        {target && colour && current ? (
          <>
            <strong>{SANDBOX_TARGET_LABELS[target]}</strong>
            <SandboxColourPicker
              key={target}
              colour={colour}
              mode={mode}
              palettes={palettes}
              resolved={current}
              targetLabel={SANDBOX_TARGET_LABELS[target]}
              tokens={semantics}
              onChange={(next) =>
                setColours((all) => assignSandboxColour(all, target, next))
              }
            />
            {isPhone ? null : (
              <SandboxRamp
                palettes={palettes}
                resolved={current}
                targetLabel={SANDBOX_TARGET_LABELS[target]}
                onChoose={(trackId, weight) =>
                  setColours((all) =>
                    assignSandboxColour(all, target, {
                      kind: "primitive",
                      trackId,
                      weight,
                    }),
                  )
                }
              />
            )}
          </>
        ) : (
          <span className={styles.controlHint}>
            Select a layer to recolour it
          </span>
        )}
      </header>

      {/* The hero is the background layer: it runs edge to edge under the
          control bar, and what is not another layer is it. The score floats
          over its corner on a wide screen and is a strip under it on a phone,
          so the two share a box to be placed against. */}
      <div className={styles.heroFrame}>
        <div
          {...layer("background")}
          ref={stage}
          className={styles.stage}
          style={{ backgroundColor: paint("background") }}
        >
          <span
            {...layer("badgeFill", "badgeText")}
            className={styles.badge}
            style={{ backgroundColor: paint("badgeFill") }}
          >
            <span
              data-sandbox-target="badgeText"
              style={{ color: paint("badgeText") }}
            >
              Accessibility
            </span>
          </span>
          <div className={styles.copy}>
            <h2>
              <span
                {...layer("heading")}
                className={styles.block}
                style={{ color: paint("heading") }}
              >
                {HERO_COPY[contrastStandard].title}
              </span>
            </h2>
            <p>
              <span
                {...layer("body")}
                className={styles.block}
                style={{ color: paint("body") }}
              >
                {HERO_COPY[contrastStandard].body}
              </span>
            </p>
          </div>
          <span
            {...layer("buttonFill", "buttonText")}
            className={styles.button}
            style={{ backgroundColor: paint("buttonFill") }}
          >
            <span
              data-sandbox-target="buttonText"
              style={{ color: paint("buttonText") }}
            >
              Get started
            </span>
          </span>

          {box && target && target !== "background" ? (
            <span
              aria-hidden="true"
              className={styles.selection}
              data-testid="sandbox-selection"
              style={box}
            >
              <i />
              <i />
              <i />
              <i />
              <small>
                {Math.round(box.width)} × {Math.round(box.height)} ·{" "}
                {SIZING[target]}
              </small>
            </span>
          ) : null}
        </div>

        {target ? (
          <SandboxHud
            rows={assessSandboxTarget(contrastStandard, target, hexes, page)}
            standard={contrastStandard}
            targetLabel={SANDBOX_TARGET_LABELS[target]}
          />
        ) : null}
      </div>
    </section>
  );
}
