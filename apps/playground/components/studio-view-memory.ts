import { rememberStudioView, type StudioViewMemory } from "@blueprint/ui";

/** Per tab, not per browser: a new session opens every studio as it opens. */
const STORAGE_KEY = "blueprint.studio-view.v1";

/** Each studio's last non-default view, `{}` when there is none or storage is off. */
export function readStudioViewMemory(): StudioViewMemory {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    /* Only strings, so a hand-edited value cannot become a link. */
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

/** Notes the query a studio is on, so the sidebar can take somebody back to it. */
export function saveStudioView(path: string, search: string): void {
  try {
    const current = readStudioViewMemory();
    const next = rememberStudioView(current, path, search);
    if (next !== current) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* Storage off (a private window): the URL still holds the view. */
  }
}
