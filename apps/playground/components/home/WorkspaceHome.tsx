"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
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
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectMosaic } from "./ProjectMosaic";
import { forgetAllLocalFonts } from "../typography/use-local-fonts";
import styles from "./home.module.css";

function projectCountLabel(count: number) {
  if (count === 1) return "You have 1 project.";
  return `You have ${count} projects.`;
}

function familyCountLabel(count: number) {
  if (count === 1) return "1 colour family";
  return `${count} colour families`;
}

/**
 * The project list for this browser.
 *
 * v1 still stores one workspace. The card is that document; New project opens
 * a dialog rather than another page. After create, the colour bench is next.
 */
export function WorkspaceHome() {
  const router = useRouter();
  const workspace = useWorkspaceStore();
  const [name, setName] = useState(DEFAULT_WORKSPACE_NAME);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<WorkspaceProject | null>(
    null,
  );
  const importInputRef = useRef<HTMLInputElement>(null);

  const applyWorkspace = (project: WorkspaceProject) => {
    void forgetAllLocalFonts();
    workspace.save(withSharedName(project));
    router.push("/colour");
  };

  const openCreate = () => {
    setError("");
    setName(DEFAULT_WORKSPACE_NAME);
    setIsCreateOpen(true);
  };

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }
    setError("");
    setIsCreateOpen(false);
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
  const familyCount = current?.palette?.tracks.length ?? 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Projects</h1>
          <p className={styles.count}>
            {projectCountLabel(hasWorkspace ? 1 : 0)}
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            scheme="neutral"
            size="small"
            type="button"
            variant="text"
            onClick={() => importInputRef.current?.click()}
          >
            Import project
          </Button>
          <Button
            scheme="primary"
            size="small"
            type="button"
            onClick={openCreate}
          >
            New project
          </Button>
        </div>
      </header>

      {error && !isCreateOpen ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      {hasWorkspace ? (
        <ul className={styles.grid}>
          <li>
            <Link className={styles.card} href="/colour">
              <ProjectMosaic palette={current?.palette} />
              <h2>{current?.name ?? DEFAULT_WORKSPACE_NAME}</h2>
              <p>{familyCountLabel(familyCount)}</p>
            </Link>
          </li>
        </ul>
      ) : null}

      <input
        ref={importInputRef}
        className={styles.visuallyHidden}
        type="file"
        accept=".json,.blueprint.json,application/json"
        onChange={importProject}
      />

      <NewProjectDialog
        error={error}
        hasWorkspace={hasWorkspace}
        isOpen={isCreateOpen}
        name={name}
        onNameChange={setName}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setError("");
        }}
        onSubmit={create}
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
