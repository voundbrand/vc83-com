"use client";

/**
 * FORMS PAGE - Full-screen form management
 *
 * Renders the FormsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { FormsWindow } from "@/components/window-content/forms-window";

export default function FormsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <FormsWindow fullScreen />
    </div>
  );
}
