"use client";

import { useState } from "react";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Ellipsis } from "lucide-react";
import styles from "./PreviewSectionBand.module.css";

/**
 * Studio ⋯ on a frozen `/preview` band that still has an image, to let it go.
 *
 * Nothing puts an image up any more, and a band's colour is chosen by
 * picking the band, so a band without an image has no menu at all. Lives
 * outside `components/preview/` so the canvas scanners do not have to exempt
 * chrome.
 */
export function PreviewSectionMenu({
  label,
  onRemoveImage,
}: {
  label: string;
  onRemoveImage: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        items={[{ label: "Remove image", onClick: onRemoveImage }]}
        menuWidth={200}
        onOpenChange={setMenuOpen}
        placement="below"
      />
    </div>
  );
}
