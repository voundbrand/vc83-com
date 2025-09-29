"use client";

import { WindowManagerProvider } from "@/components/window-manager/useWindowManager";
import { RetroDesktop } from "@/components/retro-desktop";

export default function Home() {
  return (
    <WindowManagerProvider>
      <RetroDesktop />
    </WindowManagerProvider>
  );
}
