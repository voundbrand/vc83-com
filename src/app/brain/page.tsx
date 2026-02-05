"use client";

/**
 * BRAIN PAGE - Full-screen knowledge hub
 *
 * Renders the BrainWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { BrainWindow } from "@/components/window-content/brain-window";

export default function BrainPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <BrainWindow fullScreen />
    </div>
  );
}
