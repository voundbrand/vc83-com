"use client";

/**
 * BOOKING PAGE - Full-screen booking management
 *
 * Renders the BookingWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { BookingWindow } from "@/components/window-content/booking-window";
import { useSearchParams } from "next/navigation";
import type { Id } from "../../../convex/_generated/dataModel";

export default function BookingPage() {
  const searchParams = useSearchParams();
  const resourceId = searchParams.get("resourceId");

  return (
    <div className="min-h-screen bg-zinc-900">
      <BookingWindow
        fullScreen
        initialTab={resourceId ? "availability" : undefined}
        initialResourceId={resourceId ? (resourceId as Id<"objects">) : null}
      />
    </div>
  );
}
