/*
 * Turning a file someone picked into a font the browser will render.
 *
 * The name is the interesting part. It becomes the CSS family, so it is what
 * the export writes and what the preview asks for — and it has to survive a
 * reload, because the project stores the name and the store holds the bytes
 * under the font entry's id. Deriving it from the file name keeps those two in
 * step without a second field for the user to fill in.
 */

const FONT_FILE_EXTENSION = /\.(woff2?|[ot]tf)$/i;

/**
 * The formats accepted.
 *
 * woff2 alone would be safest and covers anything modern, but the person this
 * feature exists for is holding a desktop licence, and what they have is a ttf
 * or an otf. Refusing those would turn away the case the plan was written for.
 */
export const ALLOWED_FONT_EXTENSIONS = ["woff2", "woff", "ttf", "otf"] as const;

/**
 * Deliberately generous. A Latin woff2 is tens of kilobytes and a CJK otf can
 * be sixteen megabytes, so a tight cap would reject real fonts — and rejecting
 * someone's actual typeface is worse than storing a large one. What this
 * catches is a file that was never a font.
 */
export const MAX_FONT_FILE_BYTES = 32 * 1024 * 1024;

/** What a font with no usable file name is called. */
export const FALLBACK_LOCAL_FONT_FAMILY = "Uploaded font";

/**
 * The key a slot's file is stored under.
 *
 * Compound, because an entry can now hold two files — an uploaded Latin face
 * in front of an uploaded Thai one. The store was keyed by entry id alone,
 * which allowed exactly one.
 *
 * Two colons rather than one: a single colon is already used to pack an id
 * and a family together elsewhere, and a separator that appears in one of the
 * halves stops being a separator.
 */
export function localFontKey(fontId: string, slot: string): string {
  return `${fontId}::${slot}`;
}

/**
 * The key the primary's file was stored under before slots existed.
 *
 * Reads fall back to it so an upload made before this change still renders,
 * and both keys are removed together so neither can outlive the entry that
 * referenced it — an orphaned copy of someone's licensed font is the thing
 * the uploaded-fonts plan exists to prevent.
 */
export function legacyLocalFontKey(fontId: string): string {
  return fontId;
}

/**
 * A CSS family name for an uploaded file.
 *
 * Deliberately literal: "Brand-Bold.woff2" stays "Brand-Bold" rather than
 * being tidied into "Brand". Someone uploading several weights needs them to
 * stay apart, and guessing which part of a file name is the weight is the kind
 * of cleverness that renames the one file it was wrong about.
 */
export function localFontFamilyName(fileName: string): string {
  /* Trimmed before the extension is stripped: the pattern is anchored to the
     end, so a file name with a trailing space kept its ".woff2". */
  const withoutExtension = fileName.trim().replace(FONT_FILE_EXTENSION, "");
  const cleaned = withoutExtension
    /* Quotes and commas would end the family name early wherever this is
       written into CSS, and a stack is comma separated. */
    .replace(/["',;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || FALLBACK_LOCAL_FONT_FAMILY;
}

/**
 * Why a picked file cannot be used, or null when it can.
 *
 * Extension rather than MIME type: browsers disagree about what to report for
 * a font, and an empty string is common for otf and ttf. The name is what the
 * person chose and what they will recognise in the message.
 */
export function rejectFontFile(file: {
  name: string;
  size: number;
}): string | null {
  const extension = file.name.trim().split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_FONT_EXTENSIONS as readonly string[]).includes(extension)) {
    return `${file.name} is not a font file. Choose a ${ALLOWED_FONT_EXTENSIONS.join(", ")} file.`;
  }
  if (file.size <= 0) {
    return `${file.name} is empty.`;
  }
  if (file.size > MAX_FONT_FILE_BYTES) {
    const megabytes = Math.round(MAX_FONT_FILE_BYTES / 1024 / 1024);
    return `${file.name} is larger than ${megabytes}MB. That is bigger than any font needs to be, so this is probably not one.`;
  }
  return null;
}

/**
 * Register a font file with the document so CSS can name it.
 *
 * Thin on purpose: everything here is browser API, and the decisions that are
 * worth testing were made by the time it is called. Resolves false rather than
 * throwing when the file will not parse, since a font that fails to load is a
 * fallback, not a crash.
 */
export async function registerLocalFont(
  family: string,
  data: ArrayBuffer,
): Promise<boolean> {
  if (typeof FontFace === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    const face = new FontFace(family, data);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}
