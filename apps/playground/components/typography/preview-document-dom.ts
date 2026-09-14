export function caretOffsetIn(el: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return (el.textContent ?? "").length;
  }
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer)) {
    return (el.textContent ?? "").length;
  }
  const prefix = range.cloneRange();
  prefix.selectNodeContents(el);
  prefix.setEnd(range.startContainer, range.startOffset);
  return prefix.toString().length;
}

export function blockIdsIntersectingSelection(
  root: HTMLElement | null,
): string[] {
  if (!root) return [];
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return [];
  const range = selection.getRangeAt(0);
  const ids: string[] = [];
  for (const node of root.querySelectorAll("[data-preview-block]")) {
    if (range.intersectsNode(node)) {
      const id = node.getAttribute("data-preview-block");
      if (id) ids.push(id);
    }
  }
  return ids;
}
