import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Builder | AI-Powered Landing Page Generator",
  description: "Create beautiful landing pages with AI. Describe what you want and watch it come to life.",
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {children}
    </div>
  );
}
