"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";

// ============================================
// TYPES
// ============================================

export type DrawerTheme = "amber" | "blue" | "emerald" | "neutral";

export interface ProjectDrawerConfig {
  organizationId: Id<"organizations">;
  projectId: Id<"objects">;
  theme: DrawerTheme;
  drawerTitle?: string;
  triggerPosition?: "right" | "left";
  triggerOffset?: number;
  allowDownloads?: boolean;
  showAttendees?: boolean;
}

interface DrawerSession {
  sessionId: string;
  contactEmail: string;
  expiresAt: number;
}

interface ProjectDrawerContextValue {
  // Configuration
  config: ProjectDrawerConfig;

  // Drawer state
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Meeting detail modal
  selectedMeetingId: Id<"objects"> | null;
  openMeetingDetail: (meetingId: Id<"objects">) => void;
  closeMeetingDetail: () => void;

  // Authentication
  session: DrawerSession | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  setSession: (session: DrawerSession | null) => void;
  logout: () => void;

  // Theme utilities
  themeColors: ThemeColors;
}

interface ThemeColors {
  primary: string;
  primaryHover: string;
  accent: string;
  background: string;
  border: string;
}

const themeConfigs: Record<DrawerTheme, ThemeColors> = {
  amber: {
    primary: "#f0c142",
    primaryHover: "#d4a937",
    accent: "#92400e",
    background: "#fffbeb",
    border: "#fcd34d",
  },
  blue: {
    primary: "#0284c7",
    primaryHover: "#0369a1",
    accent: "#0c4a6e",
    background: "#f0f9ff",
    border: "#7dd3fc",
  },
  emerald: {
    primary: "#10b981",
    primaryHover: "#059669",
    accent: "#064e3b",
    background: "#ecfdf5",
    border: "#6ee7b7",
  },
  neutral: {
    primary: "#6b7280",
    primaryHover: "#4b5563",
    accent: "#1f2937",
    background: "#f9fafb",
    border: "#d1d5db",
  },
};

// ============================================
// CONTEXT
// ============================================

const ProjectDrawerContext = createContext<ProjectDrawerContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface ProjectDrawerProviderProps {
  children: ReactNode;
  config: ProjectDrawerConfig;
}

export function ProjectDrawerProvider({ children, config }: ProjectDrawerProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Drawer state
  const [isOpen, setIsOpen] = useState(false);

  // Selected meeting for detail modal
  const [selectedMeetingId, setSelectedMeetingId] = useState<Id<"objects"> | null>(null);

  // Auth state
  const [isAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Session state - loaded from localStorage on mount
  const [session, setSessionState] = useState<DrawerSession | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(`project_drawer_session_${config.organizationId}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as DrawerSession;

      // Check if expired
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(`project_drawer_session_${config.organizationId}`);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  });

  // Theme colors based on config
  const themeColors = themeConfigs[config.theme];

  // Clean auth-related URL params without full page reload
  const cleanUrlParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Remove all drawer auth params
    params.delete("drawer_auth_success");
    params.delete("drawer_session");
    params.delete("drawer_email");
    params.delete("drawer_expires");
    params.delete("drawer_auth_error");
    params.delete("drawer_auth_message");

    // Build new URL
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    // Replace URL without reload
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Handle magic link callback from URL params
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for auth success params
    const authSuccess = searchParams.get("drawer_auth_success");
    const sessionId = searchParams.get("drawer_session");
    const email = searchParams.get("drawer_email");
    const expiresAt = searchParams.get("drawer_expires");

    // Check for auth error params
    const authErrorParam = searchParams.get("drawer_auth_error");
    const authMessage = searchParams.get("drawer_auth_message");

    if (authSuccess === "true" && sessionId && email && expiresAt) {
      // Create session from URL params
      const newSession: DrawerSession = {
        sessionId,
        contactEmail: email,
        expiresAt: parseInt(expiresAt, 10),
      };

      // Save session
      setSessionState(newSession);
      localStorage.setItem(
        `project_drawer_session_${config.organizationId}`,
        JSON.stringify(newSession)
      );

      // Open drawer after successful auth
      setIsOpen(true);
      setAuthError(null);

      // Clean URL params
      cleanUrlParams();
    } else if (authErrorParam) {
      // Handle auth error
      setAuthError(authMessage || "Authentication failed");

      // Clean URL params
      cleanUrlParams();
    }
  }, [searchParams, config.organizationId, cleanUrlParams]);

  // Drawer actions
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  // Meeting detail actions
  const openMeetingDetail = useCallback((meetingId: Id<"objects">) => {
    setSelectedMeetingId(meetingId);
  }, []);

  const closeMeetingDetail = useCallback(() => {
    setSelectedMeetingId(null);
  }, []);

  // Session management
  const setSession = useCallback((newSession: DrawerSession | null) => {
    setSessionState(newSession);

    if (typeof window === "undefined") return;

    if (newSession) {
      localStorage.setItem(
        `project_drawer_session_${config.organizationId}`,
        JSON.stringify(newSession)
      );
    } else {
      localStorage.removeItem(`project_drawer_session_${config.organizationId}`);
    }
  }, [config.organizationId]);

  const logout = useCallback(() => {
    setSession(null);
    closeDrawer();
  }, [setSession, closeDrawer]);

  const value: ProjectDrawerContextValue = {
    config,
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    selectedMeetingId,
    openMeetingDetail,
    closeMeetingDetail,
    session,
    isAuthenticated: session !== null && Date.now() < (session.expiresAt || 0),
    isAuthenticating,
    authError,
    setSession,
    logout,
    themeColors,
  };

  return (
    <ProjectDrawerContext.Provider value={value}>
      {children}
    </ProjectDrawerContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useProjectDrawer(): ProjectDrawerContextValue {
  const context = useContext(ProjectDrawerContext);

  if (!context) {
    throw new Error("useProjectDrawer must be used within a ProjectDrawerProvider");
  }

  return context;
}
