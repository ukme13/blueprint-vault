"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  clearPreviewStyle,
  PREVIEW_SECTION_LABEL,
  previewInspectKind,
  previewStyleKey,
  previewInspectorChrome,
  previewStyleOf,
  resolveElevation,
  resolveRadius,
  resolveSpacing,
  setPreviewStyle,
  typeRoleRowGroups,
  type PreviewSlotStyle,
  type PreviewStyles,
  applyColorToBlocks,
  applyRoleToBlocks,
  applyRoleToButtons,
  applyStyleToGroup,
  defaultElevationScale,
  defaultLayoutTokens,
  setLayoutReference,
  withLayoutTokens,
  defaultPreviewDevices,
  defaultRadiusScale,
  defaultSpacingScale,
  elevationCssVariables,
  generatePalettes,
  bindLayoutSlot,
  layoutBindingVariables,
  layoutCssVariablesForDevice,
  type LayoutBindings,
  previewSection,
  radiusCssVariables,
  resolvePreviewDevice,
  resolveSemanticColorMap,
  seedPreviewLanding,
  seedPreviewSections,
  seedPreviewShell,
  seedTypographyProject,
  semanticCssVariables,
  spacingCssVariables,
  typeCssVariablesForDevice,
  updateBlockText,
  updateSectionFill,
  withSeededTypographySlice,
  seedWorkspaceProject,
  PREVIEW_SECTION_SEED_TOKEN,
  idsSharingStyle,
  isPreviewButton,
  type PreviewDocumentBlock,
  type PreviewDocument,
  type PreviewSectionFill,
  type PreviewSectionId,
  useWorkspaceStore,
} from "@blueprint/ui";
import { useIsPhone } from "../use-is-phone";
import { useThemeMode } from "../../app/theme-provider";
import {
  PreviewInspectPanel,
  type PreviewInspectPanelProps,
} from "../inspect/PreviewInspectPanel";
import { PreviewSelectionBox } from "../inspect/PreviewSelectionBox";
import { Sheet } from "../Sheet";
import {
  previewImageErrorCopy,
  type PreviewImageError,
} from "../PreviewSectionMenu";
import { PreviewStylesProvider } from "./preview-styles-context";
import { PreviewChrome } from "../PreviewChrome";
import { usePaletteView } from "../palette/PaletteViewContext";
import { useGoogleFontsLink } from "../typography/use-google-fonts";
import { useLocalFonts } from "../typography/use-local-fonts";
import { PreviewSite } from "./PreviewSite";
import { SpacingOverlay } from "../spacing-overlay/SpacingOverlay";

const EMPTY_TOKENS: never[] = [];
const EMPTY_PALETTES: never[] = [];
const EMPTY_STYLES: PreviewStyles = {};

type InspectTarget =
  | { source: "landing"; id: string }
  | { source: "shell"; id: string }
  | { source: "section"; id: PreviewSectionId };

/**
 * The whole system on one page, as a landing site.
 *
 * Every colour here comes from a semantic token and nothing else. Type and
 * layout come from the same names the handover file emits. Click a slot to
 * change copy, role, or token colour; the ⋯ on a band sets fill. The scale
 * is not edited here. The article judged in Typography stays on
 * `previewDocument`.
 *
 * See docs/roadmap/semantic-tokens.md.
 */

