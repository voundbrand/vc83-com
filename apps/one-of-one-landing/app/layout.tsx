import type { Metadata, Viewport } from "next"
import type { CSSProperties } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const fontVariableFallbacks: CSSProperties = {
  ["--font-geist-sans" as string]: "system-ui, -apple-system, Segoe UI, sans-serif",
  ["--font-geist-mono" as string]:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  ["--font-jost" as string]: "system-ui, -apple-system, Segoe UI, sans-serif",
}

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
        className="font-sans antialiased"
        style={fontVariableFallbacks}
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
