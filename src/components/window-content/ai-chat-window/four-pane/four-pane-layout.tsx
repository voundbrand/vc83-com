"use client"

import { useState } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { ConversationHistory } from "../three-pane/conversation-history"
import { ToolExecutionPanel } from "./tool-execution-panel-redesign"
import { DetailView } from "./detail-view"
import { ChatHeader } from "../single-pane/chat-header"
import { ChatMessages } from "./chat-messages-redesign"
import { ChatInput } from "./chat-input-redesign"
import { ChatFooter } from "../single-pane/chat-footer"
import type { Id } from "../../../../../convex/_generated/dataModel"

interface WorkItem {
  id: Id<"contactSyncs"> | Id<"emailCampaigns"> | Id<"aiWorkItems">;
  type: "contact_sync" | "email_campaign" | `ai_${string}`;
  name: string;
  status: string;
  createdAt: number;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface ToolExecution {
  id: string
  toolName: string
  status: "proposed" | "approved" | "executing" | "running" | "success" | "error" | "rejected" | "cancelled"
  startTime: Date
  endTime?: Date
  input: Record<string, unknown>
  output?: unknown
  error?: string
  isMinimized?: boolean
  proposalMessage?: string
}

export function FourPaneLayout() {
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null)
  const [selectedToolExecution, setSelectedToolExecution] = useState<ToolExecution | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const handleOpenSettings = () => {
    setShowSettings(true)
    setSelectedWorkItem(null) // Clear work item selection when opening settings
    setSelectedToolExecution(null) // Clear tool execution selection
  }

  const handleCloseSettings = () => {
    setShowSettings(false)
  }

  return (
    <div className="h-full" style={{ background: 'var(--win95-bg)' }}>
      <PanelGroup direction="horizontal">
        {/* Column 1 - Conversation History */}
        <Panel
          defaultSize={18}
          minSize={12}
          maxSize={30}
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

        <PanelResizeHandle
          className="w-1 transition-colors cursor-col-resize hover:bg-[var(--win95-highlight)]"
          style={{
            backgroundColor: 'var(--win95-border-dark)'
          }}
        />

        {/* Column 2 - Main Chat Area (with optimistic UI) */}
        <Panel
          defaultSize={38}
          minSize={25}
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

        <PanelResizeHandle
          className="w-1 transition-colors cursor-col-resize hover:bg-[var(--win95-highlight)]"
          style={{
            backgroundColor: 'var(--win95-border-dark)'
          }}
        />

        {/* Column 3 - Tool Execution & Work Items (no tabs) */}
        <Panel
          defaultSize={22}
          minSize={15}
          maxSize={35}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full border-l-2"
            style={{
              borderColor: 'var(--win95-border-dark)',
              background: 'var(--win95-bg)'
            }}
          >
            <ToolExecutionPanel
              selectedWorkItem={selectedWorkItem}
              onSelectWorkItem={(item) => {
                setSelectedWorkItem(item)
                if (item) {
                  setShowSettings(false) // Close settings when selecting work item
                  setSelectedToolExecution(null) // Clear tool execution selection
                }
              }}
              selectedToolExecution={selectedToolExecution}
              onSelectToolExecution={(exec) => {
                setSelectedToolExecution(exec)
                if (exec) {
                  setShowSettings(false) // Close settings when selecting tool execution
                  setSelectedWorkItem(null) // Clear work item selection
                }
              }}
              onOpenSettings={handleOpenSettings}
            />
          </div>
        </Panel>

        <PanelResizeHandle
          className="w-1 transition-colors cursor-col-resize hover:bg-[var(--win95-highlight)]"
          style={{
            backgroundColor: 'var(--win95-border-dark)'
          }}
        />

        {/* Column 4 - Detail View (Human-in-the-Loop) */}
        <Panel
          defaultSize={22}
          minSize={15}
          maxSize={40}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full border-l-2"
            style={{
              borderColor: 'var(--win95-border-dark)',
              background: 'var(--win95-bg)'
            }}
          >
            <DetailView
              selectedWorkItem={selectedWorkItem}
              onClearSelection={() => setSelectedWorkItem(null)}
              selectedToolExecution={selectedToolExecution}
              onClearToolExecution={() => setSelectedToolExecution(null)}
              showSettings={showSettings}
              onCloseSettings={handleCloseSettings}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
