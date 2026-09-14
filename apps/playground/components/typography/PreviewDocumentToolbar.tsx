"use client";

import { useMemo, useRef } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import {
  applyRoleToBlocks,
  previewDocumentRoleOptions,
  selectedDocumentBlocks,
} from "@blueprint/ui";
import { usePreviewDocumentSession } from "./PreviewDocumentPane";

export function PreviewDocumentToolbar() {
  const session = usePreviewDocumentSession();
  const selected = useMemo(
    () => selectedDocumentBlocks(session.document, session.selectedIds),
    [session.document, session.selectedIds],
  );
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const roleValue = selected.roleIds.length === 1 ? selected.roleIds[0] : "";
  const options = previewDocumentRoleOptions(session.system).map((group) => ({
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
        const ids = selectedRef.current.ids;
        if (!value || ids.length === 0) return;
        session.patch((current) => applyRoleToBlocks(current, ids, value));
      }}
    />
  );
}
