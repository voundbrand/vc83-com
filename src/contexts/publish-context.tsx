"use client";

/**
 * PUBLISH CONTEXT
 *
 * State management for the publish configuration wizard.
 * Tracks the user's choices through the multi-step publish flow:
 * app info, capabilities, architecture, auth, payments, env vars, and review.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

export interface EnvVarConfig {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  /** Which feature/category requires this var */
  source: string;
}

export interface PublishConfig {
  // Step 1: App Info
  appName: string;
  repoName: string;
  description: string;
  isPrivate: boolean;

  // Step 2: Architecture
  architecture: "thin-client" | "full-stack" | "hybrid";

  // Step 3: Backend (only for full-stack/hybrid)
  backend: "convex" | "supabase" | "neon-drizzle" | "none";

  // Step 4: Auth
  auth: "none" | "l4yercak3-oauth" | "nextauth" | "clerk" | "supabase-auth";

  // Step 5: Payments
  payments: {
    stripe: boolean;
    l4yercak3Invoicing: boolean;
  };

  // From connect step (already selected)
  selectedCategories: string[];
  scopes: string[];

  // Computed env vars (built from selections)
  envVars: EnvVarConfig[];
}

export type PublishStep =
  | "app-info"
  | "capabilities"
  | "architecture"
  | "auth"
  | "payments"
  | "env-vars"
  | "review";

const PUBLISH_STEPS: PublishStep[] = [
  "app-info",
  "capabilities",
  "architecture",
  "auth",
  "payments",
  "env-vars",
  "review",
];

const DEFAULT_CONFIG: PublishConfig = {
  appName: "",
  repoName: "",
  description: "",
  isPrivate: true,
  architecture: "thin-client",
  backend: "none",
  auth: "none",
  payments: {
    stripe: false,
    l4yercak3Invoicing: false,
  },
  selectedCategories: [],
  scopes: [],
  envVars: [],
};

// ============================================================================
// ENV VAR COMPUTATION
// ============================================================================

/**
 * Compute required environment variables based on publish config selections.
 * This is the single source of truth for what env vars the deployed app needs.
 */
