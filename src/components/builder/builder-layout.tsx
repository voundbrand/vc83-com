"use client";

/**
 * BUILDER LAYOUT
 *
 * Main layout for the AI page builder.
 * Uses resizable panels for chat (30%) and preview (70%).
 */

import { useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { BuilderChatPanel } from "./builder-chat-panel";
import { BuilderPreviewPanel } from "./builder-preview-panel";

export function BuilderLayout() {
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header - shows toggle between chat and preview */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Page Builder</h1>
        <button
          onClick={() => setIsMobilePreviewOpen(!isMobilePreviewOpen)}
          className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
        >
          {isMobilePreviewOpen ? "Show Chat" : "Show Preview"}
        </button>
      </div>

      {/* Mobile Layout - toggle between panels */}
      <div className="flex-1 md:hidden">
        {isMobilePreviewOpen ? (
          <BuilderPreviewPanel />
        ) : (
          <BuilderChatPanel />
        )}
      </div>

      {/* Desktop Layout - resizable panels */}
      <div className="hidden md:flex flex-1">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Chat Panel */}
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <BuilderChatPanel />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-col-resize group">
            <div className="h-full flex items-center justify-center">
              <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-indigo-500 transition-colors" />
            </div>
          </PanelResizeHandle>

          {/* Preview Panel */}
          <Panel defaultSize={70} minSize={40}>
            <BuilderPreviewPanel />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
