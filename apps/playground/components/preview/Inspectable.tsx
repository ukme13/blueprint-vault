"use client";

import {
  createElement,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Button,
  previewBlock,
  resolveDocumentRole,
  semanticVariableName,
  type PreviewDocument,
  type PreviewDocumentBlock,
  type TypeSystem,
} from "@blueprint/ui";
import { typeRoleStyle } from "./preview-role-style";

const ACTION = "var(--color-action-primary)";
const ON_ACTION = "var(--color-fg-on-action)";
const TEXT = "var(--color-fg-primary)";
const BORDER = "var(--color-border-default)";
const SURFACE = "var(--color-surface-base)";

export function slot(
  document: PreviewDocument,
  id: string,
): PreviewDocumentBlock | undefined {
  return previewBlock(document, id);
}

export type LandingSectionProps = {
  landing: PreviewDocument;
  system: TypeSystem;
  onInspect: (id: string) => void;
};

type InspectableTag =
  "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "blockquote";

/** Looks up a frozen slot and paints it, or nothing if the id is missing. */
export function InspectableSlot({
  as,
  document,
  id,
  system,
  onInspect,
  children,
  className,
}: {
  as: InspectableTag;
  document: PreviewDocument;
  id: string;
  system: TypeSystem;
  onInspect: (id: string) => void;
  children?: ReactNode;
  className?: string;
}): ReactElement | null {
  const block = slot(document, id);
  if (!block) return null;
  return (
    <Inspectable
      as={as}
      block={block}
      className={className}
      system={system}
      onInspect={() => onInspect(block.id)}
    >
      {children}
    </Inspectable>
  );
}

export function InspectableButton({
  document,
  id,
  onInspect,
  variant = "contained",
  invert = false,
}: {
  document: PreviewDocument;
  id: string;
  onInspect: (id: string) => void;
  variant?: "contained" | "outlined";
  invert?: boolean;
}): ReactElement | null {
  const block = slot(document, id);
  if (!block) return null;
  return (
    <SlotButton
      block={block}
      invert={invert}
      variant={variant}
      onInspect={() => onInspect(block.id)}
    />
  );
}

export function Inspectable({
  as,
  block,
  system,
  onInspect,
  children,
  style,
  className,
}: {
  as: InspectableTag;
  block: PreviewDocumentBlock;
  system: TypeSystem;
  onInspect: () => void;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}): ReactElement {
  const role = resolveDocumentRole(system, block.roleId);
  const roleStyle = role ? typeRoleStyle(role.id) : undefined;
  const colorStyle = block.colorTokenId
    ? { color: `var(${semanticVariableName(block.colorTokenId)})` }
    : undefined;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onInspect();
  };

  return createElement(
    as,
    {
      "aria-haspopup": "dialog" as const,
      className,
      style: {
        ...roleStyle,
        ...colorStyle,
        ...style,
        margin: 0,
        cursor: "pointer",
      },
      tabIndex: 0,
      onClick: onInspect,
      onKeyDown,
    },
    children ?? block.text,
  );
}

export function SlotButton({
  block,
  onInspect,
  variant = "contained",
  invert = false,
}: {
  block: PreviewDocumentBlock;
  onInspect: () => void;
  variant?: "contained" | "outlined";
  invert?: boolean;
}): ReactElement {
  const fill = invert
    ? { background: SURFACE, color: TEXT, borderColor: SURFACE }
    : variant === "contained"
      ? { background: ACTION, color: ON_ACTION }
      : {
          background: "transparent",
          color: TEXT,
          borderColor: BORDER,
        };

  return (
    <Button
      aria-haspopup="dialog"
      scheme="primary"
      size="medium"
      style={fill}
      variant={variant}
      onClick={onInspect}
    >
      {block.text}
    </Button>
  );
}
