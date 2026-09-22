"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Pencil } from "lucide-react";
import {
  DEFAULT_WORKSPACE_NAME,
  emptyWorkspace,
  useWorkspaceStore,
  withSharedName,
  workspaceHasStudios,
} from "@blueprint/ui";
import styles from "./shell-name.module.css";

export interface WorkspaceNameFieldProps {
  collapsed?: boolean;
  isNavCollapsed?: boolean;
  onExpand?: () => void;
}

/**
 * The workspace name, under Blueprint on the rail.
 *
 * Expanded: editable text input for the workspace name.
 * Collapsed: collapses to an edit icon that expands the rail and focuses the field.
 */
export function WorkspaceNameField({
  collapsed = false,
  isNavCollapsed = false,
  onExpand,
}: WorkspaceNameFieldProps = {}) {
  const workspace = useWorkspaceStore();
  const [draft, setDraft] = useState(DEFAULT_WORKSPACE_NAME);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    if (!workspace.hasLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(workspace.project?.name ?? DEFAULT_WORKSPACE_NAME);
  }, [workspace.hasLoaded, workspace.project?.name]);

  useEffect(() => {
    if (!isNavCollapsed && shouldFocusRef.current) {
      shouldFocusRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isNavCollapsed]);

  if (!workspace.hasLoaded || !workspaceHasStudios(workspace.project)) {
    return null;
  }

  const commit = () => {
    const next = draft.trim() || DEFAULT_WORKSPACE_NAME;
    setDraft(next);
    workspace.update((current) =>
      withSharedName({ ...(current ?? emptyWorkspace()), name: next }),
    );
  };

  if (isNavCollapsed) {
    return (
      <IconButton
        className={styles.collapsedEditButton}
        icon={<Icon icon={Pencil} size="md" />}
        label="Edit project name"
        tooltip="Edit project name"
        variant="ghost"
        size="lg"
        onClick={() => {
          shouldFocusRef.current = true;
          onExpand?.();
        }}
      />
    );
  }

  return (
    <div className={styles.fieldContainer} data-collapsing={collapsed}>
      <label className={styles.field}>
        <span className={styles.visuallyHidden}>Project name</span>
        <input
          ref={inputRef}
          aria-label="Project name"
          className={styles.name}
          maxLength={80}
          spellCheck={false}
          value={draft}
          onBlur={commit}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </label>
    </div>
  );
}
