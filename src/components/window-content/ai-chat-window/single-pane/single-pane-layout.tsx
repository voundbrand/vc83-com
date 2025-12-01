"use client"

import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ChatFooter } from "./chat-footer"

export function SinglePaneLayout() {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      <ChatHeader />
      <ChatMessages />
      <ChatInput />
      <ChatFooter />
    </div>
  )
}
