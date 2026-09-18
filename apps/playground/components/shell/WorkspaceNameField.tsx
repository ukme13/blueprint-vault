"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_WORKSPACE_NAME,
  emptyWorkspace,
  useWorkspaceStore,
  withSharedName,
  workspaceHasStudios,
} from "@blueprint/ui";
import styles from "./shell-name.module.css";

/**
 * The workspace name, under Blueprint on the rail.
 *
 * Studios used to each carry a copy in the topbar. The name belongs to the
 * workspace, so the shell is the one place that edits it. This component
 * mounts with the rail, not with Home, so a create on Home is already in
 * storage by the time the field first reads.
 */
export function WorkspaceNameField() {
  const workspace = useWorkspaceStore();
  const [draft, setDraft] = useState(DEFAULT_WORKSPACE_NAME);

  useEffect(() => {
    if (!workspace.hasLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(workspace.project?.name ?? DEFAULT_WORKSPACE_NAME);
  }, [workspace.hasLoaded, workspace.project?.name]);

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

  return (
    <label className={styles.field}>
      <span className={styles.visuallyHidden}>Project name</span>
      <input
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
  );
}
