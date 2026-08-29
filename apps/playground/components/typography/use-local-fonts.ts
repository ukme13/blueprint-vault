import { useEffect, useState } from "react";
import {
  fontFileStore,
  localFontFamilyName,
  registerLocalFont,
  type TypeSystem,
} from "@blueprint/ui";

/**
 * Store a picked file, returning the family name to point the font entry at.
 *
 * Outside the component on purpose: it reads the clock and touches storage,
 * neither of which belongs anywhere React might call twice.
 */
export async function storeLocalFont(
  fontId: string,
  file: File,
): Promise<string> {
  const family = localFontFamilyName(file.name);
  const data = await file.arrayBuffer();

  try {
    await fontFileStore().put({
      id: fontId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      addedAt: Date.now(),
      data,
    });
  } catch {
    /* Storage refused it. The face still registers below, so the preview works
       for this session and the reload is stage 3's problem. */
  }

  /* Not registered here. Pointing the entry at this family re-runs the hook
     below, which reads the file back and registers it once — doing it in both
     places added a second FontFace for the same family on every upload. */
  return family;
}

/**
 * Whether an entry's file has been found yet.
 *
 * Three states rather than two, because "not loaded" and "not loaded yet" call
 * for different things on screen. Reading the store is asynchronous, so a
 * boolean reports every present file as missing until it resolves — invisible
 * on a fast machine with a small file, and a false alarm on a slow one with a
 * large one.
 */
export type LocalFontStatus = "checking" | "loaded" | "missing";

/** The local entries of a system, as `id:family` pairs. */
function localEntries(system: TypeSystem | null): string[] {
  return (system?.fonts ?? [])
    .filter((font) => font.source === "local")
    .map((font) => `${font.id}:${font.families[0] ?? ""}`);
}

async function registerStored(entries: string[]): Promise<Set<string>> {
  const present = new Set<string>();
  if (entries.length === 0) return present;

  const store = fontFileStore();
  for (const entry of entries) {
    const separator = entry.indexOf(":");
    const id = entry.slice(0, separator);
    const family = entry.slice(separator + 1);
    if (!id || !family) continue;
    try {
      const file = await store.get(id);
      if (!file) continue;
      /* A file that will not parse is a fallback, not a failure: the family
         name still applies and the generic behind it renders. */
      if (await registerLocalFont(family, file.data)) present.add(id);
    } catch {
      /* Storage unavailable. Same outcome as a missing file. */
    }
  }
  return present;
}

/**
 * Register the uploaded files this system names, so its local fonts render.
 *
 * The project stores a family name; the bytes live in IndexedDB under the font
 * entry's id. Nothing joins the two until this runs, which is why it runs on
 * every load rather than only after an upload.
 *
 * Reports each local entry as checking, loaded, or missing. Missing is a normal
 * state rather than an error: the project can be opened in another browser, or
 * storage cleared, and the family name still applies.
 */
export function useLocalFonts(
  system: TypeSystem | null,
  /**
   * Bumped whenever the stored files change.
   *
   * Re-adding a missing file usually produces the same family name, so the
   * system is identical afterwards and nothing here would re-run — the font
   * would stay reported as missing while its file sat in the store.
   */
  revision = 0,
): Map<string, LocalFontStatus> {
  /* The answer is stored with the question it answers. Comparing the two is
     what makes "checking" a derived state rather than one this has to set
     synchronously at the top of the effect, which cascades renders. */
  const [answer, setAnswer] = useState<{
    key: string;
    present: Set<string>;
  } | null>(null);

  /* Keyed on the local entries rather than the system, so this re-runs when a
     font is uploaded or removed and not on every edit to a line height. */
  const key = localEntries(system).join("|");

  useEffect(() => {
    let cancelled = false;
    /* Even the empty case goes through the promise: setting state synchronously
       in an effect body cascades renders. */
    void registerStored(key ? key.split("|") : []).then((present) => {
      if (!cancelled) setAnswer({ key: `${revision}:${key}`, present });
    });
    return () => {
      cancelled = true;
    };
  }, [key, revision]);

  /* Stale until the effect has answered this exact key, so a system whose
     fonts just changed reports checking rather than the previous answer. */
  const question = `${revision}:${key}`;
  const current = answer?.key === question ? answer.present : null;

  const statuses = new Map<string, LocalFontStatus>();
  for (const entry of key ? key.split("|") : []) {
    const id = entry.slice(0, entry.indexOf(":"));
    if (!id) continue;
    statuses.set(
      id,
      current === null ? "checking" : current.has(id) ? "loaded" : "missing",
    );
  }
  return statuses;
}
