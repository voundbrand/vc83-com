export default function BenefitsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8 space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="space-y-4">
              <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
              <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
            </div>
          </aside>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
