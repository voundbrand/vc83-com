import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";

// Playfair Display for headings
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// DM Sans as a substitute for Twentieth Century (similar geometric sans-serif)
// If you have Twentieth Century from Adobe Fonts, we can switch to that
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

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
      className={`h-screen w-screen overflow-auto ${playfairDisplay.variable} ${dmSans.variable}`}
      style={{
        backgroundColor: '#18181b', // zinc-900 (neutral gray, no blue)
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
