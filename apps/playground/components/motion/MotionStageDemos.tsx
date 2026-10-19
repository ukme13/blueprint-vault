"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
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
  /**
   * The custom properties the stage sets. A demo drawn outside the stage, as the
   * dialog is, sets them again on itself, since it no longer inherits them.
   */
  variables?: CSSProperties;
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

/**
 * A dropdown opening under its trigger. The panel is a layer over the card, not
 * part of its flow, so the trigger stays where it is whether it is open or not;
 * it fades in and settles from a little smaller, from the edge it hangs from.
 */
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
      <span
        className={styles.dropdownPanel}
        data-open={isOpen || undefined}
        inert={!isOpen}
      >
        <span className={styles.dropdownInner}>
          <Card elevation="med" padding={1}>
            <span className={styles.dropdownItems}>
              {["Rename", "Duplicate", "Archive", "Reset"].map((item) => (
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

/* The window's body, once there is one: nothing on the server, which has no
   document to put a modal in. */
const subscribeNothing = () => () => {};
const documentBody = () => document.body;
const noBody = () => null;

/**
 * A dialog as a real modal: a scrim over the whole window and the panel in the
 * middle of it, which fades in and settles from a little smaller. A press on the
 * scrim, Delete or Escape closes it.
 *
 * Replay leaves it alone: a modal over the whole window is opened by the person,
 * not popped up by a button on a toolbar. It is drawn in the body, outside the stage, so it sets the stage's properties
 * on itself to move on the same scale.
 */
export function DialogDemo({ variables }: DemoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const host = useSyncExternalStore(subscribeNothing, documentBody, noBody);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    /* Into the dialog when it opens, and back to what opened it when it goes. */
    const opener = trigger.current;
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <span className={styles.dialogStage}>
      <Button
        ref={trigger}
        aria-haspopup="dialog"
        scheme="neutral"
        size="medium"
        variant="outlined"
        onClick={() => setIsOpen(true)}
      >
        Open dialog
      </Button>
      {host
        ? createPortal(
            <div
              className={styles.scrim}
              data-open={isOpen || undefined}
              inert={!isOpen}
              style={variables}
              onClick={(event) => {
                if (event.target === event.currentTarget) setIsOpen(false);
              }}
            >
              <div
                ref={panel}
                aria-label="Delete project"
                aria-modal="true"
                className={styles.dialogPanel}
                data-open={isOpen || undefined}
                role="dialog"
                tabIndex={-1}
              >
                <Card elevation="high" padding={4}>
                  <span className={styles.dialogContent}>
                    <strong>Delete project?</strong>
                    <span>This cannot be undone.</span>
                    <span className={styles.dialogActions}>
                      <Button
                        scheme="neutral"
                        size="small"
                        variant="outlined"
                        onClick={() => setIsOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        scheme="primary"
                        size="small"
                        variant="contained"
                        onClick={() => setIsOpen(false)}
                      >
                        Delete
                      </Button>
                    </span>
                  </span>
                </Card>
              </div>
            </div>,
            host,
          )
        : null}
    </span>
  );
}
