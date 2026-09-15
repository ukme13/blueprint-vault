"use client";

import { useMemo } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import {
  applyRoleToBlocks,
  previewDocumentRoleOptions,
  selectedDocumentBlocks,
} from "@blueprint/ui";
import {
  usePreviewDocumentActions,
  usePreviewDocumentView,
} from "./PreviewDocumentPane";

export function PreviewDocumentToolbar() {
  const view = usePreviewDocumentView();
  const actions = usePreviewDocumentActions();
  const selected = useMemo(
    () => selectedDocumentBlocks(view.document, view.selectedIds),
    [view.document, view.selectedIds],
  );
  const roleValue = selected.roleIds.length === 1 ? selected.roleIds[0] : "";
  const options = previewDocumentRoleOptions(view.system).map((group) => ({
    type: "section" as const,
    title: group.groupLabel,
    options: group.roles.map((role) => ({
      value: role.id,
      label: role.name,
    })),
  }));

  return (
    <Selector
      isLabelHidden
      label="Text preset"
      options={options}
      placeholder={selected.roleIds.length > 1 ? "Multiple" : "Style"}
      statusVariant="tooltip"
      value={roleValue || undefined}
      variant="ghost"
      onChange={(value) => {
        if (!value || selected.ids.length === 0) return;
        actions.current.patch((current) =>
          applyRoleToBlocks(current, selected.ids, value),
        );
      }}
    />
  );
}
