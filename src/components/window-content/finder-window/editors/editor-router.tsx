"use client";

/**
 * EDITOR ROUTER - Routes a file to the correct editor component
 *
 * Given a ProjectFile and its EditorType, renders the appropriate
 * editor (markdown, code, note, image, pdf, or info fallback).
 */

import { useCallback } from "react";
import { MarkdownEditor } from "./markdown-editor";
import { CodeEditor } from "./code-editor";
import { NoteEditor } from "./note-editor";
import { ImageViewer } from "./image-viewer";
import { PdfViewer } from "./pdf-viewer";
import { FinderPreview } from "../finder-preview";
import type { EditorType, ProjectFile } from "../finder-types";

interface EditorRouterProps {
  file: ProjectFile;
  editorType: EditorType;
  sessionId: string;
  onDirty: () => void;
  onClean: () => void;
  onSaveAs?: (content: string) => void;
}

export function EditorRouter({
  file,
  editorType,
  sessionId,
  onDirty,
  onClean,
  onSaveAs,
}: EditorRouterProps) {
  const noop = useCallback(() => {}, []);

  switch (editorType) {
    case "markdown":
      return (
        <MarkdownEditor
          file={file}
          sessionId={sessionId}
          onDirty={onDirty}
          onClean={onClean}
          onSaveAs={onSaveAs}
        />
      );

    case "code":
      return (
        <CodeEditor
          file={file}
          sessionId={sessionId}
          onDirty={onDirty}
          onClean={onClean}
          onSaveAs={onSaveAs}
        />
      );

    case "note":
      return (
        <NoteEditor
          file={file}
          sessionId={sessionId}
          onDirty={onDirty}
          onClean={onClean}
          onSaveAs={onSaveAs}
        />
      );

    case "image":
      return <ImageViewer file={file} />;

    case "pdf":
      return <PdfViewer file={file} />;

    case "info":
    default:
      return (
        <FinderPreview
          file={file}
          onClose={noop}
          onOpenInBuilder={
            file.fileKind === "builder_ref" && file.builderAppId
              ? () => window.open("/builder", "_blank")
              : undefined
          }
          onOpenInLayers={
            file.fileKind === "layer_ref" && file.layerWorkflowId
              ? () => window.open(`/layers?workflowId=${file.layerWorkflowId}`, "_blank")
              : undefined
          }
        />
      );
  }
}
