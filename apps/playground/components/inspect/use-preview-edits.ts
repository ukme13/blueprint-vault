"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  applyColorToBlocks,
  applyRoleToBlocks,
  clearPreviewStyle,
  isPreviewCard,
  PREVIEW_SECTION_SEED_TOKEN,
  previewStyleKey,
  seedPreviewLanding,
  seedPreviewSections,
  seedPreviewShell,
  seedWorkspaceProject,
  setPreviewStyle,
  updateBlockText,
  updateSectionFill,
  withSeededTypographySlice,
  type LayoutBindings,
  type PreviewDocument,
  type PreviewDocumentBlock,
  type PreviewSectionFill,
  type PreviewSectionId,
  type PreviewSlotStyle,
  type TypeSystem,
  useWorkspaceStore,
} from "@blueprint/ui";
import type { PreviewImageError } from "../PreviewSectionMenu";

/** What is selected on the page: a slot of the landing or the shell, or a band. */
export type InspectTarget =
  | { source: "landing"; id: string }
  | { source: "shell"; id: string }
  | { source: "section"; id: PreviewSectionId };

interface PreviewEditsArgs {
  update: ReturnType<typeof useWorkspaceStore>["update"];
  system: TypeSystem;
  inspecting: InspectTarget | null;
  slotSource: "landing" | "shell" | null;
  /** The selected slot as the seed gives it, for putting it back. */
  defaultBlock: PreviewDocumentBlock | null;
  setInspecting: Dispatch<SetStateAction<InspectTarget | null>>;
  setSectionError: Dispatch<SetStateAction<PreviewImageError | null>>;
  setLayoutBindings: Dispatch<SetStateAction<LayoutBindings>>;
}

/**
 * Every write the preview page makes to the project: a slot's copy and type,
 * a document, a band's fill, an element's style, and the three ways back to
 * the seed. One place, so a change to what an undo owns or where it returns
 * to is made once.
 */
export function usePreviewEdits({
  update,
  system,
  inspecting,
  slotSource,
  defaultBlock,
  setInspecting,
  setSectionError,
  setLayoutBindings,
}: PreviewEditsArgs) {
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
    /* A card has no copy or type to put back: only what was set on it. */
    if (inspecting && isPreviewCard(inspecting.id)) {
      patchStyle(inspecting.id, {});
      return;
    }
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
  }, [defaultBlock, inspecting, patchStyle, slotSource, update]);

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
  }, [setInspecting, setLayoutBindings, setSectionError, system, update]);

  return {
    patchSlot,
    patchDocument,
    patchSectionFill,
    patchStyle,
    resetSlotToDefault,
    resetSectionToDefault,
    resetAllToDefault,
  };
}

export type { PreviewDocument, PreviewSectionFill, PreviewSlotStyle };
