"use client"

import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ChatFooter } from "./chat-footer"

export function SinglePaneLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: 'var(--shell-surface)' }}>
      <ChatHeader />
      <ChatMessages />
      <ChatInput />
      <ChatFooter />
    </div>
  )
}
