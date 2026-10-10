"use client";

import { useState } from "react";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import type { PreviewSectionFill } from "@blueprint/ui";
import { Ellipsis } from "lucide-react";
import styles from "./PreviewSectionBand.module.css";

/**
 * Studio ⋯ on a frozen `/preview` band. Lives outside `components/preview/`
 * so the canvas scanners do not have to exempt chrome.
 *
 * Choosing a background opens the inspector on the band. Putting an image up
 * is not offered, but a band that already has one can still let it go.
 */
export function PreviewSectionMenu({
  label,
  fill,
  onPickColour,
  onFillChange,
}: {
  label: string;
  fill: PreviewSectionFill;
  onPickColour: () => void;
  onFillChange: (fill: PreviewSectionFill) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const items = [
    { label: "Background colour…", onClick: onPickColour },
    ...(fill.kind === "image"
      ? [
          {
            label: "Remove image",
            onClick: () =>
              onFillChange({ kind: "token", tokenId: fill.fallbackTokenId }),
          },
        ]
      : []),
  ];

  return (
    <div
      className={menuOpen ? `${styles.menu} ${styles.menuOpen}` : styles.menu}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu
        alignment="end"
        button={{
          "aria-label": `Section fill for ${label}`,
          icon: <Ellipsis />,
          isIconOnly: true,
          label: `Section fill for ${label}`,
          size: "sm",
          variant: "ghost",
        }}
        hasChevron={false}
        isMenuOpen={menuOpen}
        items={items}
        menuWidth={200}
        onOpenChange={setMenuOpen}
        placement="below"
      />
    </div>
  );
}
