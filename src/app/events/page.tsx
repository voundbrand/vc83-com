"use client";

/**
 * EVENTS PAGE - Full-screen event management
 *
 * Renders the EventsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { EventsWindow } from "@/components/window-content/events-window";

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <EventsWindow fullScreen />
    </div>
  );
}
