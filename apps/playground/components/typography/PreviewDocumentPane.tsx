"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  blockElementForRole,
  createPreviewBlockId,
  mergeBlockWithPrevious,
  resolveDocumentRole,
  roleForInsertedBlock,
  splitBlock,
  updateBlockText,
  type PreviewDocument,
  type TypeRole,
  type TypeSystem,
} from "@blueprint/ui";
import { PreviewEditableBlock } from "./PreviewEditableBlock";
import { blockIdsIntersectingSelection } from "./preview-document-dom";
import styles from "./typography-workspace.module.css";

export interface PreviewDocumentSessionValue {
  system: TypeSystem;
  document: PreviewDocument;
  selectedIds: string[];
  styleOf: (role: TypeRole) => CSSProperties;
  canvasRef: { current: HTMLDivElement | null };
  selectIds: (ids: string[]) => void;
  patch: (fn: (document: PreviewDocument) => PreviewDocument) => void;
  enter: (blockId: string, offset: number) => void;
  backspaceAtStart: (blockId: string) => void;
}

const SessionContext = createContext<PreviewDocumentSessionValue | null>(null);

export function usePreviewDocumentSession(): PreviewDocumentSessionValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("Preview document chrome is missing its session.");
  }
  return session;
}

export interface PreviewDocumentSessionProps {
  system: TypeSystem;
  document: PreviewDocument;
  styleOf: (role: TypeRole) => CSSProperties;
  onDocumentChange: (document: PreviewDocument) => void;
  children: ReactNode;
}

export function PreviewDocumentSession({
  system,
  document,
  styleOf,
  onDocumentChange,
  children,
}: PreviewDocumentSessionProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef(document);
  documentRef.current = document;
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    document[0] ? [document[0].id] : [],
  );
  const [focusId, setFocusId] = useState<string | null>(null);

  const change = useCallback(
    (next: PreviewDocument) => {
      documentRef.current = next;
      onDocumentChange(next);
    },
    [onDocumentChange],
  );
  const patch = useCallback(
    (fn: (current: PreviewDocument) => PreviewDocument) => {
      change(fn(documentRef.current));
    },
    [change],
  );

  useLayoutEffect(() => {
    if (!focusId) return;
    const el = canvasRef.current?.querySelector(
      `[data-preview-block="${CSS.escape(focusId)}"]`,
    );
    if (el instanceof HTMLElement) {
      el.focus();
      const range = window.document.createRange();
      range.selectNodeContents(el);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setFocusId(null);
  }, [focusId]);

  const session = useMemo<PreviewDocumentSessionValue>(
    () => ({
      system,
      document,
      selectedIds,
      styleOf,
      canvasRef,
      selectIds: setSelectedIds,
      patch,
      enter: (blockId, offset) => {
        const current = documentRef.current.find(
          (entry) => entry.id === blockId,
        );
        if (!current) return;
        const newId = createPreviewBlockId();
        change(
          splitBlock(
            documentRef.current,
            blockId,
            offset,
            newId,
            roleForInsertedBlock(system, current.roleId),
          ),
        );
        setFocusId(newId);
        setSelectedIds([newId]);
      },
      backspaceAtStart: (blockId) => {
        const index = documentRef.current.findIndex(
          (entry) => entry.id === blockId,
        );
        const previous = index > 0 ? documentRef.current[index - 1] : null;
        change(mergeBlockWithPrevious(documentRef.current, blockId));
        if (previous) {
          setFocusId(previous.id);
          setSelectedIds([previous.id]);
          return;
        }
        setSelectedIds([blockId]);
      },
    }),
    [system, document, selectedIds, styleOf, change, patch],
  );

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function PreviewDocumentCanvas() {
  const session = usePreviewDocumentSession();

  useEffect(() => {
    const onSelectionChange = () => {
      const ids = blockIdsIntersectingSelection(session.canvasRef.current);
      if (ids.length > 0) session.selectIds(ids);
    };
    window.document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      window.document.removeEventListener("selectionchange", onSelectionChange);
  }, [session]);

  return (
    <div
      ref={session.canvasRef}
      className={styles.previewDocument}
      onMouseUp={() => {
        const ids = blockIdsIntersectingSelection(session.canvasRef.current);
        if (ids.length === 0) return;
        session.selectIds(ids);
      }}
    >
      {session.document.map((block) => {
        const role = resolveDocumentRole(session.system, block.roleId);
        if (!role) return null;
        const Tag = blockElementForRole(session.system, role);
        return (
          <PreviewEditableBlock
            key={block.id}
            block={block}
            selected={session.selectedIds.includes(block.id)}
            style={session.styleOf(role)}
            tag={Tag}
            onBackspaceAtStart={session.backspaceAtStart}
            onEnter={session.enter}
            onSelect={(blockId) => session.selectIds([blockId])}
            onTextChange={(blockId, text) =>
              session.patch((current) =>
                updateBlockText(current, blockId, text),
              )
            }
          />
        );
      })}
    </div>
  );
}
