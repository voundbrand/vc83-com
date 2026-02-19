import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  dispatchTextEditorCommand,
  requestTextEditorWindow,
  TEXT_EDITOR_COMMAND_EVENT,
  TEXT_EDITOR_OPEN_REQUEST_EVENT,
} from "@/components/window-content/text-editor-window/bridge";
import type { ProjectFile } from "@/components/window-content/finder-window/finder-types";

function readWorkspaceFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function buildVirtualFile(name: string): ProjectFile {
  return {
    _id: "file_1" as ProjectFile["_id"],
    _creationTime: 0,
    organizationId: "org_1" as ProjectFile["organizationId"],
    projectId: "project_1" as ProjectFile["projectId"],
    name,
    path: `/${name}`,
    parentPath: "/",
    fileKind: "virtual",
    source: "user",
    createdAt: 0,
    updatedAt: 0,
  };
}

function withMockWindow(callback: (win: EventTarget) => void) {
  const previousWindow = (globalThis as typeof globalThis & { window?: EventTarget }).window;
  const mockWindow = new EventTarget();
  (globalThis as typeof globalThis & { window?: EventTarget }).window = mockWindow;
  try {
    callback(mockWindow);
  } finally {
    if (previousWindow) {
      (globalThis as typeof globalThis & { window?: EventTarget }).window = previousWindow;
    } else {
      delete (globalThis as typeof globalThis & { window?: EventTarget }).window;
    }
  }
}

describe("text editor launch entry points", () => {
  it("dispatches open-request and command events with file payloads", () => {
    const file = buildVirtualFile("README.md");

    withMockWindow((win) => {
      let openRequestDetail: unknown = null;
      let commandDetail: unknown = null;

      win.addEventListener(TEXT_EDITOR_OPEN_REQUEST_EVENT, (event) => {
        openRequestDetail = (event as CustomEvent).detail;
      });
      win.addEventListener(TEXT_EDITOR_COMMAND_EVENT, (event) => {
        commandDetail = (event as CustomEvent).detail;
      });

      requestTextEditorWindow({ file });
      dispatchTextEditorCommand({ type: "open-file", file });

      expect(openRequestDetail).toEqual({ file });
      expect(commandDetail).toEqual({ type: "open-file", file });
    });
  });

  it("no-ops cleanly when window is unavailable", () => {
    const previousWindow = (globalThis as typeof globalThis & { window?: EventTarget }).window;
    delete (globalThis as typeof globalThis & { window?: EventTarget }).window;
    try {
      expect(() => requestTextEditorWindow()).not.toThrow();
      expect(() => dispatchTextEditorCommand({ type: "open-file", file: buildVirtualFile("README.md") })).not.toThrow();
    } finally {
      if (previousWindow) {
        (globalThis as typeof globalThis & { window?: EventTarget }).window = previousWindow;
      }
    }
  });

  it("keeps top-nav, all-apps, and finder context launch wiring in source contracts", () => {
    const homePage = readWorkspaceFile("src/app/page.tsx");
    const allApps = readWorkspaceFile("src/components/window-content/all-apps-window.tsx");
    const finderContextMenu = readWorkspaceFile(
      "src/components/window-content/finder-window/finder-context-menu.tsx",
    );
    const textEditorWindow = readWorkspaceFile("src/components/window-content/text-editor-window/index.tsx");

    expect(homePage).toContain("TEXT_EDITOR_OPEN_REQUEST_EVENT");
    expect(homePage).toContain("openWindow(\"text-editor\", \"Text Editor\", <TextEditorWindow />");
    expect(homePage).toContain("popular-text-editor");
    expect(homePage).toContain("utilities-text-editor");

    expect(allApps).toContain("\"text-editor\",");
    expect(allApps).toContain("\"text-editor\": {");
    expect(allApps).toContain("component: <TextEditorWindow />");

    expect(finderContextMenu).toContain("Open in Text Editor");
    expect(finderContextMenu).toContain("New File in Text Editor");

    expect(textEditorWindow).toContain("Explorer");
    expect(textEditorWindow).toContain("CreateFileModal");
    expect(textEditorWindow).toContain("CreateFolderModal");
    expect(textEditorWindow).toContain("buildExplorerTree");
    expect(textEditorWindow).toContain("projectFileSystem.getFileTree");
  });
});
