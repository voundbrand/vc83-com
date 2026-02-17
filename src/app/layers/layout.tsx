import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Layers - Visual Automation Canvas | l4yercak3",
  description: "Map your marketing tech stack, connect integrations visually, and automate your agency operations with Layers.",
};

/**
 * Standalone layout for /layers — no sidebar, full-screen canvas.
 * The root layout (app/layout.tsx) still provides fonts and providers.
 */
export default function LayersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: "#09090b" }}>
      {children}
    </div>
  );
}
