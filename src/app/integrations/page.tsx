"use client";

/**
 * INTEGRATIONS PAGE - Full-screen integrations management
 *
 * Renders the IntegrationsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { IntegrationsWindow } from "@/components/window-content/integrations-window";

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <IntegrationsWindow fullScreen />
    </div>
  );
}
