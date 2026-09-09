"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  Popover,
  type PopoverTriggerRenderProps,
} from "@astryxdesign/core/Popover";
import {
  bindPreset,
  detachValue,
  filterPresets,
  findPreset,
  formatBoundValue,
  formatRawInput,
  moveHighlight,
  nudgeValue,
  parseRawNumber,
  type HybridTokenPreset,
  type HybridTokenizedValue,
} from "./hybrid-tokenized-input";
import { HybridTokenizedPresetList } from "./HybridTokenizedPresetList";
import { ChevronDownIcon, VariableHexagonIcon } from "./hybrid-tokenized-icons";

export interface HybridTokenizedInputProps {
  label: string;
  icon?: ReactNode;
  value: HybridTokenizedValue;
  presets: readonly HybridTokenPreset[];
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  valueSuffix?: string;
  popoverTitle?: string;
  searchPlaceholder?: string;
  isLabelHidden?: boolean;
  onChange: (next: HybridTokenizedValue) => void;
}

const FIELD_CLASS =
  "flex h-[var(--size-element-md)] w-full cursor-text items-center gap-[var(--spacing-2)] rounded-[var(--radius-element)] border border-border-default bg-surface-subtle px-[var(--spacing-2)] transition-colors hover:border-border-strong focus-within:border-fg-accent focus-within:ring-1 focus-within:ring-fg-accent";

const CHIP_CLASS =
  "inline-flex h-6 max-w-full min-w-0 items-center gap-[var(--spacing-1)] rounded-[var(--radius-inner)] border border-border-default bg-surface-raised px-[var(--spacing-2)] font-mono text-xs text-fg-primary hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

