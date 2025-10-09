"use client";

import { WindowManagerProvider } from "@/hooks/use-window-manager";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/hooks/use-auth";
import { PermissionProvider } from "@/contexts/permission-context";
import { TranslationProvider } from "@/contexts/translation-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <AuthProvider>
        <PermissionProvider>
          <TranslationProvider>
            <ThemeProvider>
              <WindowManagerProvider>
                {children}
              </WindowManagerProvider>
            </ThemeProvider>
          </TranslationProvider>
        </PermissionProvider>
      </AuthProvider>
    </ConvexClientProvider>
  );
}