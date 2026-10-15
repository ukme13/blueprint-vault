"use client";

import { Button } from "@astryxdesign/core/Button";
import { Button as ResetButton } from "@blueprint/ui";
import { useMemo } from "react";
import { PanelRightClose } from "lucide-react";
import {
  PREVIEW_INSPECT_FIELDS,
  PREVIEW_PAGE_ID,
  previewNativeStyle,
  previewInspectorCopyField,
  type PreviewDocumentBlock,
  type PreviewInspectKind,
  type PreviewSectionFill,
  type PreviewSectionId,
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
import { VariantSection } from "./InspectVariant";
import { CopySection, TypographySection } from "./InspectTextSections";
import { readNativeMetrics } from "./native-metrics";
import styles from "./inspect-panel.module.css";

export interface InspectTarget {
  id: string;
  kind: PreviewInspectKind;
  /** What the element is part of, or "Inspect": "Nav links", "Hero". */
  title: string;
}

export interface PreviewInspectPanelProps {
  /** What is selected, or null for nothing. */
  target: InspectTarget | null;
  style: PreviewSlotStyle;
  /** The slot's copy, role and colour. Null for a band. */
  block: PreviewDocumentBlock | null;
  /** A band's fill. */
  bandFill: PreviewSectionFill | null;
  spacing: readonly SpacingToken[];
  radius: readonly ResolvedRadius[];
  elevation: readonly ResolvedElevation[];
  tokens: readonly SemanticToken[];
  tokenColors?: Record<string, string>;
  roleGroups: readonly TypeRoleRowGroup[];
  /** Whether the slot is in a style group, which Apply to group acts on. */
  isGrouped: boolean;
  /** Whether it is a button, which Apply type to all buttons acts on. */
  isButton: boolean;
  isOverridden: boolean;
  /** In a phone's sheet rather than the page's right edge. */
  isInSheet?: boolean;
  onStyleChange: (next: PreviewSlotStyle) => void;
  onTextChange: (text: string) => void;
  onRoleChange: (roleId: string) => void;
  onColourChange: (tokenId: string | undefined) => void;
  onBandFillChange: (tokenId: string | null) => void;
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
  const targetId = target?.id;
  const isBand = target?.kind === "band";
  /* What the page draws the element with before anything is set, read from the
     page; again when a scale it is measured in is changed. */
  const metrics = useMemo(
    () => (targetId ? readNativeMetrics(targetId, isBand) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetId, isBand, props.spacing, props.radius],
  );

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
        <FillSection
          kind="page"
          native={previewNativeStyle(PREVIEW_PAGE_ID, "page")}
          style={props.style}
          title="Page"
          tokenColors={props.tokenColors}
          tokens={props.tokens}
          onBandFillChange={props.onBandFillChange}
          onColourChange={props.onColourChange}
          onStyleChange={props.onStyleChange}
        />
        <p className={styles.empty}>
          Select text, a button or a band on the page to see what it is made of
          and change it.
        </p>
        {props.isOverridden ? (
          <div className={styles.actions}>
            <ResetButton
              className={styles.fullWidth}
              scheme="neutral"
              size="medium"
              variant="outlined"
              onClick={props.onResetToDefault}
            >
              Reset to default
            </ResetButton>
          </div>
        ) : null}
      </aside>
    );
  }

  const fields = PREVIEW_INSPECT_FIELDS[target.kind];
  const native = previewNativeStyle(
    target.id,
    target.kind,
    props.style.variant,
  );
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
        <h2>{target.title}</h2>
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

      {has("variant") ? (
        <VariantSection
          id={target.id}
          style={style}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {has("gap", "padding") ? (
        <AutoLayoutSection
          fields={fields}
          metrics={metrics}
          radius={props.radius}
          spacing={props.spacing}
          style={style}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {has("opacity", "radius") ? (
        <AppearanceSection
          fields={fields}
          metrics={metrics}
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

      {has("fill") ? (
        <FillSection
          bandFill={props.bandFill}
          bandId={
            target.kind === "band" ? (target.id as PreviewSectionId) : undefined
          }
          colourTokenId={block?.colorTokenId}
          kind={target.kind}
          native={native}
          style={style}
          tokenColors={props.tokenColors}
          tokens={props.tokens}
          onBandFillChange={props.onBandFillChange}
          onColourChange={props.onColourChange}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {has("stroke") ? (
        <StrokeSection
          native={native}
          style={style}
          tokenColors={props.tokenColors}
          tokens={props.tokens}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {has("effects") ? (
        <EffectsSection
          elevation={props.elevation}
          native={native}
          style={style}
          onStyleChange={props.onStyleChange}
        />
      ) : null}

      {props.isGrouped || props.isButton || props.isOverridden ? (
        <div className={styles.actions}>
          {props.isGrouped ? (
            <Button
              label="Apply to group"
              size="md"
              variant="secondary"
              width="100%"
              onClick={props.onApplyToGroup}
            />
          ) : null}
          {props.isButton ? (
            <Button
              label="Apply type to all buttons"
              size="md"
              variant="secondary"
              width="100%"
              onClick={props.onApplyToAllButtons}
            />
          ) : null}
          {props.isOverridden ? (
            <ResetButton
              className={styles.fullWidth}
              scheme="neutral"
              size="medium"
              variant="outlined"
              onClick={props.onResetToDefault}
            >
              Reset to default
            </ResetButton>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
