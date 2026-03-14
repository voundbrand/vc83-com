"use client"

import Link from "next/link"

export default function GlobalError() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#f4f3ef",
          color: "#111827",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <section
            style={{
              maxWidth: "640px",
              width: "100%",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(17, 24, 39, 0.08)",
              borderRadius: "28px",
              padding: "40px",
              textAlign: "center",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.08)",
            }}
          >
            <p
              style={{
                margin: "0 0 16px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#6b7280",
              }}
            >
              Application Error
            </p>
            <h1
              style={{
                margin: "0 0 16px",
                fontSize: "36px",
                lineHeight: 1.1,
              }}
            >
              Something went wrong.
            </h1>
            <p
              style={{
                margin: "0 0 32px",
                fontSize: "16px",
                lineHeight: 1.6,
                color: "#4b5563",
              }}
            >
              The page could not be rendered. Return to the main landing page and
              try again.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "0 20px",
                borderRadius: "999px",
                backgroundColor: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Back to home
            </Link>
          </section>
        </main>
      </body>
    </html>
  )
}
