import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />;
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex space-x-1", className)}>
      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded-md bg-muted"
          style={{
            width: `${100 - (i * 10 + Math.random() * 20)}%`,
          }}
        />
      ))}
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="mb-4 h-6 w-1/3 animate-pulse rounded bg-muted" />
      <LoadingSkeleton lines={3} />
    </div>
  );
}

interface LoadingOverlayProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoadingOverlay({ className, children }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="lg" />
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
