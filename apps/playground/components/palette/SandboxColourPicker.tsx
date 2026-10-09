"use client";

import { useState } from "react";
import { ChevronDown, PaintBucket } from "lucide-react";
import {
  groupSemanticTokens,
  parseShadeOptionValue,
  resolveSemantic,
  shadeOptionSections,
  shadeOptionValue,
  type ColorTrack,
  type ColourMode,
  type ResolvedSandboxColour,
  type SandboxColour,
  type SemanticToken,
} from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import { SelectorOptionList } from "../SelectorOptionList";
import { usePaletteView } from "./PaletteViewContext";
import { TransparencySwatch } from "./TransparencySwatch";
import styles from "./accessibility-sandbox.module.css";

type PickerTab = "semantic" | "primitive";

const TABS: readonly { id: PickerTab; label: string }[] = [
  { id: "semantic", label: "Semantic" },
  { id: "primitive", label: "Primitive" },
];

interface SandboxColourPickerProps {
  /** What is being coloured, for the dialog's name. */
  targetLabel: string;
  colour: SandboxColour;
  resolved: ResolvedSandboxColour;
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  mode: ColourMode;
  onChange: (colour: SandboxColour) => void;
}

/**
 * The colour of a layer: a role of the layer, or a shade of a track.
 *
 * Two tabs over one searchable list. A role follows the theme, so it is the
 * tab that opens for a layer that holds one; a shade is the same in light and
 * dark. Choosing closes the list, as every other picker in the studio does,
 * and the shade ramp beside it is for trying neighbours quickly.
 */
export function SandboxColourPicker({
  targetLabel,
  colour,
  resolved,
  tokens,
  palettes,
  mode,
  onChange,
}: SandboxColourPickerProps) {
  const { seen } = usePaletteView();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>(colour.kind);
  const [query, setQuery] = useState("");

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };
  const swatch = (hex: string) => (
    <TransparencySwatch alpha={1} colour={seen(hex)} />
  );

  const semanticOptions = groupSemanticTokens(tokens).map((group) => ({
    type: "section" as const,
    title: group.label,
    options: group.tokens.flatMap((token) => {
      const each = resolveSemantic(token, mode, palettes);
      return each
        ? [{ label: token.name, value: token.id, icon: swatch(each.hex) }]
        : [];
    }),
  }));
  const primitiveOptions = shadeOptionSections(palettes, swatch);

  const value =
    tab !== colour.kind
      ? undefined
      : colour.kind === "semantic"
        ? colour.id
        : shadeOptionValue(colour);

  const choose = (next: string) => {
    if (tab === "semantic") {
      onChange({ kind: "semantic", id: next });
    } else {
      const picked = parseShadeOptionValue(next);
      if (picked) onChange({ kind: "primitive", ...picked });
    }
    close();
  };

  return (
    <PopoverOrSheet
      isFlush
      isOpen={isOpen}
      label={`${targetLabel} colour`}
      trigger={
        <button
          aria-label={`${targetLabel} colour: ${resolved.name}`}
          className={styles.pickerTrigger}
          type="button"
        >
          <PaintBucket aria-hidden className="size-3.5" />
          <span>{resolved.name}</span>
          <ChevronDown aria-hidden className="size-4 text-fg-muted" />
        </button>
      }
      width={300}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
    >
      <section className={styles.pickerPanel}>
        <div
          aria-label="Colour source"
          className={styles.pickerTabs}
          role="tablist"
        >
          {TABS.map((each) => (
            <button
              key={each.id}
              aria-selected={tab === each.id}
              className={styles.pickerTab}
              role="tab"
              type="button"
              onClick={() => {
                setTab(each.id);
                setQuery("");
              }}
            >
              {each.label}
            </button>
          ))}
        </div>
        <SelectorOptionList
          density="compact"
          hasAutoFocus
          hasSearch
          label={`${targetLabel} ${tab} colours`}
          options={tab === "semantic" ? semanticOptions : primitiveOptions}
          query={query}
          searchPlaceholder={
            tab === "semantic" ? "Search roles" : "Search shades"
          }
          value={value}
          onChoose={(option) => choose(option.value)}
          onQueryChange={setQuery}
        />
      </section>
    </PopoverOrSheet>
  );
}
