import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 w-full border-b border-border bg-card/95">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <main className="container py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-44" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden space-y-4 lg:block">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </CardContent>
            </Card>
          </aside>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="flex h-full flex-col">
                <CardHeader className="space-y-3 pb-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-full" />
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-5 w-16" />
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border pt-4">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
