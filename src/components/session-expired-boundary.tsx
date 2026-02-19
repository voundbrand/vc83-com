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
 * Global Error Boundary to catch session expiry and invalid session errors
 * Handles errors like:
 * - "Sitzung abgelaufen: Bitte melde dich erneut an" (Session expired)
 * - "Session expired: Please sign in again"
 * - "Invalid session" / "Ungültige Sitzung"
 * - "Sitzung nicht gefunden" (Session not found)
 * - "Invalid or expired session"
 */
export class SessionExpiredBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Check if an error indicates an invalid or expired session
   */
  static isSessionError(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return (
      // English patterns
      lowerMessage.includes("session expired") ||
      lowerMessage.includes("invalid session") ||
      lowerMessage.includes("session not found") ||
      lowerMessage.includes("please sign in") ||
      lowerMessage.includes("not authenticated") ||
      lowerMessage.includes("authentication required") ||
      lowerMessage.includes("invalid or expired") ||
      // German patterns
      lowerMessage.includes("sitzung abgelaufen") ||
      lowerMessage.includes("ungültige sitzung") ||
      lowerMessage.includes("sitzung nicht gefunden") ||
      lowerMessage.includes("bitte melde dich")
    );
  }

  /**
   * Clear the invalid session from localStorage and redirect to login
   */
  static handleInvalidSession(): void {
    if (typeof window !== "undefined") {
      // Clear the invalid session ID from localStorage
      localStorage.removeItem("convex_session_id");

      // Store current path to potentially redirect back after login
      const currentPath = window.location.pathname;
      if (currentPath !== "/") {
        sessionStorage.setItem("redirectAfterLogin", currentPath);
      }

      // Redirect to home page where user can sign in
      window.location.href = "/";
    }
  }

  static getDerivedStateFromError(error: Error): State {
    const isSessionError = SessionExpiredBoundary.isSessionError(error.message);

    if (isSessionError) {
      SessionExpiredBoundary.handleInvalidSession();
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Session Expired Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isSessionError = SessionExpiredBoundary.isSessionError(errorMessage);

      if (isSessionError) {
        // Show a brief message while redirecting
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
          >
            <div
              className="border-4 p-8 max-w-md text-center"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-surface-elevated)",
                boxShadow: "var(--shell-shadow)",
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
                style={{ color: "var(--shell-accent)" }}
              >
                Session Invalid
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--shell-text)" }}>
                Your session is no longer valid. Redirecting to sign in page...
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Ihre Sitzung ist nicht mehr gültig. Weiterleitung zur Anmeldeseite...
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
              borderColor: "var(--shell-border)",
              background: "var(--shell-surface-elevated)",
              boxShadow: "var(--shell-shadow)",
            }}
          >
            <h2
              className="text-lg font-bold mb-3"
              style={{ color: "var(--error)" }}
            >
              An Error Occurred
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--shell-text)" }}>
              {this.state.error?.message || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border-2 text-sm font-bold"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--shell-text)",
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
