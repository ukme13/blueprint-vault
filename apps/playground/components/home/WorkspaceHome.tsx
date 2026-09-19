"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  LIBRARY_CAPACITY,
  parseBlueprintWorkspace,
  seedWorkspaceProject,
  useWorkspaceStore,
  withSharedName,
} from "@blueprint/ui";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";
import styles from "./home.module.css";

function projectCountLabel(count: number) {
  if (count === 1) return "You have 1 project.";
  return `You have ${count} projects.`;
}

/**
 * The project list for this browser.
 *
 * Cards are the switcher. Create and Import add; they never clobber another
 * workspace. Duplicate stays on Home so the new card is visible. Delete of
 * the last one returns an empty list.
 */
export function WorkspaceHome() {
  const router = useRouter();
  const workspace = useWorkspaceStore();
  const [name, setName] = useState(DEFAULT_WORKSPACE_NAME);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const addAndOpen = (project: ReturnType<typeof withSharedName>) => {
    if (!workspace.add(project)) {
      setError("This browser holds 8 projects. Delete one to add another.");
      return;
    }
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
    addAndOpen(withSharedName(seedWorkspaceProject(name.trim())));
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      addAndOpen(withSharedName(parseBlueprintWorkspace(await file.text())));
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

  const { summaries, currentId } = workspace.library;
  const isLibraryFull = summaries.length >= LIBRARY_CAPACITY;
  const pendingDelete = summaries.find((entry) => entry.id === pendingDeleteId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Projects</h1>
          <p className={styles.count}>{projectCountLabel(summaries.length)}</p>
        </div>
        <div className={styles.actions}>
          <Button
            disabled={isLibraryFull}
            scheme="neutral"
            size="small"
            type="button"
            variant="text"
            onClick={() => importInputRef.current?.click()}
          >
            Import project
          </Button>
          <Button
            disabled={isLibraryFull}
            scheme="primary"
            size="small"
            type="button"
            onClick={openCreate}
          >
            New project
          </Button>
        </div>
      </header>

      {isLibraryFull ? (
        <p className={styles.formError} role="status">
          This browser holds 8 projects. Delete one to add another.
        </p>
      ) : null}

      {error && !isCreateOpen ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      {summaries.length > 0 ? (
        <ul className={styles.grid}>
          {summaries.map((entry) => (
            <li key={entry.id}>
              <ProjectCard
                familyCount={entry.project.palette?.tracks.length ?? 0}
                href="/colour"
                isCurrent={entry.id === currentId}
                isLibraryFull={isLibraryFull}
                name={entry.name}
                palette={entry.project.palette}
                onDelete={() => setPendingDeleteId(entry.id)}
                onDuplicate={() => {
                  workspace.duplicate(entry.id);
                }}
                onOpen={() => workspace.switchTo(entry.id)}
              />
            </li>
          ))}
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
        actionLabel="Delete project"
        description={`This removes ${pendingDelete?.name ?? "this project"} from this browser. Export first if you want to keep it.`}
        isOpen={pendingDeleteId !== null}
        title={`Delete ${pendingDelete?.name ?? "project"}?`}
        onAction={() => {
          if (!pendingDeleteId) return;
          workspace.remove(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
