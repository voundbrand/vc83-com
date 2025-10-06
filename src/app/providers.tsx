"use client";

import { WindowManagerProvider } from "@/hooks/use-window-manager";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/hooks/use-auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <AuthProvider>
        <ThemeProvider>
          <WindowManagerProvider>
            {children}
          </WindowManagerProvider>
        </ThemeProvider>
      </AuthProvider>
    </ConvexClientProvider>
  );
}