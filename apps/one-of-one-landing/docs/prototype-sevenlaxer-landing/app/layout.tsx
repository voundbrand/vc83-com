import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Playfair_Display } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "sevenlayers — Private AI. You can Trust.",
  description:
    "One operator. Yours alone. Built on everything you know. Private AI that learns your business and compounds over time.",
  keywords: [
    "private AI",
    "AI operator",
    "business automation",
    "sovereign AI",
    "AI assistant",
  ],
  openGraph: {
    title: "sevenlayers — Private AI. You can Trust.",
    description:
      "One operator. Yours alone. Built on everything you know.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "sevenlayers — Private AI. You can Trust.",
    description:
      "One operator. Yours alone. Built on everything you know.",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
