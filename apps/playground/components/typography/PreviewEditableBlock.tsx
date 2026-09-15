"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { blockElementForRole, type PreviewDocumentBlock } from "@blueprint/ui";
import { caretOffsetIn } from "./preview-document-dom";

interface PreviewEditableBlockProps {
  block: PreviewDocumentBlock;
  tag: ReturnType<typeof blockElementForRole>;
  style: CSSProperties;
  selected: boolean;
  onSelect: (blockId: string) => void;
  onTextChange: (blockId: string, text: string) => void;
  onEnter: (blockId: string, offset: number) => void;
  onBackspaceAtStart: (blockId: string) => void;
}

export function PreviewEditableBlock({
  block,
  tag: Tag,
  style,
  selected,
  onSelect,
  onTextChange,
  onEnter,
  onBackspaceAtStart,
}: PreviewEditableBlockProps) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || focused.current) return;
    if (el.textContent !== block.text) {
      el.textContent = block.text;
    }
  }, [block.text, Tag]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onEnter(block.id, caretOffsetIn(event.currentTarget));
      return;
    }
    if (event.key === "Backspace" && caretOffsetIn(event.currentTarget) === 0) {
      event.preventDefault();
      onBackspaceAtStart(block.id);
    }
  };

  return (
    <Tag
      ref={ref as never}
      contentEditable
      data-preview-block={block.id}
      data-selected={selected ? "true" : undefined}
      style={style}
      suppressContentEditableWarning
      onBlur={() => {
        focused.current = false;
        onTextChange(block.id, ref.current?.innerText ?? "");
      }}
      onFocus={() => {
        focused.current = true;
        onSelect(block.id);
      }}
      onInput={() => onTextChange(block.id, ref.current?.innerText ?? "")}
      onKeyDown={onKeyDown}
    />
  );
}
