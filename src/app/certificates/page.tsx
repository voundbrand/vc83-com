"use client";

/**
 * CERTIFICATES PAGE - Full-screen certificate management
 *
 * Renders the CertificatesWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { CertificatesWindow } from "@/components/window-content/certificates-window";

export default function CertificatesPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <CertificatesWindow fullScreen />
    </div>
  );
}