function computeEnvVars(config: PublishConfig): EnvVarConfig[] {
  const vars: EnvVarConfig[] = [];

  // Always needed for thin-client and hybrid
  if (config.architecture !== "full-stack" || config.selectedCategories.length > 0) {
    vars.push({
      key: "NEXT_PUBLIC_L4YERCAK3_URL",
      description: "l4yercak3 platform API base URL",
      required: true,
      defaultValue: "https://agreeable-lion-828.convex.site",
      source: "platform",
    });
    vars.push({
      key: "L4YERCAK3_API_KEY",
      description: "Server-side API key for l4yercak3 platform",
      required: true,
      source: "platform",
    });
    vars.push({
      key: "NEXT_PUBLIC_L4YERCAK3_ORG_ID",
      description: "Your l4yercak3 organization ID",
      required: true,
      source: "platform",
    });
  }

  // Stripe
  if (config.payments.stripe) {
    vars.push({
      key: "STRIPE_SECRET_KEY",
      description: "Stripe secret key for server-side operations",
      required: true,
      source: "stripe",
    });
    vars.push({
      key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      description: "Stripe publishable key for client-side",
      required: true,
      source: "stripe",
    });
    vars.push({
      key: "STRIPE_WEBHOOK_SECRET",
      description: "Stripe webhook signing secret",
      required: true,
      source: "stripe",
    });
  }

  // Auth: l4yercak3 OAuth
  if (config.auth === "l4yercak3-oauth") {
    vars.push({
      key: "L4YERCAK3_OAUTH_CLIENT_ID",
      description: "l4yercak3 OAuth client ID",
      required: true,
      source: "l4yercak3-oauth",
    });
    vars.push({
      key: "L4YERCAK3_OAUTH_CLIENT_SECRET",
      description: "l4yercak3 OAuth client secret",
      required: true,
      source: "l4yercak3-oauth",
    });
    vars.push({
      key: "NEXTAUTH_SECRET",
      description: "NextAuth.js session encryption secret",
      required: true,
      source: "l4yercak3-oauth",
    });
    vars.push({
      key: "NEXTAUTH_URL",
      description: "Your app's public URL (set by Vercel automatically)",
      required: true,
      defaultValue: "http://localhost:3000",
      source: "l4yercak3-oauth",
    });
  }

  // Auth: NextAuth
  if (config.auth === "nextauth") {
    vars.push({
      key: "NEXTAUTH_SECRET",
      description: "NextAuth.js session encryption secret",
      required: true,
      source: "nextauth",
    });
    vars.push({
      key: "NEXTAUTH_URL",
      description: "Your app's public URL",
      required: true,
      defaultValue: "http://localhost:3000",
      source: "nextauth",
    });
  }

  // Auth: Clerk
  if (config.auth === "clerk") {
    vars.push({
      key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      description: "Clerk publishable key",
      required: true,
      source: "clerk",
    });
    vars.push({
      key: "CLERK_SECRET_KEY",
      description: "Clerk secret key",
      required: true,
      source: "clerk",
    });
  }

  // Webhook secret (if any category that supports webhooks is selected)
  const webhookCategories = ["forms", "events", "products", "invoices", "bookings"];
  if (config.selectedCategories.some((c) => webhookCategories.includes(c))) {
    vars.push({
      key: "L4YERCAK3_WEBHOOK_SECRET",
      description: "Webhook signing secret for verifying platform events",
      required: true,
      source: "webhooks",
    });
  }

  return vars;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface PublishContextType {
  // Config state
  config: PublishConfig;
  updateConfig: (partial: Partial<PublishConfig>) => void;
  resetConfig: () => void;

  // Wizard navigation
  currentStep: PublishStep;
  currentStepIndex: number;
  totalSteps: number;
  goToStep: (step: PublishStep) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;
  isLastStep: boolean;
  isFirstStep: boolean;

  // Wizard visibility
  isWizardOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;

  // Computed values
  envVars: EnvVarConfig[];

  // Validation
  isStepValid: (step: PublishStep) => boolean;
  isConfigComplete: boolean;

  // Persistence
  /** Immediately save current config to Convex (call on step change, panel close, etc.) */
  saveNow: () => void;
}

const PublishContext = createContext<PublishContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface PublishProviderProps {
  children: ReactNode;
  /** Pre-fill categories from the connect step */
  initialCategories?: string[];
  /** Pre-fill scopes from the connect step */
  initialScopes?: string[];
  /** Pre-fill app name */
  initialAppName?: string;
  /** Builder app ID for persistence (load/save config to Convex) */
  builderAppId?: Id<"objects"> | null;
  /** Session ID for authenticated Convex calls */
  sessionId?: string | null;
}

export function PublishProvider({
  children,
  initialCategories = [],
  initialScopes = [],
  initialAppName = "",
  builderAppId,
  sessionId,
}: PublishProviderProps) {
  const [config, setConfig] = useState<PublishConfig>({
    ...DEFAULT_CONFIG,
    selectedCategories: initialCategories,
    scopes: initialScopes,
    appName: initialAppName,
    repoName: initialAppName
      ? initialAppName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
      : "",
  });

  const [currentStep, setCurrentStep] = useState<PublishStep>("app-info");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const hasLoadedPersistedConfig = useRef(false);
  const hasLoadedConnectionConfig = useRef(false);

  // Compute env vars whenever config changes
  const envVars = computeEnvVars(config);

  // ============================================================================
  // PERSISTENCE — Load saved config + connection config from Convex
  // ============================================================================

  // Query the builder app object to get connectionConfig (categories/scopes from Connect step)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const builderApp = useQuery(
    api.builderAppOntology.getBuilderApp,
    builderAppId && sessionId
      ? { sessionId, appId: builderAppId }
      : "skip"
  );

  // Query persisted publish config
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const persistedConfig = useQuery(
    api.builderAppOntology.getPublishConfig,
    builderAppId && sessionId
      ? { sessionId, appId: builderAppId }
      : "skip"
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const savePublishConfig = useMutation(api.builderAppOntology.savePublishConfig);

  // Load connection config from builder app (categories/scopes set during Connect step)
  useEffect(() => {
    if (hasLoadedConnectionConfig.current) return;
    if (!builderApp) return;

    hasLoadedConnectionConfig.current = true;

    const props = (builderApp.customProperties || {}) as Record<string, unknown>;
    const connConfig = props.connectionConfig as {
      selectedCategories?: string[];
      scopes?: string[];
    } | undefined;

    if (connConfig?.selectedCategories?.length) {
      setConfig((prev) => ({
        ...prev,
        // Use initial props if provided, otherwise pull from connectionConfig
        selectedCategories: initialCategories.length > 0
          ? initialCategories
          : connConfig.selectedCategories!,
        scopes: initialScopes.length > 0
          ? initialScopes
          : (connConfig.scopes || prev.scopes),
        // Pre-fill app name from builder app if not set
        appName: prev.appName || builderApp.name || "",
        repoName: prev.repoName || (builderApp.name
          ? builderApp.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
          : ""),
      }));
      console.log("[PublishProvider] Loaded connection config:", connConfig.selectedCategories);
    }
  }, [builderApp, initialCategories, initialScopes]);

  // Load persisted publish config (wizard selections like auth, payments, architecture)
  // persistedConfig is undefined while loading, null when no saved config exists
  useEffect(() => {
    if (hasLoadedPersistedConfig.current) return;
    // Wait for the query to resolve (undefined = loading, null = no data, object = data)
    if (persistedConfig === undefined) return;

    hasLoadedPersistedConfig.current = true;

    // If there's no saved config yet, that's fine — auto-save will create it
    if (!persistedConfig) {
      console.log("[PublishProvider] No persisted config yet, will auto-save on changes");
      return;
    }

    // Merge persisted config with connection data (connection data wins for categories/scopes)
    const loaded = persistedConfig as Partial<PublishConfig>;
    setConfig((prev) => ({
      ...prev,
      appName: loaded.appName || prev.appName,
      repoName: loaded.repoName || prev.repoName,
      description: loaded.description || prev.description,
      isPrivate: loaded.isPrivate ?? prev.isPrivate,
      architecture: loaded.architecture || prev.architecture,
      backend: loaded.backend || prev.backend,
      auth: loaded.auth || prev.auth,
      payments: loaded.payments || prev.payments,
      // Keep categories/scopes from connectionConfig (already loaded above) — they're the source of truth
      envVars: computeEnvVars({
        ...prev,
        ...loaded,
      } as PublishConfig),
    }));

    console.log("[PublishProvider] Loaded persisted publish config for app:", builderAppId);
  }, [persistedConfig, builderAppId]);

  // Immediate save function (no debounce)
  const saveConfigNow = useCallback(() => {
    if (!builderAppId || !sessionId || !hasLoadedPersistedConfig.current) return;
    const { envVars: _envVars, ...configToSave } = config;
    savePublishConfig({
      sessionId,
      appId: builderAppId,
      publishConfig: configToSave,
    }).catch((err) => {
      console.warn("[PublishProvider] Failed to save config:", err);
    });
  }, [config, builderAppId, sessionId, savePublishConfig]);

  // Debounced auto-save on config changes (for text input typing)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!builderAppId || !sessionId || !hasLoadedPersistedConfig.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveConfigNow();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [config, builderAppId, sessionId, saveConfigNow]);

  // Keep a ref to the latest save function for the unmount flush
  const saveConfigNowRef = useRef(saveConfigNow);
  saveConfigNowRef.current = saveConfigNow;

  // Flush pending save on unmount so closing the panel doesn't lose data
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveConfigNowRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStepIndex = PUBLISH_STEPS.indexOf(currentStep);

  const updateConfig = useCallback((partial: Partial<PublishConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...partial };
      // Auto-compute env vars
      updated.envVars = computeEnvVars(updated);
      return updated;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({
      ...DEFAULT_CONFIG,
      selectedCategories: initialCategories,
      scopes: initialScopes,
    });
    setCurrentStep("app-info");
  }, [initialCategories, initialScopes]);

  // Step validation
  const isStepValid = useCallback(
    (step: PublishStep): boolean => {
      switch (step) {
        case "app-info":
          return config.appName.trim().length > 0 && config.repoName.trim().length > 0;
        case "capabilities":
          return config.selectedCategories.length > 0;
        case "architecture":
          return true; // Always valid (has default)
        case "auth":
          return true; // "none" is a valid choice
        case "payments":
          return true; // No payments is valid
        case "env-vars":
          return true; // Read-only step
        case "review":
          return true; // If you got here, previous steps are valid
        default:
          return false;
      }
    },
    [config]
  );

  // Navigation
  const goToStep = useCallback((step: PublishStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < PUBLISH_STEPS.length) {
      // Skip backend step for thin-client architecture
      const targetStep = PUBLISH_STEPS[nextIndex];
      if (targetStep === "architecture" && config.architecture === "thin-client") {
        // For Phase 1, architecture is always thin-client, so we can skip it
        // But still show it so users understand the option exists
      }
      setCurrentStep(targetStep);
    }
  }, [currentStepIndex, config.architecture]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(PUBLISH_STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const openWizard = useCallback(() => setIsWizardOpen(true), []);
  const closeWizard = useCallback(() => setIsWizardOpen(false), []);

  const value: PublishContextType = {
    config,
    updateConfig,
    resetConfig,
    currentStep,
    currentStepIndex,
    totalSteps: PUBLISH_STEPS.length,
    goToStep,
    goNext,
    goBack,
    canGoNext: currentStepIndex < PUBLISH_STEPS.length - 1 && isStepValid(currentStep),
    canGoBack: currentStepIndex > 0,
    isLastStep: currentStepIndex === PUBLISH_STEPS.length - 1,
    isFirstStep: currentStepIndex === 0,
    isWizardOpen,
    openWizard,
    closeWizard,
    envVars,
    isStepValid,
    isConfigComplete:
      isStepValid("app-info") &&
      isStepValid("capabilities"),
    saveNow: saveConfigNow,
  };

  return (
    <PublishContext.Provider value={value}>{children}</PublishContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePublishConfig() {
  const context = useContext(PublishContext);
  if (context === undefined) {
    throw new Error("usePublishConfig must be used within a PublishProvider");
  }
  return context;
}
