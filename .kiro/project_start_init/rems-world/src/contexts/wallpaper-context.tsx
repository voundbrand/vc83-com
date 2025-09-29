"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface Wallpaper {
  _id: Id<"wallpapers">;
  _creationTime: number;
  name: string;
  category: "abstract" | "nature" | "geometric" | "retro" | "solid";
  storageId: string;
  thumbnailStorageId?: string;
  dominantColor?: string;
  order?: number;
  createdAt: number;
  url?: string;
  thumbnailUrl?: string;
}

interface WallpaperContextValue {
  selectedWallpaperId: string | null;
  selectedWallpaperUrl: string | null;
  setWallpaper: (wallpaperId: string) => void;
  wallpapers: Wallpaper[];
  isLoading: boolean;
}

const WallpaperContext = createContext<WallpaperContextValue | null>(null);

const WALLPAPER_STORAGE_KEY = "rem-world-wallpaper";

// Default wallpaper using the storage ID you provided
const DEFAULT_WALLPAPER_ID = "wallpaper1";

// Map of wallpaper IDs to storage IDs (from environment variables)
const WALLPAPER_STORAGE_MAP: Record<string, string> = {
  wallpaper1: process.env.NEXT_PUBLIC_WALLPAPER_1_STORAGE_ID || "",
  wallpaper2: process.env.NEXT_PUBLIC_WALLPAPER_2_STORAGE_ID || "",
  wallpaper3: process.env.NEXT_PUBLIC_WALLPAPER_3_STORAGE_ID || "",
};

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [selectedWallpaperId, setSelectedWallpaperId] = useState<string | null>(
    DEFAULT_WALLPAPER_ID,
  );
  const [selectedWallpaperUrl, setSelectedWallpaperUrl] = useState<string | null>(null);

  // Query wallpapers from Convex
  // Commenting out for now as we're using hardcoded wallpapers
  // const wallpapers = useQuery(api.wallpapers.getAll) ?? [];
  const wallpapers: Wallpaper[] = [];
  const isLoading = false;

  // Get wallpaper URL from Convex storage
  const storageId =
    selectedWallpaperId && WALLPAPER_STORAGE_MAP[selectedWallpaperId]
      ? WALLPAPER_STORAGE_MAP[selectedWallpaperId]
      : null;

  const wallpaperUrl = useQuery(api.wallpapers.getWallpaperUrl, storageId ? { storageId } : "skip");

  // Debug logging
  if (typeof window !== 'undefined' && storageId) {
    console.log('Wallpaper Context:', {
      selectedWallpaperId,
      storageId,
      wallpaperUrl,
      WALLPAPER_STORAGE_MAP
    });
  }

  // Load wallpaper preference from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedWallpaperId = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (savedWallpaperId) {
      setSelectedWallpaperId(savedWallpaperId);
    }
  }, []);

  // Update wallpaper URL when query resolves
  useEffect(() => {
    if (wallpaperUrl) {
      setSelectedWallpaperUrl(wallpaperUrl);
    }
  }, [wallpaperUrl]);

  const setWallpaper = (wallpaperId: string) => {
    setSelectedWallpaperId(wallpaperId);
    localStorage.setItem(WALLPAPER_STORAGE_KEY, wallpaperId);
  };

  return (
    <WallpaperContext.Provider
      value={{
        selectedWallpaperId,
        selectedWallpaperUrl,
        setWallpaper,
        wallpapers,
        isLoading,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper() {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error("useWallpaper must be used within a WallpaperProvider");
  }
  return context;
}
