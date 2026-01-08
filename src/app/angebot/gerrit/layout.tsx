import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Angebot für Gerrit & Axinia - Segelschule & Haus am Haff",
  description: "Persönliches Angebot für die digitale Transformation der Segelschule und des Hauses am Haff.",
};

export default function GerritLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} ${playfair.variable} font-sans`}>
      {children}
    </div>
  );
}
