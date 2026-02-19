"use client";

import type { ProjectFile } from "../finder-window/finder-types";

export const TEXT_EDITOR_OPEN_REQUEST_EVENT = "vc83:text-editor:request-open";
export const TEXT_EDITOR_COMMAND_EVENT = "vc83:text-editor:command";

export interface TextEditorOpenRequestDetail {
  file?: ProjectFile;
}

export interface TextEditorCommandDetail {
  type: "open-file";
  file: ProjectFile;
}

function dispatchEventWithDetail<T>(eventName: string, detail: T) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
}

export function requestTextEditorWindow(detail: TextEditorOpenRequestDetail = {}) {
  dispatchEventWithDetail(TEXT_EDITOR_OPEN_REQUEST_EVENT, detail);
}

export function dispatchTextEditorCommand(detail: TextEditorCommandDetail) {
  dispatchEventWithDetail(TEXT_EDITOR_COMMAND_EVENT, detail);
}
