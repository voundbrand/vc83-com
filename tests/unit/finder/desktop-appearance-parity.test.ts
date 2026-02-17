import fs from "node:fs";
import path from "node:path";

function readWorkspaceFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("finder + desktop appearance parity contract", () => {
  it("defines unified dark/sepia token layers and shell parity utilities", () => {
    const globalsCss = readWorkspaceFile("src/app/globals.css");

    expect(globalsCss).toContain(':root[data-reading-mode="dark"]');
    expect(globalsCss).toContain(':root[data-reading-mode="sepia"]');
    expect(globalsCss).toContain("--finder-selection-bg");
    expect(globalsCss).toContain(".desktop-taskbar");
    expect(globalsCss).toContain(".finder-shell");
    expect(globalsCss).toContain(".finder-resize-handle");
  });

  it("wires parity utility classes into desktop taskbar and finder shell containers", () => {
    const homePage = readWorkspaceFile("src/app/page.tsx");
    const finderWindow = readWorkspaceFile("src/components/window-content/finder-window/index.tsx");

    expect(homePage).toContain("desktop-taskbar");
    expect(homePage).toContain("desktop-taskbar-action");
    expect(homePage).toContain("desktop-taskbar-warning");

    expect(finderWindow).toContain("finder-shell");
    expect(finderWindow).toContain("finder-sidebar-divider");
    expect(finderWindow).toContain("finder-resize-handle");
    expect(finderWindow).toContain("finder-resize-handle-dot");
  });
});
