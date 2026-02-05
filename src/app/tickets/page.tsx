"use client";

/**
 * TICKETS PAGE - Full-screen ticket management
 *
 * Renders the TicketsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { TicketsWindow } from "@/components/window-content/tickets-window";

export default function TicketsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <TicketsWindow fullScreen />
    </div>
  );
}