export function HybridTokenizedInput({
  label,
  icon,
  value,
  presets,
  min,
  max,
  step = 1,
  decimals = 3,
  valueSuffix = "",
  popoverTitle = "Presets",
  searchPlaceholder = "Search presets...",
  isLabelHidden = false,
  onChange,
}: HybridTokenizedInputProps) {
  const labelId = useId();
  const controlId = useId();
  const listId = useId();
  const rawRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<HTMLInputElement>(null);
  const revertRef = useRef<HybridTokenizedValue | null>(null);
  const skipBlurRef = useRef(false);
  const pendingFocusRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const filtered = useMemo(
    () => filterPresets(presets, query),
    [presets, query],
  );
  const bound = findPreset(presets, value);

  useEffect(() => {
    if (!value.isPreset && pendingFocusRef.current) {
      pendingFocusRef.current = false;
      const node = rawRef.current;
      if (!node) return;
      node.focus();
      const at = node.value.length;
      node.setSelectionRange(at, at);
    }
  }, [value.isPreset]);

  useEffect(() => {
    if (!open || highlight < 0) return;
    document
      .getElementById(`${listId}-${highlight}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight, listId, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setQuery("");
    if (!nextOpen) return;
    const selected = value.presetId
      ? presets.findIndex((preset) => preset.id === value.presetId)
      : 0;
    setHighlight(selected >= 0 ? selected : 0);
  };

  const beginRaw = (text: string) => {
    revertRef.current = value;
    pendingFocusRef.current = true;
    setDraft(text);
    handleOpenChange(false);
    onChange(detachValue(value.value));
  };

  const selectPreset = (preset: HybridTokenPreset) => {
    revertRef.current = null;
    handleOpenChange(false);
    onChange(bindPreset(preset));
  };

  const onRawKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      rawRef.current?.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      skipBlurRef.current = true;
      const revert = revertRef.current;
      revertRef.current = null;
      setDraft(null);
      if (revert?.isPreset) onChange(revert);
      rawRef.current?.blur();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const next = nudgeValue(
      value.value,
      event.key === "ArrowUp" ? 1 : -1,
      step,
      min,
      max,
      decimals,
    );
    revertRef.current = null;
    setDraft(formatRawInput(next, decimals));
    onChange({ isPreset: false, value: next });
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) =>
        moveHighlight(
          current,
          event.key === "ArrowDown" ? 1 : -1,
          filtered.length,
        ),
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const preset = filtered[highlight];
      if (preset) selectPreset(preset);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleOpenChange(false);
    }
  };

  const panel = (
    <HybridTokenizedPresetList
      decimals={decimals}
      filtered={filtered}
      highlight={highlight}
      listId={listId}
      popoverTitle={popoverTitle}
      query={query}
      searchPlaceholder={searchPlaceholder}
      value={value}
      valueSuffix={valueSuffix}
      onHighlight={setHighlight}
      onQueryChange={(next) => {
        setQuery(next);
        setHighlight(0);
      }}
      onSearchKeyDown={onSearchKeyDown}
      onSelect={selectPreset}
    />
  );

  return (
    <div
      className={
        isLabelHidden
          ? "flex min-w-0 w-full flex-col"
          : "flex min-w-0 w-full flex-col gap-1"
      }
    >
      <label
        className={isLabelHidden ? "sr-only" : "text-sm text-fg-primary"}
        htmlFor={controlId}
        id={labelId}
      >
        {label}
      </label>
      <Popover
        alignment="center"
        content={panel}
        hasAutoFocus={false}
        isOpen={open}
        label={popoverTitle}
        placement="below"
        role="none"
        style={{ padding: "var(--spacing-2)" }}
        onOpenChange={handleOpenChange}
      >
        {(trigger: PopoverTriggerRenderProps) => (
          <div
            className={FIELD_CLASS}
            ref={trigger.ref}
            onClick={(event) => {
              if (!value.isPreset) return;
              if ((event.target as HTMLElement).closest("[data-hybrid-chip]")) {
                return;
              }
              caretRef.current?.focus();
            }}
            onDoubleClick={(event) => {
              if (!value.isPreset) return;
              event.preventDefault();
              beginRaw(formatRawInput(value.value, decimals));
            }}
          >
            {icon ? (
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center text-fg-muted"
              >
                {icon}
              </span>
            ) : null}
            {value.isPreset ? (
              <>
                <button
                  aria-controls={trigger["aria-controls"]}
                  aria-expanded={trigger["aria-expanded"]}
                  aria-haspopup="listbox"
                  className={CHIP_CLASS}
                  data-hybrid-chip=""
                  id={controlId}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    trigger.onClick();
                    queueMicrotask(() => caretRef.current?.focus());
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    beginRaw(formatRawInput(value.value, decimals));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      caretRef.current?.focus();
                    }
                  }}
                >
                  <span className="font-medium text-fg-accent">
                    {formatBoundValue(value.value, decimals)}
                  </span>
                  {bound ? (
                    <span className="truncate text-xs text-fg-muted">
                      ({bound.name})
                    </span>
                  ) : null}
                  <ChevronDownIcon />
                </button>
                <input
                  aria-label="Custom number"
                  className="m-0 w-[1ch] flex-none appearance-none border-0 bg-transparent p-0 font-mono text-xs text-fg-primary outline-none"
                  ref={caretRef}
                  value=""
                  onChange={(event) => beginRaw(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" || event.key === "Delete") {
                      event.preventDefault();
                      beginRaw(formatRawInput(value.value, decimals));
                    }
                  }}
                />
              </>
            ) : (
              <>
                <input
                  className="m-0 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 font-mono text-xs text-fg-primary outline-none"
                  id={controlId}
                  inputMode="decimal"
                  max={max}
                  min={min}
                  ref={rawRef}
                  step={step}
                  type="text"
                  value={draft ?? formatRawInput(value.value, decimals)}
                  onBlur={() => {
                    if (skipBlurRef.current) {
                      skipBlurRef.current = false;
                      return;
                    }
                    onChange({
                      isPreset: false,
                      value: parseRawNumber(draft ?? "", value.value, {
                        min,
                        max,
                        decimals,
                      }),
                    });
                    setDraft(null);
                  }}
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => {
                    setDraft(
                      (current) =>
                        current ?? formatRawInput(value.value, decimals),
                    );
                    requestAnimationFrame(() => {
                      const node = rawRef.current;
                      if (!node) return;
                      const at = node.value.length;
                      node.setSelectionRange(at, at);
                    });
                  }}
                  onKeyDown={onRawKeyDown}
                />
                <span data-hybrid-apply="">
                  <IconButton
                    icon={<VariableHexagonIcon />}
                    label="Apply preset"
                    size="sm"
                    tooltip="Apply preset"
                    variant="ghost"
                    onClick={trigger.onClick}
                  />
                </span>
              </>
            )}
          </div>
        )}
      </Popover>
    </div>
  );
}
