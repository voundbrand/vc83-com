"use client";

/**
 * TEMPLATES PAGE - Full-screen template management
 *
 * Renders the TemplatesWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { TemplatesWindow } from "@/components/window-content/templates-window";

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <TemplatesWindow fullScreen />
    </div>
  );
}
