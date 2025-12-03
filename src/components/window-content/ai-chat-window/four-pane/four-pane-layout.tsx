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
  id: Id<"contactSyncs"> | Id<"emailCampaigns">;
  type: "contact_sync" | "email_campaign";
  name: string;
  status: string;
  createdAt: number;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

export function FourPaneLayout() {
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null)

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
              onSelectWorkItem={setSelectedWorkItem}
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
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
