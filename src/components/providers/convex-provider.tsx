"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ReactNode, useEffect } from "react";
import { SessionExpiredBoundary } from "@/components/session-expired-boundary";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL as string;

// Debug logging
if (typeof window !== "undefined") {
  console.log("🔗 [Convex] Initializing with URL:", convexUrl);
  console.log("🔗 [Convex] URL is valid:", !!convexUrl && !convexUrl.includes("undefined"));
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    console.log("🔗 [Convex] Provider mounted, client state:", {
      hasUrl: !!convexUrl,
      url: convexUrl,
      client: !!convex,
    });

    // Check connection after a delay
    const timeoutId = setTimeout(() => {
      console.log("🔗 [Convex] Connection check after 2s - if queries are still undefined, there's a connection issue");
    }, 2000);

    // Global listener for uncaught session errors from async Convex operations
    const handleSessionError = (message: string) => {
      if (SessionExpiredBoundary.isSessionError(message)) {
        console.warn("[Convex] Session error caught globally, redirecting to login:", message);
        SessionExpiredBoundary.handleInvalidSession();
        return true;
      }
      return false;
    };

    const onError = (event: ErrorEvent) => {
      if (handleSessionError(event.message || "")) {
        event.preventDefault();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason || "");
      if (handleSessionError(message)) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}