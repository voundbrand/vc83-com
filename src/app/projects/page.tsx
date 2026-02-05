"use client";

/**
 * PROJECTS PAGE - Full-screen project management
 *
 * Renders the ProjectsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { ProjectsWindow } from "@/components/window-content/projects-window";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <ProjectsWindow fullScreen />
    </div>
  );
}
