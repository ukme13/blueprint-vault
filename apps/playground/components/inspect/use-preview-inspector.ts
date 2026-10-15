import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  applyColorToBlocks,
  applyRoleToButtons,
  applyStyleToGroup,
  idsSharingStyle,
  PREVIEW_PAGE_ID,
  isPreviewButton,
  previewInspectKind,
  previewInspectTitle,
  previewIsOverridden,
  previewSection,
  previewSectionFillWithToken,
  previewStyleKey,
  previewStyleOf,
  seedPreviewLanding,
  seedPreviewShell,
  type LayoutBindings,
  type PreviewDocumentBlock,
  type PreviewSection,
  type PreviewStyles,
  type SemanticToken,
  type TypeSystem,
  type useWorkspaceStore,
} from "@blueprint/ui";
import type { PreviewInspectPanelProps } from "./PreviewInspectPanel";
import { usePreviewEdits, type InspectTarget } from "./use-preview-edits";
import type { usePreviewScales } from "../preview/use-preview-scales";

const EMPTY_STYLES: PreviewStyles = {};

/**
 * What the page keeps of the selection: what is picked, whether the panel is
 * showing, and the props the panel is given.
 *
 * Escape lets go of the selection, unless something over the page has it open:
 * a list closes on Escape before the selection does. Every write goes through
 * `usePreviewEdits`; this hook says what the panel shows of the project and
 * which edit each of its controls makes.
 */
export function usePreviewInspector({
  update,
  system,
  previewLanding,
  previewShell,
  previewStyles = EMPTY_STYLES,
  sections,
  tokens,
  scales,
  setLayoutBindings,
}: {
  update: ReturnType<typeof useWorkspaceStore>["update"];
  system: TypeSystem;
  previewLanding: PreviewDocumentBlock[];
  previewShell: PreviewDocumentBlock[];
  previewStyles?: PreviewStyles;
  sections: readonly PreviewSection[];
  tokens: SemanticToken[];
  scales: ReturnType<typeof usePreviewScales>;
  setLayoutBindings: Dispatch<SetStateAction<LayoutBindings>>;
}) {
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
  /* The panel beside the page: opened by a selection, hidden by its own
     button. A way of looking, so not saved. */
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const inspectedBlock = ((): PreviewDocumentBlock | null => {
    if (!inspecting || inspecting.source === "section") return null;
    const list = inspecting.source === "shell" ? previewShell : previewLanding;
    return list.find((block) => block.id === inspecting.id) ?? null;
  })();

  const inspectedSection =
    inspecting?.source === "section"
      ? (previewSection(sections, inspecting.id) ?? null)
      : null;

  useEffect(() => {
    if (!inspecting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        document.querySelector('dialog[open], :popover-open [role="listbox"]')
      ) {
        return;
      }
      setInspecting(null);
      /* The press that picked it left it focused, and a key press makes the
         browser draw its ring: let go of the focus with the selection. */
      (document.activeElement as HTMLElement | null)?.blur();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inspecting]);

  const slotSource =
    inspecting && inspecting.source !== "section" ? inspecting.source : null;

  const defaultBlock = useMemo(() => {
    if (!inspecting || inspecting.source === "section") return null;
    const seed =
      inspecting.source === "landing"
        ? seedPreviewLanding(system)
        : seedPreviewShell(system);
    return seed.find((block) => block.id === inspecting.id) ?? null;
  }, [inspecting, system]);

  const {
    patchSlot,
    patchDocument,
    patchSectionFill,
    patchStyle,
    resetSlotToDefault,
    resetSectionToDefault,
    resetAllToDefault,
  } = usePreviewEdits({
    update,
    system,
    inspecting,
    slotSource,
    defaultBlock,
    setInspecting,
    setLayoutBindings,
  });

  const inspectedId = inspecting?.id ?? null;
  const isBandSelected = inspecting?.source === "section";
  /* A band and a slot can share an id, so a band's style has a key of its own. */
  const styleKey = inspectedId
    ? previewStyleKey(inspectedId, isBandSelected)
    : PREVIEW_PAGE_ID;

  const panelProps: PreviewInspectPanelProps = {
    target: inspecting
      ? {
          id: inspecting.id,
          kind: previewInspectKind(inspecting.id, isBandSelected),
          title: previewInspectTitle(inspecting.id, isBandSelected),
        }
      : null,
    style: styleKey ? previewStyleOf(previewStyles, styleKey) : {},
    block: inspectedBlock,
    bandFill: inspectedSection?.fill ?? null,
    spacing: scales.spacingTokens,
    radius: scales.radiusTokens,
    elevation: scales.elevationLevels,
    tokens,
    tokenColors: scales.tokenColors,
    roleGroups: scales.roleGroups,
    isGrouped: inspectedId ? idsSharingStyle(inspectedId).length > 1 : false,
    isButton: inspectedId ? isPreviewButton(inspectedId) : false,
    isOverridden: previewIsOverridden({
      styles: previewStyles,
      styleKey,
      block: inspectedBlock,
      defaultBlock,
      section: inspectedSection,
    }),
    onStyleChange: (next) => {
      if (styleKey) patchStyle(styleKey, next);
    },
    onTextChange: (text) => patchSlot((block) => ({ ...block, text })),
    onRoleChange: (roleId) => patchSlot((block) => ({ ...block, roleId })),
    onColourChange: (colorTokenId) => {
      if (!slotSource || !inspecting || inspecting.source === "section") return;
      patchDocument(slotSource, (document) =>
        applyColorToBlocks(document, [inspecting.id], colorTokenId),
      );
    },
    onBandFillChange: (tokenId) => {
      if (inspecting?.source !== "section") return;
      const current = previewSection(sections, inspecting.id)?.fill;
      if (!current) return;
      patchSectionFill(
        inspecting.id,
        previewSectionFillWithToken(current, tokenId),
      );
    },
    onApplyToGroup: () => {
      if (!slotSource || !inspecting || inspecting.source === "section") return;
      patchDocument(slotSource, (document) =>
        applyStyleToGroup(document, inspecting.id),
      );
    },
    onApplyToAllButtons: () => {
      const roleId = inspectedBlock?.roleId;
      if (!roleId) return;
      /* The shell's sign-up and the landing buttons live in two documents;
         both take the role. */
      patchDocument("landing", (document) =>
        applyRoleToButtons(document, roleId),
      );
      patchDocument("shell", (document) =>
        applyRoleToButtons(document, roleId),
      );
    },
    /* With nothing selected it is the page's colour that is put back. */
    onResetToDefault: !inspecting
      ? () => patchStyle(PREVIEW_PAGE_ID, {})
      : inspecting.source === "section"
        ? resetSectionToDefault
        : resetSlotToDefault,
    onClose: () => {
      setIsInspectorOpen(false);
      setInspecting(null);
    },
  };

  /**
   * A press on the page picks what was pressed, and shows the panel; a press on
   * what is already picked lets go of it, as a second press on a switch does.
   */
  const select = useCallback(
    (target: InspectTarget) => {
      if (inspecting?.source === target.source && inspecting.id === target.id) {
        setInspecting(null);
        return;
      }
      setInspecting(target);
      setIsInspectorOpen(true);
    },
    [inspecting],
  );

  const clearSelection = useCallback(() => setInspecting(null), []);

  return {
    inspecting,
    isInspectorOpen,
    setIsInspectorOpen,
    panelProps,
    select,
    clearSelection,
    patchSectionFill,
    resetAllToDefault,
  };
}
