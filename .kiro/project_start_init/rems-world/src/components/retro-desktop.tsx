"use client";

import React, { useState, useEffect } from "react";
import { useWindowManager } from "@/components/window-manager/useWindowManager";
import { Window } from "@/components/window-manager/Window";
import { getWindowRegistryEntry } from "@/window-registry";
import { useWallpaper } from "@/contexts/wallpaper-context";
import { SystemMenu } from "@/components/ui/system-menu";
import { 
  Avatar, 
  Folder, 
  Sliders, 
  Mail, 
  Code, 
  Calendar 
} from "@nsmr/pixelart-react";

// Client-only time component to avoid hydration issues
function ClientTime() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!time) return <span>--:--</span>;

  return <span>{time}</span>;
}

export function RetroDesktop() {
  const { windows, open } = useWindowManager();
  const { selectedWallpaperUrl } = useWallpaper();

  // Open About window on first load
  useEffect(() => {
    const hasOpenedAbout = sessionStorage.getItem("hasOpenedAbout");
    if (!hasOpenedAbout) {
      handleOpenWindow("about");
      sessionStorage.setItem("hasOpenedAbout", "true");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop apps configuration
  const desktopApps = [
    { pageId: "about", label: "About", IconComponent: Avatar },
    { pageId: "projects", label: "Projects", IconComponent: Folder },
    { pageId: "skills", label: "Skills", IconComponent: Sliders },
    { pageId: "contact", label: "Contact", IconComponent: Mail },
    { pageId: "terminal", label: "Terminal", IconComponent: Code },
    { pageId: "calendar-pro", label: "Calendar", IconComponent: Calendar },
  ];

  const handleOpenWindow = (pageId: string) => {
    const registryEntry = getWindowRegistryEntry(pageId);
    if (!registryEntry) return;

    open({
      pageId,
      title: registryEntry.title,
      size: registryEntry.defaultSize,
    });
  };

  return (
    <div
      className="fixed inset-0 desktop-bg desktop-crt"
      style={{
        backgroundImage: selectedWallpaperUrl ? `url(${selectedWallpaperUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Menu Bar */}
      <div className="menu-bar">
        <div className="flex items-center gap-0">
          <div className="menu-brand">VOUND!BRAND</div>
          <div className="flex items-center gap-4">
            <span className="menu-item">File</span>
            <span className="menu-item">Edit</span>
            <span className="menu-item">View</span>
            <SystemMenu
              onThemeClick={() => handleOpenWindow("theme-picker")}
              onAboutClick={() => handleOpenWindow("about")}
            />
            <span className="menu-item">Help</span>
          </div>
        </div>
        <div className="ml-auto text-xs">
          <ClientTime />
        </div>
      </div>

      {/* Desktop Icons */}
      <div className="absolute left-8 top-16 grid grid-cols-1 gap-3">
        {desktopApps.map((app) => {
          const registryEntry = getWindowRegistryEntry(app.pageId);
          if (!registryEntry) return null;

          const IconComponent = app.IconComponent;

          return (
            <div
              key={app.pageId}
              className="desktop-icon"
              onClick={() => handleOpenWindow(app.pageId)}
            >
              <div className="desktop-icon-box">
                <div className="desktop-icon-svg">
                  <IconComponent size={36} className="desktop-icon-component" />
                </div>
              </div>
              <span className="desktop-icon-label">{app.label}</span>
            </div>
          );
        })}
      </div>

      {/* Render Windows */}
      {windows.map((windowState) => {
        const registryEntry = getWindowRegistryEntry(windowState.pageId);
        if (!registryEntry) return null;

        const Component = registryEntry.component;

        return (
          <Window key={windowState.id} windowState={windowState}>
            <Component windowId={windowState.id} />
          </Window>
        );
      })}

      {/* Bottom Status Bar */}
      <div className="status-bar">
        <div className="flex gap-4">
          <span>
            {windows.length} window{windows.length !== 1 ? "s" : ""} open
          </span>
          <span>•</span>
          <span>Memory: 640KB</span>
          <span>•</span>
          <span>CPU: 8MHz</span>
        </div>
        <div className="ml-auto flex gap-4">
          <a href="#" className="hover:text-accent">
            About
          </a>
          <span>•</span>
          <a href="#" className="hover:text-accent">
            Help
          </a>
          <span>•</span>
          <a href="#" className="hover:text-accent">
            Shutdown
          </a>
        </div>
      </div>
    </div>
  );
}

export default RetroDesktop;
