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
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ShoppingCartProvider } from "@/contexts/shopping-cart-context";
import { UpgradeModalProvider } from "@/components/ui/upgrade-prompt";

const HMR_CONSOLE_ERROR_PATCH_KEY = "__vc83_hmr_console_error_patch__" as const;

type ConsoleErrorPatchState = {
  originalError: typeof console.error;
  refCount: number;
};

type ConsoleWithPatchState = Console & {
  [HMR_CONSOLE_ERROR_PATCH_KEY]?: ConsoleErrorPatchState;
};

function isSuppressedHmrMessage(message: string): boolean {
  return (
    message.includes("unrecognized HMR message") ||
    message.includes('{"event":"ping"}')
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Suppress noisy HMR ping errors in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const patchedConsole = console as ConsoleWithPatchState;
      const existingPatch = patchedConsole[HMR_CONSOLE_ERROR_PATCH_KEY];

      if (existingPatch) {
        existingPatch.refCount += 1;
      } else {
        const originalError = console.error;
        console.error = (...args: unknown[]) => {
          const message = String(args[0] ?? "");
          if (isSuppressedHmrMessage(message)) {
            return;
          }
          originalError.apply(console, args);
        };
        patchedConsole[HMR_CONSOLE_ERROR_PATCH_KEY] = {
          originalError,
          refCount: 1,
        };
      }

      const handleRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason as { message?: string } | string | undefined;
        const message = typeof reason === "string"
          ? reason
          : reason?.message ?? "";
        if (isSuppressedHmrMessage(message)) {
          event.preventDefault();
        }
      };
      window.addEventListener("unhandledrejection", handleRejection);

      return () => {
        const patch = patchedConsole[HMR_CONSOLE_ERROR_PATCH_KEY];
        if (patch) {
          patch.refCount -= 1;
          if (patch.refCount <= 0) {
            console.error = patch.originalError;
            delete patchedConsole[HMR_CONSOLE_ERROR_PATCH_KEY];
          }
        }
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
                          <CookieConsentBanner />
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
