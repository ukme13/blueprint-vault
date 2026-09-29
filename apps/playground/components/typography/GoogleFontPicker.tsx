"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, FileUp, Info, Search, X } from "lucide-react";
import {
  ALLOWED_FONT_EXTENSIONS,
  searchGoogleFonts,
  type GoogleFont,
} from "@blueprint/ui";
import list from "../sheet-selector.module.css";
import styles from "./typography-workspace.module.css";

/** Said once, on the pinned row, rather than in a note under every slot. */
const UPLOAD_FORMATS = ALLOWED_FONT_EXTENSIONS.join(", ");

/** Enough that 1946 families do not read as a shortlist; search finds the rest. */
const LIST_LIMIT = 60;

interface GoogleFontPickerProps {
  /** The slot, e.g. "Base font"; the search field's accessible name. */
  label: string;
  /** A standing note about the family, shown above the search. */
  labelTooltip?: string;
  /** Family currently in this slot; marked with a check in the list. */
  family: string;
  /** Restrict to families covering this writing system, e.g. "thai". */
  script?: string;
  onPick: (font: GoogleFont) => void;
  /**
   * Wording for the pinned upload row, already carrying this slot's state —
   * "Upload font", "Replace font". Omitted, no row is pinned.
   */
  uploadLabel?: string;
  /** Opens the file dialog for this slot. */
  onUpload?: () => void;
}

/**
 * Pick one family from the Google Fonts catalogue, or upload a file instead.
 *
 * Built for a panel that is already open: the list shows at once, under a
 * search field that takes focus, so a chip's click is the only click before
 * a family. The field's ✕ clears the query and nothing else; a slot is taken
 * out by its chip, never by emptying a search.
 *
 * The upload row is pinned between the two because the moment a search
 * matches nothing is the moment someone learns their font is not on Google,
 * so no query can filter it away.
 */
export function GoogleFontPicker({
  label,
  labelTooltip,
  family,
  script,
  onPick,
  uploadLabel,
  onUpload,
}: GoogleFontPickerProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const fonts = useMemo(
    () => searchGoogleFonts(query, { script, limit: LIST_LIMIT }),
    [query, script],
  );

  /* On the next frame: the popover places focus on itself as it opens, and
     the field has to be the one that keeps it. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  /* The highlighted row follows the keyboard into view. */
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const search = (next: string) => {
    setQuery(next);
    setActive(0);
  };

  return (
    /* The standard selector popover, as SelectorOptionList draws it: a
       borderless search over a line the width of the panel, then the list
       running to the edges below it. */
    <section className={`${styles.fontPicker} flex flex-col`}>
      {labelTooltip ? (
        <p
          className={`${styles.fontPickerNote} border-b border-border-subtle px-4 py-3`}
        >
          <Info aria-hidden className={styles.fontStackNoteIcon} />
          {labelTooltip}
        </p>
      ) : null}
      <label className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <Search aria-hidden className="size-4 shrink-0 text-fg-muted" />
        <input
          ref={inputRef}
          aria-activedescendant={
            fonts.length > 0 ? `${listId}-${active}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded
          aria-label={label}
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-fg-primary outline-none placeholder:text-fg-muted"
          placeholder="Search fonts..."
          role="combobox"
          spellCheck={false}
          type="text"
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, fonts.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && fonts[active]) {
              event.preventDefault();
              onPick(fonts[active]);
            }
          }}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className={styles.fontPickerClear}
            type="button"
            onClick={() => {
              search("");
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden />
          </button>
        ) : null}
      </label>

      <div className={list.list} data-density="compact">
        {/* Pinned at the top of the list: no search filters it away. */}
        {uploadLabel ? (
          <button
            className={`${list.option} ${styles.fontPickerUpload}`}
            type="button"
            onClick={onUpload}
          >
            <FileUp aria-hidden className={styles.fontUploadRowIcon} />
            <span className={list.optionLabel}>
              {uploadLabel}{" "}
              <span className={styles.fontUploadRowFormats}>
                {UPLOAD_FORMATS}
              </span>
            </span>
          </button>
        ) : null}
        <ul
          ref={listRef}
          aria-label={`Google Fonts for ${label}`}
          className={styles.fontPickerList}
          id={listId}
          role="listbox"
        >
          {fonts.map((font, index) => {
            const isSelected = font.family === family;
            return (
              /* A row, not a tab stop: the field keeps focus and its arrow
                 keys move the highlight, so mousedown must not steal it. */
              <li
                key={font.family}
                aria-selected={isSelected}
                className={list.option}
                data-active={index === active || undefined}
                data-index={index}
                id={`${listId}-${index}`}
                role="option"
                onClick={() => onPick(font)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
              >
                <span className={list.optionLabel}>{font.family}</span>
                {isSelected ? (
                  <Check aria-hidden className={list.check} />
                ) : null}
              </li>
            );
          })}
        </ul>
        {fonts.length === 0 ? (
          <p className={list.empty}>No Google font matches.</p>
        ) : null}
      </div>
    </section>
  );
}
