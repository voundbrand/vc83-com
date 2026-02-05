"use client";

/**
 * WORKFLOWS PAGE - Full-screen workflow management
 *
 * Renders the WorkflowsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { WorkflowsWindow } from "@/components/window-content/workflows-window";

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <WorkflowsWindow fullScreen />
    </div>
  );
}
