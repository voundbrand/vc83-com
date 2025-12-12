import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { Providers } from "./providers";
import { NotificationContainer } from "@/components/ui/notification-container";
import { SessionExpiredBoundary } from "@/components/session-expired-boundary";
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
  title: "l4yercak3 - Where Creativity Meets Technology",
  description: "We stand at the forefront of a new era, where creativity meets technology to redefine what's possible. Modern web solutions combining design creativity with cutting-edge innovation.",
  keywords: ["web development", "creative technology", "innovation", "modern web solutions", "l4yercak3"],
  authors: [{ name: "l4yercak3" }],
  creator: "l4yercak3",
  publisher: "l4yercak3",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://l4yercak3.com",
    siteName: "l4yercak3",
    title: "l4yercak3 - Where Creativity Meets Technology",
    description: "We stand at the forefront of a new era, where creativity meets technology to redefine what's possible.",
  },
  twitter: {
    card: "summary_large_image",
    title: "l4yercak3 - Where Creativity Meets Technology",
    description: "We stand at the forefront of a new era, where creativity meets technology to redefine what's possible.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "manifest",
        url: "/site.webmanifest",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Font Awesome Pro Kit */}
        <Script
          src="https://kit.fontawesome.com/ee3dfef1ab.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased crt-scanlines`}
      >
        <SessionExpiredBoundary>
          <Providers>
            {children}
            <NotificationContainer />
          </Providers>
        </SessionExpiredBoundary>
      </body>
    </html>
  );
}
