"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary to catch session expiry errors
 * Handles errors like "Sitzung abgelaufen: Bitte melde dich erneut an"
 * or "Session expired: Please sign in again"
 */
export class SessionExpiredBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if error message indicates session expiry
    const errorMessage = error.message.toLowerCase();
    const isSessionExpired =
      errorMessage.includes("session expired") ||
      errorMessage.includes("sitzung abgelaufen") ||
      errorMessage.includes("please sign in") ||
      errorMessage.includes("bitte melde dich") ||
      errorMessage.includes("not authenticated") ||
      errorMessage.includes("authentication required");

    if (isSessionExpired) {
      // Redirect to home page where user can sign in
      if (typeof window !== "undefined") {
        // Store current path to potentially redirect back after login
        const currentPath = window.location.pathname;
        if (currentPath !== "/") {
          sessionStorage.setItem("redirectAfterLogin", currentPath);
        }
        // Redirect to home page
        window.location.href = "/";
      }
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Session Expired Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isSessionExpired =
        errorMessage.toLowerCase().includes("session expired") ||
        errorMessage.toLowerCase().includes("sitzung abgelaufen");

      if (isSessionExpired) {
        // Show a brief message while redirecting
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
          >
            <div
              className="border-4 p-8 max-w-md text-center"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                boxShadow: "var(--win95-shadow)",
              }}
            >
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h2
                className="text-lg font-bold mb-3"
                style={{ color: "var(--win95-highlight)" }}
              >
                Session Expired
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--win95-text)" }}>
                Your session has expired. Redirecting to sign in page...
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Ihre Sitzung ist abgelaufen. Weiterleitung zur Anmeldeseite...
              </p>
            </div>
          </div>
        );
      }

      // For other errors, show generic error message
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
        >
          <div
            className="border-4 p-8 max-w-md text-center"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
              boxShadow: "var(--win95-shadow)",
            }}
          >
            <h2
              className="text-lg font-bold mb-3"
              style={{ color: "var(--error)" }}
            >
              An Error Occurred
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--win95-text)" }}>
              {this.state.error?.message || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border-2 text-sm font-bold"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
