"use client";

/**
 * STORE PAGE - Full-screen platform store
 *
 * Renders the StoreWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { StoreWindow } from "@/components/window-content/store-window";

export default function StorePage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <StoreWindow fullScreen />
    </div>
  );
}
