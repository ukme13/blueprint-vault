"use client";

import { useState } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Button, type ShadeItem } from "@blueprint/ui";
import styles from "./palette-workspace.module.css";

interface ShadeDetailPopoverProps {
  paletteName: string;
  shade: ShadeItem;
  onClose: () => void;
}

export function ShadeDetailPopover({
  paletteName,
  shade,
  onClose,
}: ShadeDetailPopoverProps) {
  const [copyLabel, setCopyLabel] = useState("Copy HEX");

  const copyHex = async () => {
    await navigator.clipboard.writeText(shade.hex);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy HEX"), 1200);
  };

  return (
    <section className={styles.shadePopoverContent}>
      <header>
        <p>
          <i style={{ backgroundColor: shade.hex }} />
          <strong>
            {paletteName} · {shade.weight}
          </strong>
        </p>
        <IconButton
          icon={
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <path
                d="m4.5 4.5 7 7m0-7-7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
          }
          label="Close shade details"
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </header>

      <p className={styles.popoverValue}>
        <span>OKLCH</span>
        <code>
          {Math.round(shade.L * 100)}% {shade.C.toFixed(3)} {shade.H.toFixed(1)}
        </code>
      </p>

      <dl className={styles.popoverDetails}>
        <dt>HEX</dt>
        <dd>{shade.hex}</dd>
        <dt>Lightness</dt>
        <dd>{(shade.L * 100).toFixed(1)}%</dd>
        <dt>Chroma</dt>
        <dd>{shade.C.toFixed(3)}</dd>
        <dt>Hue</dt>
        <dd>{shade.H.toFixed(1)}°</dd>
      </dl>

      <footer>
        <span>{shade.isAnchor ? "Source colour" : "Generated shade"}</span>
        <Button scheme="neutral" size="xs" variant="outlined" onClick={copyHex}>
          {copyLabel}
        </Button>
      </footer>
    </section>
  );
}
