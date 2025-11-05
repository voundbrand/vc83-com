"use client";

import { WindowManagerProvider } from "@/hooks/use-window-manager";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/hooks/use-auth";
import { PermissionProvider } from "@/contexts/permission-context";
import { TranslationProvider } from "@/contexts/translation-context";
import { MediaSelectionProvider } from "@/contexts/media-selection-context";
import { PostHogProvider } from "@/components/providers/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ConvexClientProvider>
        <WindowManagerProvider>
          <AuthProvider>
            <PermissionProvider>
              <TranslationProvider>
                <ThemeProvider>
                  <MediaSelectionProvider>
                    {children}
                  </MediaSelectionProvider>
                </ThemeProvider>
              </TranslationProvider>
            </PermissionProvider>
          </AuthProvider>
        </WindowManagerProvider>
      </ConvexClientProvider>
    </PostHogProvider>
  );
}