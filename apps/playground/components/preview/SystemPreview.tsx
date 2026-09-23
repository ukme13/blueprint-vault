"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  applyColorToBlocks,
  applyRoleToBlocks,
  applyStyleToGroup,
  defaultElevationScale,
  defaultLayoutTokens,
  defaultPreviewDevices,
  defaultRadiusScale,
  defaultSpacingScale,
  elevationCssVariables,
  generatePalettes,
  layoutCssVariablesForDevice,
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
  type PreviewDocumentBlock,
  type PreviewDocument,
  type PreviewSectionFill,
  type PreviewSectionId,
  useWorkspaceStore,
} from "@blueprint/ui";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { useThemeMode } from "../../app/theme-provider";
import { PreviewInspector } from "../PreviewInspector";
import { PreviewSectionInspector } from "../PreviewSectionInspector";
import type { PreviewImageError } from "../PreviewSectionMenu";
import { PreviewChrome } from "../PreviewChrome";
import { usePaletteView } from "../palette/PaletteViewContext";
import { useGoogleFontsLink } from "../typography/use-google-fonts";
import { useLocalFonts } from "../typography/use-local-fonts";
import { PreviewSite } from "./PreviewSite";

const EMPTY_TOKENS: never[] = [];
const EMPTY_PALETTES: never[] = [];

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
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
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
  const isPhone = useMediaQuery("(max-width: 640px)");
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

  const resetSlotToDefault = useCallback(() => {
    if (
      !slotSource ||
      !inspecting ||
      inspecting.source === "section" ||
      !defaultBlock
    ) {
      return;
    }
    patchDocument(slotSource, (document) => {
      const withText = updateBlockText(
        document,
        inspecting.id,
        defaultBlock.text,
      );
      const withRole = applyRoleToBlocks(
        withText,
        [inspecting.id],
        defaultBlock.roleId,
      );
      return applyColorToBlocks(withRole, [inspecting.id], undefined);
    });
  }, [defaultBlock, inspecting, patchDocument, slotSource]);

  const resetSectionToDefault = useCallback(() => {
    if (!inspecting || inspecting.source !== "section") return;
    const defaultTokenId = PREVIEW_SECTION_SEED_TOKEN[inspecting.id];
    patchSectionFill(inspecting.id, { kind: "token", tokenId: defaultTokenId });
  }, [inspecting, patchSectionFill]);

  const resetAllToDefault = useCallback(() => {
    setInspecting(null);
    setSectionError(null);
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
          previewLanding: seedPreviewLanding(system),
          previewShell: seedPreviewShell(system),
          previewSections: seedPreviewSections(),
        },
      };
    });
  }, [system, update]);

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

  return (
    <PreviewChrome
      canvas={
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
          }}
          onInspectSection={(id) => {
            setSectionError(null);
            setInspecting({ source: "section", id });
          }}
          onInspectShell={(id) => {
            setSectionError(null);
            setInspecting({ source: "shell", id });
          }}
          onSectionError={(id, error) => {
            setSectionError(error);
            setInspecting({ source: "section", id });
          }}
          onSectionFill={patchSectionFill}
        />
      }
      device={frame}
      devices={devices}
      mode={mode}
      onDeviceChange={onDeviceChange}
      onResetToDefault={resetAllToDefault}
    >
      <PreviewInspector
        block={inspectedBlock}
        defaultBlock={defaultBlock}
        isOpen={slotSource !== null && inspectedBlock !== null}
        slotId={
          inspecting?.source === "section" ? null : (inspecting?.id ?? null)
        }
        system={system}
        tokenColors={tokenColors}
        tokens={tokens}
        onApplyToGroup={() => {
          if (!slotSource || !inspecting || inspecting.source === "section") {
            return;
          }
          patchDocument(slotSource, (document) =>
            applyStyleToGroup(document, inspecting.id),
          );
        }}
        onColorChange={(colorTokenId) => {
          if (!slotSource || !inspecting || inspecting.source === "section") {
            return;
          }
          patchDocument(slotSource, (document) =>
            applyColorToBlocks(document, [inspecting.id], colorTokenId),
          );
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setInspecting(null);
        }}
        onResetToDefault={resetSlotToDefault}
        onRoleChange={(roleId) => patchSlot((block) => ({ ...block, roleId }))}
        onTextChange={(text) => patchSlot((block) => ({ ...block, text }))}
      />
      <PreviewSectionInspector
        error={sectionError}
        fill={inspectedSection?.fill ?? null}
        isOpen={inspecting?.source === "section"}
        sectionId={inspecting?.source === "section" ? inspecting.id : null}
        tokenColors={tokenColors}
        tokens={tokens}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setInspecting(null);
            setSectionError(null);
          }
        }}
        onResetToDefault={resetSectionToDefault}
        onTokenChange={(tokenId) => {
          if (inspecting?.source !== "section") return;
          const current = previewSection(sections, inspecting.id)?.fill;
          if (current?.kind === "image") {
            patchSectionFill(inspecting.id, {
              ...current,
              fallbackTokenId: tokenId,
            });
            return;
          }
          patchSectionFill(inspecting.id, { kind: "token", tokenId });
        }}
      />
    </PreviewChrome>
  );
}
