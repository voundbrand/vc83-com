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
  title: "Rikscha-Projekt Torgelow - Marketingstrategie",
  description: "Marketingstrategie und Projektplan für das Rikscha-Projekt in Torgelow. TuS Pommern Torgelow e.V.",
};

export default function RikschaLayout({
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