export function SystemPreview() {
  const { seen } = usePaletteView();
  const { project, hasLoaded, update, library } = useWorkspaceStore();
  const { resolved: mode } = useThemeMode();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [deviceId, setDeviceId] = useState("desktop");
  /* The spacing overlay: a way of looking, so not saved and not undone. */
  const [showSpacing, setShowSpacing] = useState(false);
  /* Which use each space on the page reads, where it is not its own. Like
     the overlay it belongs to, a way of looking: not saved, not undone, and
     the Uses table is not touched by it. */
  const [layoutBindings, setLayoutBindings] = useState<LayoutBindings>({});
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
  /* The panel beside the page: opened by a selection, hidden by its own
     button. A way of looking, so not saved. */
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [sectionError, setSectionError] = useState<PreviewImageError | null>(
    null,
  );

  const tokens = project?.semantics ?? EMPTY_TOKENS;
  const typography =
    project?.typography ?? seedTypographyProject(project?.name ?? "Workspace");
  const system = typography.system;
  const sections = typography.previewSections ?? seedPreviewSections();
  const devices =
    project?.previewDevices ?? defaultPreviewDevices(system.ratio);
  /* A phone previews as a phone. The device bar is hidden there, so the
     choice made on a wider screen is kept for when it is wide again. */
  const isPhone = useIsPhone();
  const frame = resolvePreviewDevice(isPhone ? "phone" : deviceId, devices);

  useGoogleFontsLink(system, undefined, 400);
  useLocalFonts(system);

  const palettes = useMemo(
    () =>
      project?.palette ? generatePalettes(project.palette) : EMPTY_PALETTES,
    [project],
  );

  const tokenColors = useMemo(
    () => resolveSemanticColorMap(tokens, mode, palettes, seen),
    [tokens, mode, palettes, seen],
  );

  const variables = useMemo((): CSSProperties => {
    return {
      ...semanticCssVariables(tokens, mode, palettes, seen),
      ...spacingCssVariables(project?.spacing ?? defaultSpacingScale()),
      ...radiusCssVariables(project?.radius ?? defaultRadiusScale()),
      ...elevationCssVariables(
        project?.elevation ?? defaultElevationScale(),
        palettes,
        mode,
      ),
      ...layoutCssVariablesForDevice(
        project?.layout ?? defaultLayoutTokens(),
        frame.id,
      ),
      ...layoutBindingVariables(
        project?.layout ?? defaultLayoutTokens(),
        layoutBindings,
        frame.id,
      ),
      ...typeCssVariablesForDevice(
        system,
        frame,
        typography.unit,
        typography.remRootPx,
        devices,
      ),
    } as CSSProperties;
  }, [
    tokens,
    mode,
    seen,
    palettes,
    project?.spacing,
    project?.radius,
    project?.elevation,
    project?.layout,
    layoutBindings,
    frame,
    system,
    typography.unit,
    typography.remRootPx,
    devices,
  ]);

  const inspectedBlock = ((): PreviewDocumentBlock | null => {
    if (!inspecting || inspecting.source === "section") return null;
    const list =
      inspecting.source === "shell"
        ? typography.previewShell
        : typography.previewLanding;
    return list.find((block) => block.id === inspecting.id) ?? null;
  })();

  const inspectedSection =
    inspecting?.source === "section"
      ? (previewSection(sections, inspecting.id) ?? null)
      : null;

  const patchSlot = useCallback(
    (apply: (block: PreviewDocumentBlock) => PreviewDocumentBlock) => {
      if (!inspecting || inspecting.source === "section") return;
      update((current) => {
        if (!current) return seedWorkspaceProject("Workspace");
        const next = current.typography
          ? current
          : withSeededTypographySlice(current);
        const slice = next.typography;
        if (!slice) return next;
        const key =
          inspecting.source === "shell" ? "previewShell" : "previewLanding";
        const document = slice[key];
        const currentBlock = document.find(
          (block) => block.id === inspecting.id,
        );
        if (!currentBlock) return next;
        const patched = apply(currentBlock);
        const withText = updateBlockText(document, inspecting.id, patched.text);
        const withRole = applyRoleToBlocks(
          withText,
          [inspecting.id],
          patched.roleId,
        );
        return {
          ...next,
          typography: { ...slice, [key]: withRole },
        };
      });
    },
    [inspecting, update],
  );

  const patchDocument = useCallback(
    (
      source: "landing" | "shell",
      apply: (document: PreviewDocument) => PreviewDocument,
    ) => {
      update((current) => {
        if (!current) return seedWorkspaceProject("Workspace");
        const next = current.typography
          ? current
          : withSeededTypographySlice(current);
        const slice = next.typography;
        if (!slice) return next;
        const key = source === "shell" ? "previewShell" : "previewLanding";
        return {
          ...next,
          typography: { ...slice, [key]: apply(slice[key]) },
        };
      });
    },
    [update],
  );

  const patchSectionFill = useCallback(
    (id: PreviewSectionId, fill: PreviewSectionFill) => {
      update((current) => {
        if (!current) return seedWorkspaceProject("Workspace");
        const next = current.typography
          ? current
          : withSeededTypographySlice(current);
        const slice = next.typography;
        if (!slice) return next;
        return {
          ...next,
          typography: {
            ...slice,
            previewSections: updateSectionFill(
              slice.previewSections ?? seedPreviewSections(),
              id,
              fill,
            ),
          },
        };
      });
    },
    [update],
  );

  const onDeviceChange = useCallback((id: string) => {
    /* Close the inspector first: its <dialog> is on the top layer, and the
       canvas remounts when the overflow ancestor changes. Unmounting that
       node while it is still open throws removeChild on null. The timeout
       lets Dialog's close() effect run; an rAF can fire before that effect. */
    setInspecting(null);
    setSectionError(null);
    window.setTimeout(() => setDeviceId(id), 0);
  }, []);

  /* Escape lets go of the selection, unless something over the page has it
     open: a list closes on Escape before the selection does. */
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
      setSectionError(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inspecting]);

  const slotSource =
    inspecting && inspecting.source !== "section" ? inspecting.source : null;

  const defaultBlock = useMemo(() => {
    if (!inspecting || inspecting.source === "section") return null;
    if (inspecting.source === "landing") {
      return (
        seedPreviewLanding(system).find((b) => b.id === inspecting.id) ?? null
      );
    }
    if (inspecting.source === "shell") {
      return (
        seedPreviewShell(system).find((b) => b.id === inspecting.id) ?? null
      );
    }
    return null;
  }, [inspecting, system]);

  /* One write for a change to an element's style: an undo takes back the
     change, and goes to this page. A style left empty is dropped, and with it
     the field, so a project with none is as it was. */
  const patchStyle = useCallback(
    (id: string, next: PreviewSlotStyle) => {
      update(
        (current) => {
          if (!current) return seedWorkspaceProject("Workspace");
          const withSlice = current.typography
            ? current
            : withSeededTypographySlice(current);
          const slice = withSlice.typography;
          if (!slice) return withSlice;
          const styles = setPreviewStyle(slice.previewStyles, id, next);
          const { previewStyles: previous, ...rest } = slice;
          void previous;
          return {
            ...withSlice,
            typography:
              Object.keys(styles).length > 0
                ? { ...rest, previewStyles: styles }
                : rest,
          };
        },
        { origin: { path: "/preview" } },
      );
    },
    [update],
  );

  /* Back to what the seed gives: copy, type and colour, and whatever the
     inspector set, in one step. */
  const resetSlotToDefault = useCallback(() => {
    if (
      !slotSource ||
      !inspecting ||
      inspecting.source === "section" ||
      !defaultBlock
    ) {
      return;
    }
    const id = inspecting.id;
    update(
      (current) => {
        if (!current) return seedWorkspaceProject("Workspace");
        const withSlice = current.typography
          ? current
          : withSeededTypographySlice(current);
        const slice = withSlice.typography;
        if (!slice) return withSlice;
        const key = slotSource === "shell" ? "previewShell" : "previewLanding";
        const withText = updateBlockText(slice[key], id, defaultBlock.text);
        const withRole = applyRoleToBlocks(withText, [id], defaultBlock.roleId);
        const styles = clearPreviewStyle(
          slice.previewStyles,
          previewStyleKey(id),
        );
        const { previewStyles: previous, ...rest } = slice;
        void previous;
        return {
          ...withSlice,
          typography: {
            ...rest,
            [key]: applyColorToBlocks(withRole, [id], undefined),
            ...(Object.keys(styles).length > 0
              ? { previewStyles: styles }
              : {}),
          },
        };
      },
      { origin: { path: "/preview" } },
    );
  }, [defaultBlock, inspecting, slotSource, update]);

  const resetSectionToDefault = useCallback(() => {
    if (!inspecting || inspecting.source !== "section") return;
    const id = inspecting.id;
    const defaultTokenId = PREVIEW_SECTION_SEED_TOKEN[id];
    update(
      (current) => {
        if (!current) return seedWorkspaceProject("Workspace");
        const withSlice = current.typography
          ? current
          : withSeededTypographySlice(current);
        const slice = withSlice.typography;
        if (!slice) return withSlice;
        const styles = clearPreviewStyle(
          slice.previewStyles,
          previewStyleKey(id, true),
        );
        const { previewStyles: previous, ...rest } = slice;
        void previous;
        return {
          ...withSlice,
          typography: {
            ...rest,
            previewSections: updateSectionFill(
              slice.previewSections ?? seedPreviewSections(),
              id,
              { kind: "token", tokenId: defaultTokenId },
            ),
            ...(Object.keys(styles).length > 0
              ? { previewStyles: styles }
              : {}),
          },
        };
      },
      { origin: { path: "/preview" } },
    );
  }, [inspecting, update]);

  const resetAllToDefault = useCallback(() => {
    setLayoutBindings({});
    setInspecting(null);
    setSectionError(null);
    update((current) => {
      if (!current) return seedWorkspaceProject("Workspace");
      const next = current.typography
        ? current
        : withSeededTypographySlice(current);
      const slice = next.typography;
      if (!slice) return next;
      const { previewStyles: previous, ...rest } = slice;
      void previous;
      return {
        ...next,
        typography: {
          ...rest,
          previewLanding: seedPreviewLanding(system),
          previewShell: seedPreviewShell(system),
          previewSections: seedPreviewSections(),
        },
      };
    });
  }, [system, update]);

  /* What the panel's token lists are drawn from: the project's own scales. */
  const spacingTokens = useMemo(
    () => resolveSpacing(project?.spacing ?? defaultSpacingScale()),
    [project?.spacing],
  );
  const radiusTokens = useMemo(
    () => resolveRadius(project?.radius ?? defaultRadiusScale()),
    [project?.radius],
  );
  const elevationLevels = useMemo(
    () =>
      resolveElevation(
        project?.elevation ?? defaultElevationScale(),
        palettes,
        mode,
      ),
    [project?.elevation, palettes, mode],
  );
  const roleGroups = useMemo(
    () => typeRoleRowGroups(system, frame.id),
    [system, frame.id],
  );

  if (!hasLoaded) {
    return <div aria-busy="true" className="h-full min-h-0" />;
  }

  if (tokens.length === 0) {
    return (
      <div
        className="mx-auto max-w-2xl"
        style={{
          paddingInline: "var(--spacing-6)",
          paddingBlock: "var(--spacing-16)",
        }}
      >
        <h1 className="text-xl font-semibold">Nothing to preview yet</h1>
        <p
          className="text-sm"
          style={{
            color: "var(--color-fg-secondary)",
            marginTop: "var(--spacing-2)",
          }}
        >
          This page is drawn entirely from the semantic layer. Build a palette,
          then open the Semantics tab to see it here.
        </p>
      </div>
    );
  }

  const previewStyles = typography.previewStyles ?? EMPTY_STYLES;
  const inspectedId = inspecting?.id ?? null;
  const isBandSelected = inspecting?.source === "section";
  /* A band and a slot can share an id, so a band's style has a key of its own. */
  const styleKey = inspectedId
    ? previewStyleKey(inspectedId, isBandSelected)
    : null;
  const panelProps: PreviewInspectPanelProps = {
    target: inspecting
      ? {
          id: inspecting.id,
          kind: previewInspectKind(inspecting.id, isBandSelected),
          ...(inspecting.source === "section"
            ? { title: PREVIEW_SECTION_LABEL[inspecting.id], subtitle: "" }
            : previewInspectorChrome(inspecting.id)),
        }
      : null,
    style: styleKey ? previewStyleOf(previewStyles, styleKey) : {},
    block: inspectedBlock,
    bandFill: inspectedSection?.fill ?? null,
    bandError: sectionError ? previewImageErrorCopy(sectionError) : null,
    spacing: spacingTokens,
    radius: radiusTokens,
    elevation: elevationLevels,
    tokens,
    tokenColors,
    roleGroups,
    isGrouped: inspectedId ? idsSharingStyle(inspectedId).length > 1 : false,
    isButton: inspectedId ? isPreviewButton(inspectedId) : false,
    isOverridden:
      (styleKey !== null && styleKey in previewStyles) ||
      (defaultBlock
        ? inspectedBlock?.text !== defaultBlock.text ||
          inspectedBlock?.roleId !== defaultBlock.roleId ||
          inspectedBlock?.colorTokenId !== defaultBlock.colorTokenId
        : Boolean(inspectedBlock?.colorTokenId)) ||
      (inspecting?.source === "section" &&
        (inspectedSection?.fill.kind === "image" ||
          inspectedSection?.fill.tokenId !==
            PREVIEW_SECTION_SEED_TOKEN[inspecting.id])),
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
      patchSectionFill(
        inspecting.id,
        current?.kind === "image"
          ? { ...current, fallbackTokenId: tokenId }
          : { kind: "token", tokenId },
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
    onResetToDefault:
      inspecting?.source === "section"
        ? resetSectionToDefault
        : resetSlotToDefault,
    onClose: () => {
      setIsInspectorOpen(false);
      setInspecting(null);
      setSectionError(null);
    },
  };

  return (
    <PreviewChrome
      canvas={
        <PreviewStylesProvider styles={previewStyles} tokens={tokens}>
          <PreviewSite
            key={frame.kind === "desktop" ? "desktop" : "framed"}
            canvasRef={canvasRef}
            frameId={frame.id}
            landing={typography.previewLanding}
            ready={tokens.length > 0}
            sections={sections}
            shell={typography.previewShell}
            system={system}
            variables={variables}
            workspaceId={library.currentId}
            onInspectLanding={(id) => {
              setSectionError(null);
              setInspecting({ source: "landing", id });
              setIsInspectorOpen(true);
            }}
            onInspectSection={(id) => {
              setSectionError(null);
              setInspecting({ source: "section", id });
              setIsInspectorOpen(true);
            }}
            onInspectShell={(id) => {
              setSectionError(null);
              setInspecting({ source: "shell", id });
              setIsInspectorOpen(true);
            }}
            onSectionError={(id, error) => {
              setSectionError(error);
              setInspecting({ source: "section", id });
              setIsInspectorOpen(true);
            }}
            onSectionFill={patchSectionFill}
          >
            {showSpacing ? (
              <SpacingOverlay
                deviceId={frame.id}
                deviceName={frame.name}
                bindings={layoutBindings}
                layout={project?.layout ?? defaultLayoutTokens()}
                spacing={project?.spacing ?? defaultSpacingScale()}
                onBindSlot={(slot, tokenId) =>
                  setLayoutBindings((current) =>
                    bindLayoutSlot(current, slot, tokenId),
                  )
                }
                onRebindStep={(tokenId, step) =>
                  update(
                    (current) =>
                      withLayoutTokens(
                        current,
                        setLayoutReference(
                          current?.layout ?? defaultLayoutTokens(),
                          tokenId,
                          frame.id,
                          step,
                        ),
                      ),
                    /* Made on this page, whatever it changed: an undo returns here. */
                    { origin: { path: "/preview" } },
                  )
                }
              />
            ) : null}
            {inspecting ? (
              <PreviewSelectionBox
                canvasRef={canvasRef}
                id={inspecting.id}
                isBand={inspecting.source === "section"}
              />
            ) : null}
          </PreviewSite>
        </PreviewStylesProvider>
      }
      device={frame}
      devices={devices}
      inspector={isPhone ? undefined : <PreviewInspectPanel {...panelProps} />}
      isInspectorOpen={isInspectorOpen}
      onInspectorOpenChange={setIsInspectorOpen}
      mode={mode}
      onDeviceChange={onDeviceChange}
      showSpacing={showSpacing}
      onResetToDefault={resetAllToDefault}
      onShowSpacingChange={setShowSpacing}
    >
      {isPhone ? (
        <Sheet
          isOpen={inspecting !== null}
          label="Inspect"
          padding="flush"
          onClose={() => {
            setInspecting(null);
            setSectionError(null);
          }}
        >
          <PreviewInspectPanel {...panelProps} isInSheet />
        </Sheet>
      ) : null}
    </PreviewChrome>
  );
}
