"use client";

import { useMemo } from "react";
import {
  MinusIcon,
  PlusIcon,
  previewTokenSelectorOptions,
  semanticVariableName,
  type PreviewGroupReading,
  type PreviewSlotStyle,
  type PreviewInspectField,
  type ResolvedRadius,
  type SemanticToken,
  type SpacingToken,
  type PreviewInspectKind,
} from "@blueprint/ui";
import { PreviewColourSwatch } from "../PreviewColourSwatch";
import { InspectIconButton } from "./InspectPrimitives";

export interface LayoutSectionProps {
  style: PreviewSlotStyle;
  fields: readonly PreviewInspectField[];
  spacing: readonly SpacingToken[];
  radius: readonly ResolvedRadius[];
  onStyleChange: (next: PreviewSlotStyle) => void;
}

export const icon = "size-3.5";

/** A spacing step as the control shows it: its name, and what it comes to. */
export function stepDisplay(
  spacing: readonly SpacingToken[],
  step: number | undefined,
) {
  const token = spacing.find((each) => each.step === step);
  return token
    ? {
        text: (
          <>
            {token.name}
            <small>{token.px}px</small>
          </>
        ),
      }
    : null;
}

export function radiusDisplay(
  radius: readonly ResolvedRadius[],
  id: string | undefined,
) {
  const token = radius.find((each) => each.id === id);
  return token
    ? {
        text: (
          <>
            {token.name}
            <small>{token.px}px</small>
          </>
        ),
      }
    : null;
}

export function spacingOptions(spacing: readonly SpacingToken[]) {
  return spacing.map((token) => ({
    value: String(token.step),
    label: token.name,
    description: `${token.px}px`,
  }));
}

export function radiusOptions(radius: readonly ResolvedRadius[]) {
  return radius.map((token) => ({
    value: token.id,
    label: token.name,
    description: `${token.px}px`,
  }));
}

/** The one value a reading comes to, for the control to show. */
export function sameOf<T>(reading: PreviewGroupReading<T>): T | undefined {
  return reading.kind === "same" ? reading.value : undefined;
}

export interface StyleSectionProps {
  kind: PreviewInspectKind;
  style: PreviewSlotStyle;
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  onStyleChange: (next: PreviewSlotStyle) => void;
}

/** A token as a control shows it: its colour, and its name. */
export function tokenDisplay(
  tokens: readonly SemanticToken[],
  tokenColors: Record<string, string> | undefined,
  id: string | undefined,
) {
  const token = tokens.find((each) => each.id === id);
  return token
    ? {
        icon: (
          <PreviewColourSwatch
            hex={tokenColors?.[token.id]}
            variable={semanticVariableName(token.id)}
          />
        ),
        text: token.name,
      }
    : null;
}

/** A token list with a swatch on each, from the groups a field draws from. */
export function useTokenOptions(
  tokens: readonly SemanticToken[],
  tokenColors: Record<string, string> | undefined,
  groups: readonly string[],
) {
  return useMemo(
    () =>
      previewTokenSelectorOptions(tokens, groups).map((section) => ({
        ...section,
        options: section.options.map((option) => ({
          ...option,
          icon: (
            <PreviewColourSwatch
              hex={tokenColors?.[option.value]}
              variable={semanticVariableName(option.value)}
            />
          ),
        })),
      })),
    [tokens, tokenColors, groups],
  );
}

export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <InspectIconButton icon={<PlusIcon />} label={label} onClick={onClick} />
  );
}

export function RemoveButton({
  label,
  isDisabled,
  onClick,
}: {
  label: string;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <InspectIconButton
      icon={<MinusIcon />}
      isDisabled={isDisabled}
      label={label}
      onClick={onClick}
    />
  );
}
