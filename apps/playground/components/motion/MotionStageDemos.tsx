"use client";

import { useEffect, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Switch } from "@astryxdesign/core/Switch";
import { ChevronDown } from "lucide-react";
import { Button } from "@blueprint/ui";
import styles from "./motion-studio.module.css";

/*
 * The moments on the stage, each a real Astryx control. A button and a switch
 * are Astryx's own, and read the scale through the duration and ease custom
 * properties the stage sets. A dropdown panel and a dialog are drawn here from
 * Astryx pieces, because Astryx's own open in the top layer, outside the stage
 * the properties are set on; they move on the same properties.
 */

/**
 * Plays a moment when Replay is pressed: on, held for a while, then off. Never
 * on first render, and cancelled if the stage goes away mid-way.
 */
function useReplay(
  replayKey: number,
  holdMs: number,
  play: (isOn: boolean) => void,
) {
  useEffect(() => {
    if (replayKey === 0) return;
    const on = window.setTimeout(() => play(true), 0);
    const off = window.setTimeout(() => play(false), holdMs);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [replayKey, holdMs, play]);
}

interface DemoProps {
  /** Goes up by one each time Replay is pressed. */
  replayKey: number;
  /** How long a replay holds the moment before letting it go, in ms. */
  holdMs: number;
}

/** A press: Astryx's hover and active, and a press the stage can play itself. */
export function ButtonDemo({ replayKey, holdMs }: DemoProps) {
  const [isPressed, setIsPressed] = useState(false);
  useReplay(replayKey, holdMs, setIsPressed);
  return (
    <span className={styles.demoRow}>
      <span
        className={styles.pressTarget}
        data-pressed={isPressed || undefined}
      >
        <Button scheme="primary" size="medium" variant="contained">
          Continue
        </Button>
      </span>
      <Button scheme="neutral" size="medium" variant="outlined">
        Cancel
      </Button>
    </span>
  );
}

/** A switch flipping on and back. */
export function SwitchDemo({ replayKey, holdMs }: DemoProps) {
  const [isOn, setIsOn] = useState(false);
  useReplay(replayKey, holdMs, setIsOn);
  return <Switch label="Notifications" value={isOn} onChange={setIsOn} />;
}

/** A dropdown opening under its trigger, from nothing to its height. */
export function DropdownDemo({ replayKey, holdMs }: DemoProps) {
  const [isOpen, setIsOpen] = useState(false);
  useReplay(replayKey, holdMs, setIsOpen);
  return (
    <span className={styles.dropdown}>
      <Button
        aria-expanded={isOpen}
        rightIcon={<ChevronDown aria-hidden className="size-4" />}
        scheme="neutral"
        size="medium"
        variant="outlined"
        onClick={() => setIsOpen((open) => !open)}
      >
        Options
      </Button>
      <span className={styles.dropdownPanel} data-open={isOpen || undefined}>
        <span className={styles.dropdownInner}>
          <Card elevation="med" padding={1}>
            <span className={styles.dropdownItems}>
              {["Rename", "Duplicate", "Archive"].map((item) => (
                <Button key={item} scheme="neutral" size="small" variant="text">
                  {item}
                </Button>
              ))}
            </span>
          </Card>
        </span>
      </span>
    </span>
  );
}

/** A dialog fading in and settling to its size over a scrim. */
export function DialogDemo({ replayKey, holdMs }: DemoProps) {
  const [isOpen, setIsOpen] = useState(false);
  useReplay(replayKey, holdMs, setIsOpen);
  return (
    <span className={styles.dialogStage}>
      <Button
        scheme="neutral"
        size="medium"
        variant="outlined"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close dialog" : "Open dialog"}
      </Button>
      <span className={styles.dialogArea}>
        <span className={styles.scrim} data-open={isOpen || undefined}>
          <span className={styles.dialogPanel} data-open={isOpen || undefined}>
            <Card elevation="high" padding={4}>
              <span className={styles.dialogContent}>
                <strong>Delete project?</strong>
                <span>This cannot be undone.</span>
                <Button
                  scheme="primary"
                  size="small"
                  variant="contained"
                  onClick={() => setIsOpen(false)}
                >
                  Delete
                </Button>
              </span>
            </Card>
          </span>
        </span>
      </span>
    </span>
  );
}
