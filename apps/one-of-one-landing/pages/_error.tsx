import type { NextPageContext } from "next"
import Link from "next/link"

type LandingErrorPageProps = {
  statusCode?: number
}

function LandingErrorPage({ statusCode }: LandingErrorPageProps) {
  const title =
    statusCode === 404
      ? "This page does not exist."
      : "Something went wrong."
  const description =
    statusCode === 404
      ? "The link may be outdated, or the page may have moved."
      : "The page could not be rendered right now. Please try again from the main landing page."

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "#f4f3ef",
        color: "#111827",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "640px",
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
          {statusCode ? `Error ${statusCode}` : "Application Error"}
        </p>
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: "36px",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "0 0 32px",
            fontSize: "16px",
            lineHeight: 1.6,
            color: "#4b5563",
          }}
        >
          {description}
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
  )
}

LandingErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500
  return { statusCode }
}

export default LandingErrorPage
