/** Per tab, not per browser: a new session opens every list at the top. */
const STORAGE_KEY = "blueprint.scroll.v1";

type ScrollMemory = Record<string, number>;

function readAll(): ScrollMemory {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    /* Only finite numbers, so a hand-edited value cannot become a scroll. */
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

/** Where a list was scrolled to when it was left, or null if it never was. */
export function readScrollPosition(key: string): number | null {
  return readAll()[key] ?? null;
}

/** Notes where a list is scrolled to. Zero is the top, so it is not kept. */
export function saveScrollPosition(key: string, top: number): void {
  try {
    const { [key]: previous, ...rest } = readAll();
    const next = top > 0 ? { ...rest, [key]: Math.round(top) } : rest;
    if (previous === next[key]) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Storage off (a private window): the list opens at the top. */
  }
}

/** The nearest ancestor that scrolls vertically, which is not always the window. */
export function scrollParent(element: HTMLElement): HTMLElement | null {
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return null;
}
