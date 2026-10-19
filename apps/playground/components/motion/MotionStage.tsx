"use client";

import type { CSSProperties } from "react";
import {
  playedMs,
  stageDuration,
  stageEasing,
  type MotionScale,
  type MotionSpeed,
  type StageMoment,
} from "@blueprint/ui";
import {
  ButtonDemo,
  DialogDemo,
  DropdownDemo,
  SwitchDemo,
} from "./MotionStageDemos";
import styles from "./motion-studio.module.css";

/** A replay holds the end of a moment this long before it lets go, in ms. */
const HOLD_MS = 450;

const MOMENTS: Array<{
  moment: StageMoment;
  title: string;
  Demo: typeof ButtonDemo;
}> = [
  { moment: "press", title: "Button", Demo: ButtonDemo },
  { moment: "press", title: "Switch", Demo: SwitchDemo },
  { moment: "panel", title: "Dropdown", Demo: DropdownDemo },
  { moment: "dialog", title: "Dialog", Demo: DialogDemo },
];

/**
 * The custom properties Astryx's controls read, set on the stage alone, from
 * the scale at the speed chosen. A press is Astryx's fast band, a panel its
 * medium, a dialog its slow; the curve is its standard one. Outside the stage
 * the studio keeps Astryx's own.
 */
export function stageVariables(
  scale: MotionScale,
  speed: MotionSpeed,
): CSSProperties {
  const ms = (moment: StageMoment) => {
    const token = stageDuration(scale, moment);
    return token ? `${playedMs(token.ms, speed)}ms` : undefined;
  };
  const press = ms("press");
  const panel = ms("panel");
  const dialog = ms("dialog");
  const easing = stageEasing(scale);
  return {
    ...(press && { "--duration-fast": press, "--duration-fast-min": press }),
    ...(press && { "--duration-fast-max": press }),
    ...(panel && { "--duration-medium": panel }),
    ...(panel && { "--duration-medium-min": panel }),
    ...(panel && { "--duration-medium-max": panel }),
    ...(dialog && { "--duration-slow": dialog, "--duration-slow-min": dialog }),
    ...(dialog && { "--duration-slow-max": dialog }),
    ...(easing && { "--ease-standard": easing.css }),
  } as CSSProperties;
}

/**
 * The stage: real controls that move on the scale, so a pace is judged on the
 * thing it is for and not on a number. Each moment says which token it plays,
 * and pressing that name selects it in the settings.
 */
export function MotionStage({
  scale,
  speed,
  replayKey,
  selectedDurationId,
  onSelectDuration,
}: {
  scale: MotionScale;
  speed: MotionSpeed;
  replayKey: number;
  selectedDurationId: string | undefined;
  onSelectDuration: (id: string) => void;
}) {
  const variables = stageVariables(scale, speed);
  return (
    <section
      aria-label="Motion stage"
      className={styles.stage}
      data-speed={speed}
      style={variables}
    >
      <p className={styles.reducedHint}>
        Your system asks for reduced motion, so the controls here change without
        moving. The live preview in the settings still plays when it is pressed.
      </p>
      {MOMENTS.map(({ moment, title, Demo }) => {
        const token = stageDuration(scale, moment);
        return (
          <article key={title} className={styles.demo}>
            <header className={styles.demoHeader}>
              <h2>{title}</h2>
              {token ? (
                <button
                  aria-label={`${title} plays ${token.name}, ${token.ms} milliseconds. Edit it`}
                  aria-pressed={token.id === selectedDurationId}
                  className={styles.tokenTag}
                  type="button"
                  onClick={() => onSelectDuration(token.id)}
                >
                  {token.name} · {token.ms}ms
                </button>
              ) : null}
            </header>
            <div className={styles.demoBody}>
              <Demo
                holdMs={playedMs(token?.ms ?? 0, speed) + HOLD_MS}
                replayKey={replayKey}
                variables={variables}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
