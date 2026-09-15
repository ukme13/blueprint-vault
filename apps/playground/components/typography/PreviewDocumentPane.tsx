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
  type RefObject,
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

export interface PreviewDocumentViewValue {
  system: TypeSystem;
  document: PreviewDocument;
  selectedIds: string[];
  focusId: string | null;
  styleOf: (role: TypeRole) => CSSProperties;
  selectIds: (ids: string[]) => void;
}

export interface PreviewDocumentActions {
  patch: (fn: (document: PreviewDocument) => PreviewDocument) => void;
  enter: (blockId: string, offset: number) => void;
  backspaceAtStart: (blockId: string) => void;
}

const ViewContext = createContext<PreviewDocumentViewValue | null>(null);
const ActionsContext = createContext<RefObject<PreviewDocumentActions> | null>(
  null,
);

const EMPTY_ACTIONS: PreviewDocumentActions = {
  patch: () => undefined,
  enter: () => undefined,
  backspaceAtStart: () => undefined,
};

export function usePreviewDocumentView(): PreviewDocumentViewValue {
  const view = useContext(ViewContext);
  if (!view) {
    throw new Error("Preview document chrome is missing its session.");
  }
  return view;
}

export function usePreviewDocumentActions(): RefObject<PreviewDocumentActions> {
  const actions = useContext(ActionsContext);
  if (!actions) {
    throw new Error("Preview document chrome is missing its session.");
  }
  return actions;
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
  const documentRef = useRef(document);
  const actionsRef = useRef<PreviewDocumentActions>(EMPTY_ACTIONS);
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
  const enter = useCallback(
    (blockId: string, offset: number) => {
      const current = documentRef.current.find((entry) => entry.id === blockId);
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
    [change, system],
  );
  const backspaceAtStart = useCallback(
    (blockId: string) => {
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
    [change],
  );

  useLayoutEffect(() => {
    documentRef.current = document;
  }, [document]);

  useLayoutEffect(() => {
    actionsRef.current = { patch, enter, backspaceAtStart };
  }, [patch, enter, backspaceAtStart]);

  const view = useMemo<PreviewDocumentViewValue>(
    () => ({
      system,
      document,
      selectedIds,
      focusId,
      styleOf,
      selectIds: setSelectedIds,
    }),
    [system, document, selectedIds, focusId, styleOf],
  );

  return (
    <ViewContext.Provider value={view}>
      <ActionsContext.Provider value={actionsRef}>
        {children}
      </ActionsContext.Provider>
    </ViewContext.Provider>
  );
}

export function PreviewDocumentCanvas() {
  const view = usePreviewDocumentView();
  const actions = usePreviewDocumentActions();
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!view.focusId) return;
    const el = canvasRef.current?.querySelector(
      `[data-preview-block="${CSS.escape(view.focusId)}"]`,
    );
    if (!(el instanceof HTMLElement)) return;
    el.focus();
    const range = window.document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [view.focusId]);

  useEffect(() => {
    const onSelectionChange = () => {
      const ids = blockIdsIntersectingSelection(canvasRef.current);
      if (ids.length > 0) view.selectIds(ids);
    };
    window.document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      window.document.removeEventListener("selectionchange", onSelectionChange);
  }, [view]);

  return (
    <div
      ref={canvasRef}
      className={styles.previewDocument}
      onMouseUp={() => {
        const ids = blockIdsIntersectingSelection(canvasRef.current);
        if (ids.length === 0) return;
        view.selectIds(ids);
      }}
    >
      {view.document.map((block) => {
        const role = resolveDocumentRole(view.system, block.roleId);
        if (!role) return null;
        const Tag = blockElementForRole(view.system, role);
        return (
          <PreviewEditableBlock
            key={block.id}
            block={block}
            selected={view.selectedIds.includes(block.id)}
            style={view.styleOf(role)}
            tag={Tag}
            onBackspaceAtStart={(blockId) =>
              actions.current.backspaceAtStart(blockId)
            }
            onEnter={(blockId, offset) =>
              actions.current.enter(blockId, offset)
            }
            onSelect={(blockId) => view.selectIds([blockId])}
            onTextChange={(blockId, text) =>
              actions.current.patch((current) =>
                updateBlockText(current, blockId, text),
              )
            }
          />
        );
      })}
    </div>
  );
}
