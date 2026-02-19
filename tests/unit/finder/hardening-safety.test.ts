import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveFinderKeyboardAction } from "@/components/window-content/finder-window/use-finder-keyboard";
import {
  confirmBulkTabClose,
  confirmTabClose,
  getDirtyTabCloseMessage,
  getDirtyTabsCloseMessage,
} from "@/components/window-content/finder-window/use-finder-tabs";
import {
  applyBeforeUnloadGuard,
  BEFORE_UNLOAD_WARNING,
  shouldBlockBeforeUnload,
} from "@/components/window-content/finder-window/use-unsaved-changes-guard";

function readWorkspaceFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("finder keyboard + unsaved-change hardening", () => {
  it("maps keyboard shortcuts for new-file, focus-search, and close-tab flow", () => {
    const genericTarget = { tagName: "DIV", isContentEditable: false };

    expect(
      resolveFinderKeyboardAction({ key: "n", metaKey: true, target: genericTarget }),
    ).toBe("new-file");
    expect(
      resolveFinderKeyboardAction({ key: "N", metaKey: true, shiftKey: true, target: genericTarget }),
    ).toBe("new-folder");
    expect(
      resolveFinderKeyboardAction({ key: "f", metaKey: true, target: genericTarget }),
    ).toBe("focus-search");
    expect(
      resolveFinderKeyboardAction({ key: "w", metaKey: true, target: genericTarget }),
    ).toBe("close-active-tab");

    expect(
      resolveFinderKeyboardAction({ key: "w", metaKey: true, target: { tagName: "INPUT" } }),
    ).toBeNull();
    expect(
      resolveFinderKeyboardAction({ key: "Escape", target: { tagName: "TEXTAREA" } }),
    ).toBe("escape");
  });

  it("requires confirmation before closing dirty tabs", () => {
    const confirmSingle = vi.fn().mockReturnValueOnce(false);
    const singleAllowed = confirmTabClose(
      { name: "draft.md", isDirty: true },
      confirmSingle,
    );

    expect(singleAllowed).toBe(false);
    expect(confirmSingle).toHaveBeenCalledWith(getDirtyTabCloseMessage("draft.md"));

    const confirmBulk = vi.fn().mockReturnValueOnce(true);
    const bulkAllowed = confirmBulkTabClose(
      [
        { name: "draft.md", isDirty: true },
        { name: "clean.json", isDirty: false },
        { name: "notes.txt", isDirty: true },
      ],
      confirmBulk,
    );

    expect(bulkAllowed).toBe(true);
    expect(confirmBulk).toHaveBeenCalledWith(getDirtyTabsCloseMessage(2));
  });

  it("blocks beforeunload when dirty tabs exist", () => {
    expect(shouldBlockBeforeUnload(false)).toBe(false);
    expect(shouldBlockBeforeUnload(true)).toBe(true);

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined as string | undefined,
    };

    expect(applyBeforeUnloadGuard(event, false)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();

    expect(applyBeforeUnloadGuard(event, true)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe(BEFORE_UNLOAD_WARNING);
  });

  it("keeps focus-forward editor behavior under source contracts", () => {
    const finderWindow = readWorkspaceFile("src/components/window-content/finder-window/index.tsx");
    const markdownEditor = readWorkspaceFile(
      "src/components/window-content/finder-window/editors/markdown-editor.tsx",
    );
    const codeEditor = readWorkspaceFile(
      "src/components/window-content/finder-window/editors/code-editor.tsx",
    );
    const noteEditor = readWorkspaceFile(
      "src/components/window-content/finder-window/editors/note-editor.tsx",
    );

    expect(finderWindow).toContain("onFocusSearch");
    expect(finderWindow).toContain("onCloseActiveTab");
    expect(markdownEditor).toContain("textareaRef.current?.focus()");
    expect(codeEditor).toContain("textareaRef.current?.focus()");
    expect(noteEditor).toContain("editorRef.current?.focus()");
  });
});
