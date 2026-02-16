"use client";

/**
 * AGENTS PAGE - Full-screen agent management dashboard
 *
 * Renders the AgentsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { AgentsWindow } from "@/components/window-content/agents-window";

export default function AgentsPage() {
  return <AgentsWindow fullScreen />;
}
