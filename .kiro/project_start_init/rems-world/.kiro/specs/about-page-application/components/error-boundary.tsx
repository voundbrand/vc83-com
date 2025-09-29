"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }
    // In production, you could send this to an error reporting service
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We encountered an unexpected error. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                    window.location.reload();
                  }}
                >
                  Refresh Page
                </Button>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Error details
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for the entire app
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Application Error</CardTitle>
              </div>
              <CardDescription>
                We're having trouble loading the application. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()} className="w-full" size="lg">
                Refresh Application
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
