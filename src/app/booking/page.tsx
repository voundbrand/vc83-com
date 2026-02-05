"use client";

/**
 * BOOKING PAGE - Full-screen booking management
 *
 * Renders the BookingWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { BookingWindow } from "@/components/window-content/booking-window";

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <BookingWindow fullScreen />
    </div>
  );
}
