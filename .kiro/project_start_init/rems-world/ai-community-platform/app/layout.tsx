import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find It Be Useful - AI Website Building Community",
  description:
    "Learn to build profitable websites with AI tools. Join our community and start earning today.",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-retro antialiased">
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
