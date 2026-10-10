"use client";

import { Button } from "@astryxdesign/core/Button";
import { PanelRightClose } from "lucide-react";
import {
  PREVIEW_INSPECT_FIELDS,
  previewInspectorCopyField,
  type PreviewDocumentBlock,
  type PreviewInspectKind,
  type PreviewSectionFill,
  type PreviewSlotStyle,
  type ResolvedElevation,
  type ResolvedRadius,
  type SemanticToken,
  type SpacingToken,
  type TypeRoleRowGroup,
} from "@blueprint/ui";
import { InspectIconButton } from "./InspectPrimitives";
import { AppearanceSection } from "./InspectAppearance";
import { AutoLayoutSection } from "./InspectAutoLayout";
import { EffectsSection } from "./InspectEffects";
import { FillSection } from "./InspectFill";
import { StrokeSection } from "./InspectStroke";
import { CopySection, TypographySection } from "./InspectTextSections";
import styles from "./inspect-panel.module.css";

export interface InspectTarget {
  id: string;
  kind: PreviewInspectKind;
  /** What the element is part of, or "Inspect": "Nav links", "Hero". */
  title: string;
  /** The element itself: "Home", "Hero title". Blank for a band. */
  subtitle: string;
}

const KIND_LABEL: Record<PreviewInspectKind, string> = {
  text: "Text",
  button: "Button",
  band: "Band",
};

export interface PreviewInspectPanelProps {
  /** What is selected, or null for nothing. */
  target: InspectTarget | null;
  style: PreviewSlotStyle;
  /** The slot's copy, role and colour. Null for a band. */
  block: PreviewDocumentBlock | null;
  /** A band's fill. */
  bandFill: PreviewSectionFill | null;
  /** Why the last image for the band could not be used, in words. */
  bandError?: string | null;
  spacing: readonly SpacingToken[];
  radius: readonly ResolvedRadius[];
  elevation: readonly ResolvedElevation[];
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  roleGroups: readonly TypeRoleRowGroup[];
  /** Whether the slot is in a style group, which Apply to group acts on. */
  isGrouped: boolean;
  /** Whether it is a button, which Apply to all buttons acts on. */
  isButton: boolean;
  isOverridden: boolean;
  /** In a phone's sheet rather than the page's right edge. */
  isInSheet?: boolean;
  onStyleChange: (next: PreviewSlotStyle) => void;
  onTextChange: (text: string) => void;
  onRoleChange: (roleId: string) => void;
  onColourChange: (tokenId: string | undefined) => void;
  onBandFillChange: (tokenId: string) => void;
  onApplyToGroup: () => void;
  onApplyToAllButtons: () => void;
  onResetToDefault: () => void;
  onClose: () => void;
}

/**
 * The inspect panel: a Figma-style column for whatever is selected on the
 * page, and the page stays in view beside it.
 *
 * What it offers is what the element's kind offers, and no more: a text has
 * its type and colour and how opaque it is, a button its shape, room, fill,
 * edge and shadow, a band the room it holds besides. Every value is a token,
 * and each change is written as it is made, so the page beside it is the
 * answer.
 */
export function PreviewInspectPanel(props: PreviewInspectPanelProps) {
  const { target, isInSheet } = props;

  if (!target) {
    return (
      <aside
        aria-label="Inspect"
        className={styles.panel}
        data-in-sheet={isInSheet || undefined}
      >
        <header className={styles.title}>
          <h2>Inspect</h2>
          <InspectIconButton
            icon={<PanelRightClose aria-hidden className="size-4" />}
            label="Hide inspector"
            onClick={props.onClose}
          />
        </header>
        <p className={styles.empty}>
          Select text, a button or a band on the page to see what it is made of
          and change it.
        </p>
      </aside>
    );
  }

  const fields = PREVIEW_INSPECT_FIELDS[target.kind];
  const has = (...wanted: (typeof fields)[number][]) =>
    wanted.some((field) => fields.includes(field));
  const { block, style } = props;

  return (
    <aside
      aria-label="Inspect"
      className={styles.panel}
      data-in-sheet={isInSheet || undefined}
      key={target.id}
    >
      <header className={styles.title}>
        <div>
          <h2>{target.title}</h2>
          <small>{target.subtitle || KIND_LABEL[target.kind]}</small>
        </div>
        <InspectIconButton
          icon={<PanelRightClose aria-hidden className="size-4" />}
          label="Hide inspector"
          onClick={props.onClose}
        />
      </header>

      {block && has("copy") ? (
        <CopySection
          field={previewInspectorCopyField(target.id)}
          text={block.text}
          onTextChange={props.onTextChange}
        />
      ) : null}

      {has("gap", "padding") ? (
        <AutoLayoutSection
          fields={fields}
          radius={props.radius}
          spacing={props.spacing}
          style={style}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {has("opacity", "radius") ? (
        <AppearanceSection
          fields={fields}
          radius={props.radius}
          spacing={props.spacing}
          style={style}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {block && has("typography") ? (
        <TypographySection
          roleGroups={props.roleGroups}
          roleId={block.roleId}
          onRoleChange={props.onRoleChange}
        />
      ) : null}

      <FillSection
        bandError={props.bandError}
        bandFill={props.bandFill}
        colourTokenId={block?.colorTokenId}
        kind={target.kind}
        style={style}
        tokenColors={props.tokenColors}
        tokens={props.tokens}
        onBandFillChange={props.onBandFillChange}
        onColourChange={props.onColourChange}
        onStyleChange={props.onStyleChange}
      />

      {has("stroke") ? (
        <StrokeSection
          kind={target.kind}
          style={style}
          tokenColors={props.tokenColors}
          tokens={props.tokens}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {has("effects") ? (
        <EffectsSection
          elevation={props.elevation}
          style={style}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {props.isGrouped || props.isButton || props.isOverridden ? (
        <div className={styles.actions}>
          {props.isGrouped ? (
            <Button
              label="Apply to group"
              size="sm"
              variant="secondary"
              onClick={props.onApplyToGroup}
            />
          ) : null}
          {props.isButton ? (
            <Button
              label="Apply to all buttons"
              size="sm"
              variant="secondary"
              onClick={props.onApplyToAllButtons}
            />
          ) : null}
          {props.isOverridden ? (
            <Button
              label="Reset to default"
              size="sm"
              variant="ghost"
              onClick={props.onResetToDefault}
            />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
