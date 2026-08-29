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

/** What a font with no usable file name is called. */
export const FALLBACK_LOCAL_FONT_FAMILY = "Uploaded font";

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
