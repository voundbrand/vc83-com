"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { WindowManagerProvider } from "@/hooks/use-window-manager";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <WindowManagerProvider>
        {children}
      </WindowManagerProvider>
    </ConvexProvider>
  );
}