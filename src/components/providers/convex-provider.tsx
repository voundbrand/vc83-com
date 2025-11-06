"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ReactNode, useEffect } from "react";

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

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}