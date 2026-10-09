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
  DEFAULT_SANDBOX_COLOURS,
  resolveSandbox,
  resolveSandboxColour,
  SANDBOX_TARGET_LABELS,
  type ColorTrack,
  type SandboxTarget,
  type SemanticToken,
} from "@blueprint/ui";
import { useThemeMode } from "../../app/theme-provider";
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

/**
 * A small hero whose every colour can be picked, and the contrast it makes.
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
  const [colours, setColours] = useState(DEFAULT_SANDBOX_COLOURS);
  const [target, setTarget] = useState<SandboxTarget | null>(null);
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
      select(deep && (event.ctrlKey || event.metaKey) ? deep : shallow)(event),
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
          </>
        ) : (
          <span className={styles.controlHint}>
            Select a layer to recolour it
          </span>
        )}
      </header>

      <div
        ref={stage}
        className={styles.stage}
        style={{ backgroundColor: seen(page) }}
        onClick={() => setTarget(null)}
      >
        <div
          {...layer("background")}
          className={styles.canvas}
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
          <h2>
            <span
              {...layer("heading")}
              className={styles.block}
              style={{ color: paint("heading") }}
            >
              WCAG 2.2 / 3.0
            </span>
          </h2>
          <p>
            <span
              {...layer("body")}
              className={styles.block}
              style={{ color: paint("body") }}
            >
              Pick any layer to recolour it, and read how the pair holds up.
            </span>
          </p>
          <span
            {...layer("buttonFill", "buttonText")}
            className={styles.button}
            style={{ backgroundColor: paint("buttonFill") }}
          >
            <span
              data-sandbox-target="buttonText"
              style={{ color: paint("buttonText") }}
            >
              Primary
            </span>
          </span>
        </div>

        {box && target ? (
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
