"use client";

import { useEffect } from "react";
import { WindowManagerProvider } from "@/hooks/use-window-manager";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppearanceProvider } from "@/contexts/appearance-context";
import { AuthProvider } from "@/hooks/use-auth";
import { PermissionProvider } from "@/contexts/permission-context";
import { TranslationProvider } from "@/contexts/translation-context";
import { MediaSelectionProvider } from "@/contexts/media-selection-context";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ShoppingCartProvider } from "@/contexts/shopping-cart-context";
import { UpgradeModalProvider } from "@/components/ui/upgrade-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  // Suppress noisy HMR ping errors in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        const message = String(args[0] ?? "");
        // Suppress HMR ping-related errors
        if (
          message.includes("unrecognized HMR message") ||
          message.includes('{"event":"ping"}')
        ) {
          return;
        }
        originalError.apply(console, args);
      };

      // Also handle unhandled rejections for HMR
      const handleRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason as { message?: string } | string | undefined;
        const message = typeof reason === "string"
          ? reason
          : reason?.message ?? "";
        if (
          message.includes("unrecognized HMR message") ||
          message.includes('{"event":"ping"}')
        ) {
          event.preventDefault();
        }
      };
      window.addEventListener("unhandledrejection", handleRejection);

      return () => {
        console.error = originalError;
        window.removeEventListener("unhandledrejection", handleRejection);
      };
    }
  }, []);

  return (
    <PostHogProvider>
      <ConvexClientProvider>
        <WindowManagerProvider>
          <AuthProvider>
            <PermissionProvider>
              <TranslationProvider>
                <AppearanceProvider>
                  <ThemeProvider>
                    <UpgradeModalProvider>
                      <MediaSelectionProvider>
                        <ShoppingCartProvider>
                          {children}
                        </ShoppingCartProvider>
                      </MediaSelectionProvider>
                    </UpgradeModalProvider>
                  </ThemeProvider>
                </AppearanceProvider>
              </TranslationProvider>
            </PermissionProvider>
          </AuthProvider>
        </WindowManagerProvider>
      </ConvexClientProvider>
    </PostHogProvider>
  );
}
