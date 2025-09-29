"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { ThemeProvider } from "@/contexts/theme-context";
import { WallpaperProvider } from "@/contexts/wallpaper-context";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://grand-mosquito-986.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <WallpaperProvider>{children}</WallpaperProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
