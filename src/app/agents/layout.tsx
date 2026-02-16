import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agents - Agent Management | l4yercak3",
  description: "Manage your AI agents, view analytics, monitor sessions, and configure agent behavior.",
};

/**
 * Standalone layout for /agents — dark full-screen, matching /builder and /layers.
 */
export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark h-screen w-screen overflow-hidden" style={{ background: "#09090b" }}>
      {children}
    </div>
  );
}
