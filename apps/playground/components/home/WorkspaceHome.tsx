"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  parseBlueprintWorkspace,
  seedWorkspaceProject,
  useWorkspaceStore,
  withSharedName,
  workspaceHasStudios,
  type WorkspaceProject,
} from "@blueprint/ui";
import styles from "./home.module.css";

/**
 * One create path for the whole workspace.
 *
 * Name and the Blueprint seed. Colour, type and scale are filled together so
 * the author does not invent the same system twice. After create, the colour
 * bench is next — edit the other slices from there.
 */
export function WorkspaceHome() {
  const router = useRouter();
  const workspace = useWorkspaceStore();
  const [name, setName] = useState(DEFAULT_WORKSPACE_NAME);
  const [error, setError] = useState("");
  const [pendingImport, setPendingImport] = useState<WorkspaceProject | null>(
    null,
  );
  const importInputRef = useRef<HTMLInputElement>(null);

  const openColour = () => {
    router.push("/colour");
  };

  const applyWorkspace = (project: WorkspaceProject) => {
    workspace.save(withSharedName(project));
    router.push("/colour");
  };

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }
    setError("");
    applyWorkspace(seedWorkspaceProject(name.trim()));
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const imported = parseBlueprintWorkspace(await file.text());
      if (workspaceHasStudios(workspace.project)) {
        setPendingImport(imported);
        return;
      }
      applyWorkspace(imported);
    } catch {
      setError("Choose a valid Blueprint project file.");
    }
  };

  if (!workspace.hasLoaded) {
    return (
      <div className={styles.loadingPage} role="status">
        Loading workspace…
      </div>
    );
  }

  const current = workspace.project;
  const hasWorkspace = workspaceHasStudios(current);

  return (
    <div className={styles.page}>
      {hasWorkspace ? (
        <section className={styles.card} aria-labelledby="home-title">
          <h1 id="home-title">{current?.name ?? DEFAULT_WORKSPACE_NAME}</h1>
          <p className={styles.lede}>
            This workspace is stored in this browser. Open colour to keep
            editing, or import a project file to replace it.
          </p>
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <footer className={styles.footer}>
            <Button
              scheme="neutral"
              size="small"
              type="button"
              variant="text"
              onClick={() => importInputRef.current?.click()}
            >
              Import project
            </Button>
            <Button scheme="primary" type="button" onClick={openColour}>
              Open colour
            </Button>
          </footer>
        </section>
      ) : (
        <form className={styles.card} onSubmit={create}>
          <h1>New workspace</h1>
          <p className={styles.lede}>
            Name it. The Blueprint seed fills colour, type, and scale — edit
            those after.
          </p>

          <section className={styles.field}>
            <TextInput
              label="Project name"
              value={name}
              onChange={setName}
              placeholder={DEFAULT_WORKSPACE_NAME}
            />
          </section>

          <p className={styles.preset}>
            Preset: <strong>Blueprint seed</strong>
          </p>

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <footer className={styles.footer}>
            <Button
              scheme="neutral"
              size="small"
              type="button"
              variant="text"
              onClick={() => importInputRef.current?.click()}
            >
              Import project
            </Button>
            <Button scheme="primary" type="submit">
              Create workspace
            </Button>
          </footer>
        </form>
      )}

      <input
        ref={importInputRef}
        className={styles.visuallyHidden}
        type="file"
        accept=".json,.blueprint.json,application/json"
        onChange={importProject}
      />

      <AlertDialog
        actionLabel="Import project"
        description={`This replaces ${current?.name ?? "the current workspace"} in this browser with ${pendingImport?.name ?? "the imported project"}. Export first if you want to keep it.`}
        isOpen={pendingImport !== null}
        title="Replace current project?"
        onAction={() => {
          if (!pendingImport) return;
          const imported = pendingImport;
          setPendingImport(null);
          applyWorkspace(imported);
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingImport(null);
        }}
      />
    </div>
  );
}
