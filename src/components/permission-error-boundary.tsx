"use client";

import { Component, ReactNode } from "react";
import { AlertCircle, Lock, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: "permission" | "general" | null;
}

/**
 * Error boundary that gracefully handles permission errors
 * Shows user-friendly messages instead of crashing the app
 */
export class PermissionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Detect if this is a permission error
    const isPermissionError =
      error.message.includes("Permission denied") ||
      error.message.includes("required") ||
      error.message.includes("Access denied");

    return {
      hasError: true,
      error,
      errorType: isPermissionError ? "permission" : "general",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error("Permission Error Boundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.errorType === "permission") {
        return (
          <div
            className="p-4 border-2 m-4"
            style={{
              backgroundColor: "var(--warning)",
              borderColor: "var(--shell-border)",
              color: "var(--shell-text)",
            }}
          >
            <div className="flex items-start gap-3">
              <Lock size={24} className="flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-base mb-2">Access Restricted</h3>
                <p className="text-sm mb-3">
                  You don't have permission to access this feature.
                </p>
                <div
                  className="p-3 mb-3 border-2"
                  style={{
                    backgroundColor: "var(--shell-surface)",
                    borderColor: "var(--shell-border)",
                  }}
                >
                  <p className="text-xs font-semibold mb-1">Required Permission:</p>
                  <code className="text-xs" style={{ color: "var(--primary)" }}>
                    {this.extractPermissionName(this.state.error?.message || "")}
                  </code>
                </div>
                <div className="space-y-2 text-xs">
                  <p>To gain access:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Contact your organization owner or administrator</li>
                    <li>
                      Ask them to grant you the required permission in the{" "}
                      <strong>Organization Settings → Roles & Permissions</strong>
                    </li>
                    <li>Refresh this page after your permissions have been updated</li>
                  </ol>
                </div>
                <button
                  onClick={this.handleReset}
                  className="beveled-button mt-4 px-4 py-2 text-sm font-semibold flex items-center gap-2"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                  }}
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // General error fallback
      return (
        <div
          className="p-4 border-2 m-4"
          style={{
            backgroundColor: "var(--error)",
            borderColor: "var(--shell-border)",
            color: "white",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-base mb-2">Something went wrong</h3>
              <p className="text-sm mb-3">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <details className="text-xs mb-3">
                <summary className="cursor-pointer font-semibold mb-1">
                  Error Details
                </summary>
                <code
                  className="block p-2 mt-2"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "4px",
                  }}
                >
                  {this.state.error?.message}
                </code>
              </details>
              <button
                onClick={this.handleReset}
                className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: "white",
                  color: "var(--error)",
                }}
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private extractPermissionName(errorMessage: string): string {
    // Extract permission name from error message
    // e.g., "Permission denied: view_templates required" -> "view_templates"
    const match = errorMessage.match(/:\s*([a-z_]+)\s+required/i);
    return match ? match[1] : "unknown permission";
  }
}
