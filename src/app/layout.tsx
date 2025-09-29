import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VC83 - Retro Desktop Podcast",
  description: "VC insights from Mecklenburg-Vorpommern, Germany. From '83 to VC83.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased crt-scanlines`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
