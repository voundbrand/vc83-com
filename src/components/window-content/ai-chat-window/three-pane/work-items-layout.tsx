"use client"

import { useState } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { WorkItemList } from "./work-item-list"
import { WorkItemDetail } from "./work-item-detail"
import { ChatHeader } from "../single-pane/chat-header"
import { ChatMessages } from "../single-pane/chat-messages"
import { ChatInput } from "../single-pane/chat-input"
import { ChatFooter } from "../single-pane/chat-footer"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { Id } from "../../../../../convex/_generated/dataModel"

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

/**
 * Alternative three-pane layout optimized for viewing work items
 *
 * Left:   Chat conversation with AI
 * Middle: List of work items (contact syncs, email campaigns)
 * Right:  Detail view of selected work item
 */
export function WorkItemsLayout() {
  const { organizationId } = useAIChatContext()
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null)

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--win95-bg)' }}>
        <p className="text-sm" style={{ color: 'var(--win95-text-muted)' }}>
          Loading organization...
        </p>
      </div>
    )
  }

  return (
    <div className="h-full" style={{ background: 'var(--win95-bg)' }}>
      <PanelGroup direction="horizontal">
        {/* Left Pane - Chat Conversation */}
        <Panel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full border-r-2"
            style={{
              borderColor: 'var(--win95-border-dark)',
              background: 'var(--win95-bg)'
            }}
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

        {/* Middle Pane - Work Items List */}
        <Panel
          defaultSize={40}
          minSize={25}
          className="flex flex-col"
        >
          <div
            className="flex flex-col h-full"
            style={{ background: 'var(--win95-bg)' }}
          >
            <WorkItemList
              organizationId={organizationId}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
            />
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle
          className="w-1 transition-colors cursor-col-resize hover:bg-[var(--win95-highlight)]"
          style={{
            backgroundColor: 'var(--win95-border-dark)'
          }}
        />

        {/* Right Pane - Work Item Detail */}
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
            {selectedItem ? (
              <WorkItemDetail
                item={selectedItem}
                onActionComplete={() => setSelectedItem(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                  Select a work item to view details
                </p>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
