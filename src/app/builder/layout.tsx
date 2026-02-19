import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "l4yercak3 Builder | AI-Powered Design Builder",
  description: "Create beautiful landing pages, email templates, and PDFs with AI. Describe what you want and watch it come to life.",
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="h-screen w-screen overflow-auto"
      style={{
        backgroundColor: "#18181b", // neutral shell canvas
      }}
    >
      {children}
    </div>
  );
}
