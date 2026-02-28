import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Geist, Geist_Mono, Instrument_Serif, Playfair_Display, Press_Start_2P } from "next/font/google";
import { Providers } from "./providers";
import { NotificationContainer } from "@/components/ui/notification-container";
import { SessionExpiredBoundary } from "@/components/session-expired-boundary";
import { AffiliateCapture } from "@/components/affiliate-capture";
import "./globals.css";

const APPEARANCE_BOOTSTRAP_SCRIPT = `
  (() => {
    const FALLBACK_MODE = "dark";
    const STORAGE_KEY = "reading-mode";
    const EXPLICIT_STORAGE_KEY = "reading-mode-explicit";
    try {
      const root = document.documentElement;
      const storedMode = window.localStorage.getItem(STORAGE_KEY);
      const hasExplicitSelection = window.localStorage.getItem(EXPLICIT_STORAGE_KEY) === "1";
      const mode = storedMode === "dark" || (storedMode === "sepia" && hasExplicitSelection)
        ? storedMode
        : FALLBACK_MODE;

      if (storedMode === "sepia" && !hasExplicitSelection) {
        window.localStorage.setItem(STORAGE_KEY, FALLBACK_MODE);
      }

      root.setAttribute("data-reading-mode", mode);
      root.classList.toggle("dark", mode === "dark");
      root.classList.remove("sepia");
    } catch {
      const root = document.documentElement;
      root.setAttribute("data-reading-mode", FALLBACK_MODE);
      root.classList.add("dark");
      root.classList.remove("sepia");
    }
  })();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  style: ["normal", "italic"],
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

const codecPro = localFont({
  src: [
    { path: "../../public/fonts/CodecPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/CodecPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-codec-pro",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "sevenlayers.io — Private AI. You can Trust.",
  description: "One operator. Yours alone. Built on your business, your clients, and your way of working. C-suite leverage at a fraction of the payroll.",
  keywords: ["private AI", "AI operator", "business automation", "sevenlayers", "sevenlayers.io"],
  authors: [{ name: "sevenlayers.io" }],
  creator: "sevenlayers.io",
  publisher: "sevenlayers.io",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sevenlayers.io",
    siteName: "sevenlayers.io",
    title: "sevenlayers.io — Private AI. You can Trust.",
    description: "One operator. Yours alone. Built on your business, your clients, and your way of working. C-suite leverage at a fraction of the payroll.",
  },
  twitter: {
    card: "summary_large_image",
    title: "sevenlayers.io — Private AI. You can Trust.",
    description: "One operator. Yours alone. Built on your business, your clients, and your way of working. C-suite leverage at a fraction of the payroll.",
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
        <meta name="color-scheme" content="dark light" />
        <Script id="appearance-bootstrap" strategy="beforeInteractive">
          {APPEARANCE_BOOTSTRAP_SCRIPT}
        </Script>
        {/* Font Awesome Pro Kit */}
        <Script
          src="https://kit.fontawesome.com/ee3dfef1ab.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${playfairDisplay.variable} ${pressStart2P.variable} ${codecPro.variable} font-sans antialiased crt-scanlines`}
        style={{ fontSynthesis: "none" }}
      >
        <SessionExpiredBoundary>
          <Providers>
            <AffiliateCapture />
            {children}
            <NotificationContainer />
          </Providers>
        </SessionExpiredBoundary>
      </body>
    </html>
  );
}
