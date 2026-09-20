"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  LIBRARY_CAPACITY,
  formatBlueprintWorkspace,
  parseBlueprintWorkspace,
  seedWorkspaceProject,
  useWorkspaceStore,
  withSharedName,
  type WorkspaceProject,
} from "@blueprint/ui";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";
import { RenameProjectDialog } from "./RenameProjectDialog";
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
  const [renamingProject, setRenamingProject] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameError, setRenameError] = useState("");
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
    addAndOpen(
      withSharedName({
        ...seedWorkspaceProject(name.trim()),
        updatedAt: Date.now(),
      }),
    );
  };

  const openRename = (id: string, currentName: string) => {
    setRenameError("");
    setRenameName(currentName);
    setRenamingProject({ id, name: currentName });
  };

  const rename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingProject) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError("Enter a project name.");
      return;
    }
    setRenameError("");
    workspace.rename(renamingProject.id, trimmed);
    setRenamingProject(null);
  };

  const exportProject = (project: WorkspaceProject) => {
    const content = formatBlueprintWorkspace(project);
    const slug =
      project.name
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase() || "blueprint-workspace";
    const filename = `${slug}.blueprint.json`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = parseBlueprintWorkspace(await file.text());
      addAndOpen(
        withSharedName({
          ...parsed,
          updatedAt: parsed.updatedAt ?? Date.now(),
        }),
      );
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
          <div className={styles.countRow}>
            <p className={styles.count}>
              {projectCountLabel(summaries.length)}
            </p>
            <div
              className={
                isLibraryFull
                  ? `${styles.capacityIndicator} ${styles.capacityIndicatorFull}`
                  : styles.capacityIndicator
              }
              role="status"
              title={
                isLibraryFull
                  ? `Storage limit reached (${summaries.length} / ${LIBRARY_CAPACITY} projects). Delete one to add another.`
                  : `${summaries.length} of ${LIBRARY_CAPACITY} projects used`
              }
            >
              <div aria-hidden className={styles.capacityTrack}>
                <div
                  className={styles.capacityBar}
                  style={{
                    width: `${Math.min(100, (summaries.length / LIBRARY_CAPACITY) * 100)}%`,
                  }}
                />
              </div>
              <span className={styles.capacityLabel}>
                {summaries.length} / {LIBRARY_CAPACITY} used
              </span>
            </div>
          </div>
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
                updatedAt={entry.updatedAt ?? entry.project.updatedAt}
                onDelete={() => setPendingDeleteId(entry.id)}
                onDuplicate={() => {
                  workspace.duplicate(entry.id);
                }}
                onExport={() => exportProject(entry.project)}
                onOpen={() => workspace.switchTo(entry.id)}
                onRename={() => openRename(entry.id, entry.name)}
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

      <RenameProjectDialog
        error={renameError}
        isOpen={renamingProject !== null}
        name={renameName}
        onNameChange={setRenameName}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingProject(null);
            setRenameError("");
          }
        }}
        onSubmit={rename}
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
