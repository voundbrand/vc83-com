"use client";

/**
 * MEDIA PAGE - Full-screen media library
 *
 * Renders the MediaLibraryDropbox component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import MediaLibraryDropbox from "@/components/window-content/media-library-window/index-dropbox";

export default function MediaPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <MediaLibraryDropbox fullScreen />
    </div>
  );
}
