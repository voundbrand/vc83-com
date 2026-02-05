"use client";

/**
 * CRM PAGE - Full-screen CRM management
 *
 * Renders the CRMWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { CRMWindow } from "@/components/window-content/crm-window";

export default function CRMPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <CRMWindow fullScreen />
    </div>
  );
}
