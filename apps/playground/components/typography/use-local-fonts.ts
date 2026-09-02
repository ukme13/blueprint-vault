import { useEffect, useState } from "react";
import {
  FONT_SLOTS,
  fontFileStore,
  legacyLocalFontKey,
  localFontFamilyName,
  localFontKey,
  localSlots,
  rejectFontFile,
  registerLocalFont,
  type FontFileStatus,
  type FontSlot,
  type TypeSystem,
} from "@blueprint/ui";

/**
 * Store a picked file, returning the family name to point the slot at.
 *
 * Outside the component on purpose: it reads the clock and touches storage,
 * neither of which belongs anywhere React might call twice.
 */
export interface StoreLocalFontResult {
  family?: string;
  /** Why the file was refused, said in a way that names the file. */
  rejected?: string;
}

export async function storeLocalFont(
  fontId: string,
  slot: FontSlot,
  file: File,
): Promise<StoreLocalFontResult> {
  /* Checked before anything is read or written: refusing a file after storing
     it would leave the very orphan the plan forbids. */
  const rejected = rejectFontFile(file);
  if (rejected) return { rejected };

  const family = localFontFamilyName(file.name);
  const data = await file.arrayBuffer();

  try {
    const store = fontFileStore();
    await store.put({
      id: localFontKey(fontId, slot),
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      addedAt: Date.now(),
      data,
    });
    /* The primary's file used to live under the bare entry id. Once the slot
       key holds one, that copy is referenced by nothing — which is the orphan
       the plan forbids, so it goes with the write that replaced it. */
    if (slot === "primary") await store.remove(legacyLocalFontKey(fontId));
  } catch {
    /* Storage refused it. The face still registers below, so the preview works
       for this session and the reload is stage 3's problem. */
  }

  /* Not registered here. Pointing the slot at this family re-runs the hook
     below, which reads the file back and registers it once — doing it in both
     places added a second FontFace for the same family on every upload. */
  return { family };
}

/**
 * Forget the file behind one slot.
 *
 * Called wherever a slot stops pointing at one: cleared, switched to a Google
 * family, or removed with its entry. A file nothing references is a copy of
 * someone's licensed font that nobody chose to keep.
 */
export async function forgetFontSlot(
  fontId: string,
  slot: FontSlot,
): Promise<void> {
  try {
    const store = fontFileStore();
    await store.remove(localFontKey(fontId, slot));
    /* The pre-slot key too, or an upload made before this change outlives the
       entry that referenced it. */
    if (slot === "primary") await store.remove(legacyLocalFontKey(fontId));
  } catch {
    /* Storage unavailable. Nothing was stored either, in that case. */
  }
}

/**
 * Move a stored file to the slot its family moved to.
 *
 * Removing a fallback closes the gap behind it, so everything after it is a
 * slot further forward than the key its bytes are under. Read, write, delete,
 * in that order: a crash between the write and the delete leaves a duplicate,
 * which the next removal cleans up, while the other order can lose the file.
 */
export async function moveLocalFont(
  fontId: string,
  from: FontSlot,
  to: FontSlot,
): Promise<void> {
  try {
    const store = fontFileStore();
    const stored = await store.get(localFontKey(fontId, from));
    if (!stored) return;
    await store.put({ ...stored, id: localFontKey(fontId, to) });
    await store.remove(localFontKey(fontId, from));
  } catch {
    /* Storage unavailable. The family still renders from the face already
       registered for this session. */
  }
}

/** Forget every file an entry holds, in every slot. */
export async function forgetFontEntry(fontId: string): Promise<void> {
  for (const slot of FONT_SLOTS) await forgetFontSlot(fontId, slot);
}

/** Forget every file these entries hold. */
export async function forgetLocalFonts(fontIds: string[]): Promise<void> {
  for (const fontId of fontIds) await forgetFontEntry(fontId);
}

/**
 * Whether a slot's file has been found yet.
 *
 * Three states rather than two, because "not loaded" and "not loaded yet" call
 * for different things on screen. Reading the store is asynchronous, so a
 * boolean reports every present file as missing until it resolves — invisible
 * on a fast machine with a small file, and a false alarm on a slow one with a
 * large one.
 */
export type LocalFontStatus = FontFileStatus;

/** The local slots of a system, packed so a change of any of them re-runs. */
function localKeys(system: TypeSystem | null): string[] {
  return localSlots(system).map(
    ({ fontId, slot, family }) => `${localFontKey(fontId, slot)}|${family}`,
  );
}

async function registerStored(entries: string[]): Promise<Set<string>> {
  const present = new Set<string>();
  if (entries.length === 0) return present;

  const store = fontFileStore();
  for (const entry of entries) {
    const separator = entry.indexOf("|");
    const key = entry.slice(0, separator);
    const family = entry.slice(separator + 1);
    if (!key || !family) continue;
    try {
      /* The slot key first, then the key the primary used before slots
         existed, so an upload made before this change still renders rather
         than reporting itself missing. */
      const file =
        (await store.get(key)) ??
        (key.endsWith("::primary")
          ? await store.get(key.slice(0, -"::primary".length))
          : null);
      if (!file) continue;
      /* A file that will not parse is a fallback, not a failure: the family
         name still applies and the generic behind it renders. */
      if (await registerLocalFont(family, file.data)) present.add(key);
    } catch {
      /* Storage unavailable. Same outcome as a missing file. */
    }
  }
  return present;
}

/**
 * Register the uploaded files this system names, so its local fonts render.
 *
 * The project stores a family name; the bytes live in IndexedDB under the
 * slot's key. Nothing joins the two until this runs, which is why it runs on
 * every load rather than only after an upload.
 *
 * Reports each local slot as checking, loaded, or missing, keyed by
 * `localFontKey`. Missing is a normal state rather than an error: the project
 * can be opened in another browser, or storage cleared, and the family name
 * still applies.
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

  /* Keyed on the local slots rather than the system, so this re-runs when a
     font is uploaded or removed and not on every edit to a line height. */
  const key = localKeys(system).join("§");

  useEffect(() => {
    let cancelled = false;
    /* Even the empty case goes through the promise: setting state synchronously
       in an effect body cascades renders. */
    void registerStored(key ? key.split("§") : []).then((present) => {
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
  for (const entry of key ? key.split("§") : []) {
    const slotKey = entry.slice(0, entry.indexOf("|"));
    if (!slotKey) continue;
    statuses.set(
      slotKey,
      current === null
        ? "checking"
        : current.has(slotKey)
          ? "loaded"
          : "missing",
    );
  }
  return statuses;
}
