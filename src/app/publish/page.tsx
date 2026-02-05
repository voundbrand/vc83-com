"use client";

/**
 * PUBLISH PAGE - Full-screen web publishing
 *
 * Renders the WebPublishingWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { WebPublishingWindow } from "@/components/window-content/web-publishing-window";

export default function PublishPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <WebPublishingWindow fullScreen />
    </div>
  );
}
