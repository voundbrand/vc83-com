"use client"

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { ConversationHistory } from "./conversation-history"
import { ToolExecutionPanel } from "./tool-execution-panel"
import { ChatHeader } from "../single-pane/chat-header"
import { ChatMessages } from "../single-pane/chat-messages"
import { ChatInput } from "../single-pane/chat-input"
import { ChatFooter } from "../single-pane/chat-footer"

export function ThreePaneLayout() {
  return (
    <div className="h-full" style={{ background: 'var(--win95-bg)' }}>
      <PanelGroup direction="horizontal">
        {/* Left Pane - Conversation History */}
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={35}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full border-r-2"
            style={{
              borderColor: 'var(--win95-border-dark)',
              background: 'var(--win95-bg)'
            }}
          >
            <ConversationHistory />
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle
          className="w-1 transition-colors cursor-col-resize hover:bg-[var(--win95-highlight)]"
          style={{
            backgroundColor: 'var(--win95-border-dark)'
          }}
        />

        {/* Center Pane - Active Chat (reusing Phase 1 components) */}
        <Panel
          defaultSize={50}
          minSize={30}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full"
            style={{ background: 'var(--win95-bg)' }}
          >
            <ChatHeader />
            <ChatMessages />
            <ChatInput />
            <ChatFooter />
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle
          className="w-1 transition-colors cursor-col-resize hover:bg-[var(--win95-highlight)]"
          style={{
            backgroundColor: 'var(--win95-border-dark)'
          }}
        />

        {/* Right Pane - Tool Execution Panel */}
        <Panel
          defaultSize={30}
          minSize={20}
          maxSize={45}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full border-l-2"
            style={{
              borderColor: 'var(--win95-border-dark)',
              background: 'var(--win95-bg)'
            }}
          >
            <ToolExecutionPanel />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
