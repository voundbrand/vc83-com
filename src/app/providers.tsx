"use client";

import { WindowManagerProvider } from "@/hooks/use-window-manager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WindowManagerProvider>
      {children}
    </WindowManagerProvider>
  );
}