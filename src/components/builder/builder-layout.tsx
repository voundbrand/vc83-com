"use client";

/**
 * BUILDER LAYOUT
 *
 * Main layout for the l4yercak3 AI design builder.
 * Uses resizable panels for chat (30%) and preview (70%).
 * Now includes header with logo, navigation, and exit.
 */

import { useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { BuilderHeader } from "./builder-header";
import { BuilderPageTabs } from "./builder-page-tabs";
import { BuilderChatPanel } from "./builder-chat-panel";
import { BuilderPreviewPanel } from "./builder-preview-panel";

export function BuilderLayout() {
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-zinc-900 overflow-hidden">
      {/* Header - fixed at top */}
      <div className="flex-shrink-0">
        <BuilderHeader
          projectName="Untitled"
          onProjectNameChange={(name) => {
            // TODO: Update project name in backend
            console.log("Project name changed:", name);
          }}
          onPublish={() => {
            // TODO: Implement publish
            console.log("Publish clicked");
          }}
          onShare={() => {
            // TODO: Implement share
            console.log("Share clicked");
          }}
        />
      </div>

      {/* Page Tabs - shows all pages in the project */}
      <div className="flex-shrink-0 hidden md:block">
        <BuilderPageTabs />
      </div>

      {/* Mobile Header - shows toggle between chat and preview */}
      <div className="flex-shrink-0 md:hidden flex items-center justify-between px-4 py-2 border-b border-zinc-700 bg-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-100">l4yercak3</h1>
        <button
          onClick={() => setIsMobilePreviewOpen(!isMobilePreviewOpen)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-500 transition-colors"
        >
          {isMobilePreviewOpen ? "Show Chat" : "Show Preview"}
        </button>
      </div>

      {/* Mobile Layout - toggle between panels */}
      <div className="flex-1 min-h-0 md:hidden overflow-hidden">
        {isMobilePreviewOpen ? (
          <BuilderPreviewPanel />
        ) : (
          <BuilderChatPanel />
        )}
      </div>

      {/* Desktop Layout - resizable panels */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Chat Panel */}
          <Panel defaultSize={30} minSize={20} maxSize={50} className="h-full overflow-hidden">
            <BuilderChatPanel />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-zinc-700 hover:bg-purple-500 transition-colors cursor-col-resize group">
            <div className="h-full flex items-center justify-center">
              <div className="w-1 h-8 bg-zinc-600 rounded-full group-hover:bg-purple-400 transition-colors" />
            </div>
          </PanelResizeHandle>

          {/* Preview Panel */}
          <Panel defaultSize={70} minSize={40} className="h-full overflow-hidden">
            <BuilderPreviewPanel />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
