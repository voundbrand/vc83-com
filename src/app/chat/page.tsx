"use client";

/**
 * CHAT PAGE - Full-screen AI assistant
 *
 * Renders the AIChatWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { AIChatWindow } from "@/components/window-content/ai-chat-window";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <AIChatWindow fullScreen />
    </div>
  );
}
