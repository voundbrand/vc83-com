import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";

// Playfair Display for headings
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// DM Sans as a substitute for Twentieth Century (similar geometric sans-serif)
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "l4yercak3 Builder",
  description: "AI-powered design builder for pages, emails, and PDFs",
};

export default function BuilderWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`h-screen overflow-hidden ${playfairDisplay.variable} ${dmSans.variable}`}
      style={{
        backgroundColor: '#18181b', // neutral shell canvas
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
