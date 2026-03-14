import Link from "next/link"

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div
        className="w-full max-w-xl rounded-[28px] p-8 md:p-10 text-center"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.28em] mb-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Page Not Found
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight mb-4"
          style={{ color: "var(--color-text)" }}
        >
          This page does not exist.
        </h1>
        <p
          className="text-sm md:text-base leading-relaxed mb-8"
          style={{ color: "var(--color-text-secondary)" }}
        >
          The link may be outdated, or the page may have moved. Return to the
          landing page to continue from the main entry point.
        </p>
        <Link href="/" className="btn-accent inline-flex items-center justify-center">
          Back to home
        </Link>
      </div>
    </main>
  )
}
