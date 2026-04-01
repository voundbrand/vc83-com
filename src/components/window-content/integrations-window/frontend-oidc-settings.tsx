"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useNotification } from "@/hooks/use-notification";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

const DEFAULT_PROVIDER_ID = "frontend_oidc";
const DEFAULT_PROVIDER_NAME = "Organization OIDC";
const DEFAULT_EMAIL_VERIFIED_CLAIM = "email_verified";
const DEFAULT_REQUIRE_VERIFIED_EMAIL = true;

interface FrontendOidcSettingsProps {
  onBack: () => void;
}

interface FrontendOidcSettingsSnapshot {
  configured: boolean;
  enabled: boolean;
  providerId: string;
  providerName: string;
  clientId: string | null;
  hasClientSecret: boolean;
  clientSecretHint: string | null;
  issuer: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  scope: string | null;
  subClaim: string | null;
  emailClaim: string | null;
  emailVerifiedClaim: string | null;
  requireVerifiedEmail: boolean;
  nameClaim: string | null;
}

interface FrontendOidcPreflightResult {
  success: boolean;
  checks?: {
    scopeIncludesOpenid?: {
      status?: "pass" | "fail" | "warn";
      message?: string;
      configuredScope?: string;
    };
    pkceS256?: {
      status?: "pass" | "fail" | "warn";
      message?: string;
      codeChallengeMethod?: string | null;
    };
    authorizeScopeAcceptance?: {
      status?: "pass" | "fail" | "warn";
      message?: string;
      providerError?: string | null;
      providerErrorDescription?: string | null;
    };
    authorizeStateEcho?: {
      status?: "pass" | "fail" | "warn";
      message?: string;
      expectedState?: string | null;
      echoedState?: string | null;
    };
  };
  probe?: {
    status?: number | null;
    location?: string | null;
    warning?: string | null;
  };
}

export function FrontendOidcSettings({ onBack }: FrontendOidcSettingsProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();

  const organizationId = currentOrg?.id as Id<"organizations"> | undefined;
  const integration = useQuery(
    api.frontendOidc.getFrontendOidcIntegration,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  ) as FrontendOidcSettingsSnapshot | null | undefined;
  const saveIntegration = useMutation(api.frontendOidc.saveFrontendOidcIntegration);
  const runPreflight = useAction(api.frontendOidc.runFrontendOidcIntegrationPreflight);

  const [enabled, setEnabled] = useState(true);
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER_ID);
  const [providerName, setProviderName] = useState(DEFAULT_PROVIDER_NAME);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [issuer, setIssuer] = useState("");
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [userinfoUrl, setUserinfoUrl] = useState("");
  const [scope, setScope] = useState("openid profile email");
  const [subClaim, setSubClaim] = useState("sub");
  const [emailClaim, setEmailClaim] = useState("email");
  const [emailVerifiedClaim, setEmailVerifiedClaim] = useState(
    DEFAULT_EMAIL_VERIFIED_CLAIM
  );
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState(
    DEFAULT_REQUIRE_VERIFIED_EMAIL
  );
  const [nameClaim, setNameClaim] = useState("name");
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningPreflight, setIsRunningPreflight] = useState(false);
  const [preflightResult, setPreflightResult] =
    useState<FrontendOidcPreflightResult | null>(null);

  useEffect(() => {
    if (!integration) {
      return;
    }
    setEnabled(integration.enabled !== false);
    setProviderId(integration.providerId || DEFAULT_PROVIDER_ID);
    setProviderName(integration.providerName || DEFAULT_PROVIDER_NAME);
    setClientId(integration.clientId || "");
    setClientSecret("");
    setIssuer(integration.issuer || "");
    setAuthorizationUrl(integration.authorizationUrl || "");
    setTokenUrl(integration.tokenUrl || "");
    setUserinfoUrl(integration.userinfoUrl || "");
    setScope(integration.scope || "openid profile email");
    setSubClaim(integration.subClaim || "sub");
    setEmailClaim(integration.emailClaim || "email");
    setEmailVerifiedClaim(
      integration.emailVerifiedClaim || DEFAULT_EMAIL_VERIFIED_CLAIM
    );
    setRequireVerifiedEmail(integration.requireVerifiedEmail !== false);
    setNameClaim(integration.nameClaim || "name");
  }, [integration]);

  const isLoading = integration === undefined;
  const hasStoredSecret = integration?.hasClientSecret === true;

  const handleSave = async () => {
    if (!sessionId || !organizationId) {
      return;
    }

    const normalizedClientId = clientId.trim();
    const normalizedClientSecret = clientSecret.trim();
    const normalizedIssuer = issuer.trim();
    const normalizedAuthUrl = authorizationUrl.trim();
    const normalizedTokenUrl = tokenUrl.trim();
    const normalizedUserinfoUrl = userinfoUrl.trim();

    if (enabled) {
      if (!normalizedClientId) {
        notification.error("Missing Client ID", "Client ID is required when OIDC is enabled.");
        return;
      }

      if (!normalizedClientSecret && !hasStoredSecret) {
        notification.error(
          "Missing Client Secret",
          "Provide a client secret or keep an existing stored secret."
        );
        return;
      }

      const hasDiscovery = normalizedIssuer.length > 0;
      const hasExplicitEndpoints =
        normalizedAuthUrl.length > 0 &&
        normalizedTokenUrl.length > 0 &&
        normalizedUserinfoUrl.length > 0;
      if (!hasDiscovery && !hasExplicitEndpoints) {
        notification.error(
          "Missing OIDC Endpoints",
          "Set an issuer or all three explicit endpoints (authorization, token, userinfo)."
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      await saveIntegration({
        sessionId,
        organizationId,
        enabled,
        providerId,
        providerName,
        clientId,
        ...(normalizedClientSecret ? { clientSecret: normalizedClientSecret } : {}),
        issuer,
        authorizationUrl,
        tokenUrl,
        userinfoUrl,
        scope,
        subClaim,
        emailClaim,
        emailVerifiedClaim,
        requireVerifiedEmail,
        nameClaim,
      });
      setClientSecret("");
      notification.success("Saved", "Frontend OIDC integration updated.");
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Could not save frontend OIDC integration."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!sessionId || !organizationId) {
      return;
    }
    setIsSaving(true);
    try {
      await saveIntegration({
        sessionId,
        organizationId,
        enabled: false,
      });
      notification.success("Disabled", "Frontend OIDC integration disabled.");
    } catch (error) {
      notification.error(
        "Disable Failed",
        error instanceof Error ? error.message : "Could not disable frontend OIDC integration."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunPreflight = async () => {
    if (!sessionId || !organizationId) {
      return;
    }

    setIsRunningPreflight(true);
    try {
      const providerSlug = providerId.trim() || DEFAULT_PROVIDER_ID;
      const result = (await runPreflight({
        sessionId,
        organizationId,
        requestHost:
          typeof window !== "undefined" ? window.location.host : undefined,
        redirectUri:
          typeof window !== "undefined"
            ? `${window.location.origin}/api/auth/callback/${providerSlug}`
            : undefined,
        scope,
      })) as FrontendOidcPreflightResult;

      setPreflightResult(result);
      if (result?.success) {
        notification.success(
          "Preflight Passed",
          "Scope/PKCE/state checks are currently healthy."
        );
      } else {
        notification.error(
          "Preflight Failed",
          "OIDC preflight found one or more deterministic contract issues."
        );
      }
    } catch (error) {
      setPreflightResult(null);
      notification.error(
        "Preflight Failed",
        error instanceof Error
          ? error.message
          : "Could not run frontend OIDC preflight."
      );
    } finally {
      setIsRunningPreflight(false);
    }
  };

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--window-document-bg)" }}>
      <div
        className="flex items-center gap-3 border-b-2 px-4 py-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm hover:underline"
          style={{ color: "var(--tone-accent)" }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} style={{ color: "var(--tone-accent-strong)" }} />
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
              Frontend OIDC
            </h2>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Choose native platform auth or per-org custom OIDC
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded border-2 p-6"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
            }}
          >
            <Loader2 size={24} className="animate-spin" />
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Loading settings...
            </p>
          </div>
        ) : (
          <>
            <div
              className="rounded border-2 p-4"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2
                  size={16}
                  style={{
                    color:
                      integration?.enabled === false
                        ? "#2563eb"
                        : integration?.enabled && integration?.configured
                        ? "#10b981"
                        : "var(--neutral-gray)",
                  }}
                />
                <span
                  className="text-xs font-bold"
                  style={{
                    color:
                      integration?.enabled === false
                        ? "#2563eb"
                        : integration?.enabled && integration?.configured
                        ? "#10b981"
                        : "var(--neutral-gray)",
                  }}
                >
                  {integration?.enabled === false
                    ? "Platform Auth"
                    : integration?.enabled && integration?.configured
                    ? "Configured"
                    : integration?.enabled
                    ? "Enabled (incomplete)"
                    : "Disabled"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {hasStoredSecret
                  ? `Client secret stored${integration?.clientSecretHint ? ` (••••${integration.clientSecretHint})` : ""}.`
                  : "No client secret stored yet."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Authentication Mode
                </span>
                <select
                  value={enabled ? "oidc" : "platform"}
                  onChange={(event) => setEnabled(event.target.value === "oidc")}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  <option value="platform">Platform Auth (native)</option>
                  <option value="oidc">Custom OIDC</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Provider ID
                </span>
                <input
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Provider Name
                </span>
                <input
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Client ID
                </span>
                <input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Client Secret (leave empty to keep current)
              </span>
              <input
                type="password"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                className="border-2 px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder={hasStoredSecret ? "Stored secret available" : "Enter client secret"}
              />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Issuer (discovery)
                </span>
                <input
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                  placeholder="https://idp.example.com/realms/main"
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Authorization URL
                </span>
                <input
                  value={authorizationUrl}
                  onChange={(event) => setAuthorizationUrl(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Token URL
                </span>
                <input
                  value={tokenUrl}
                  onChange={(event) => setTokenUrl(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Userinfo URL
                </span>
                <input
                  value={userinfoUrl}
                  onChange={(event) => setUserinfoUrl(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Scope
                </span>
                <input
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Subject Claim
                </span>
                <input
                  value={subClaim}
                  onChange={(event) => setSubClaim(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Email Claim
                </span>
                <input
                  value={emailClaim}
                  onChange={(event) => setEmailClaim(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Email Verified Claim
                </span>
                <input
                  value={emailVerifiedClaim}
                  onChange={(event) => setEmailVerifiedClaim(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={requireVerifiedEmail}
                  onChange={(event) => setRequireVerifiedEmail(event.target.checked)}
                />
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Require Verified Email
                </span>
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Name Claim
                </span>
                <input
                  value={nameClaim}
                  onChange={(event) => setNameClaim(event.target.value)}
                  className="border-2 px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <InteriorButton onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Authentication Settings"
                )}
              </InteriorButton>
              <InteriorButton
                variant="secondary"
                onClick={handleDisable}
                disabled={isSaving}
                className="w-full"
              >
                Use Platform Auth
              </InteriorButton>
            </div>
            <InteriorButton
              variant="secondary"
              onClick={handleRunPreflight}
              disabled={isRunningPreflight || isSaving || !enabled}
              className="w-full"
            >
              {isRunningPreflight ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  Running Preflight...
                </>
              ) : (
                "Run OIDC Preflight"
              )}
            </InteriorButton>

            {preflightResult ? (
              <div
                className="rounded border-2 p-4 text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p className="mb-2 font-bold" style={{ color: "var(--window-document-text)" }}>
                  Preflight Result: {preflightResult.success ? "PASS" : "FAIL"}
                </p>
                <p style={{ color: "var(--neutral-gray)" }}>
                  Scope: {preflightResult.checks?.scopeIncludesOpenid?.status || "n/a"} | PKCE:{" "}
                  {preflightResult.checks?.pkceS256?.status || "n/a"} | State Echo:{" "}
                  {preflightResult.checks?.authorizeStateEcho?.status || "n/a"} | Scope Accept:{" "}
                  {preflightResult.checks?.authorizeScopeAcceptance?.status || "n/a"}
                </p>
                {preflightResult.checks?.authorizeScopeAcceptance?.providerError ? (
                  <p className="mt-2" style={{ color: "#b91c1c" }}>
                    Provider error: {preflightResult.checks.authorizeScopeAcceptance.providerError}
                    {preflightResult.checks.authorizeScopeAcceptance.providerErrorDescription
                      ? ` (${preflightResult.checks.authorizeScopeAcceptance.providerErrorDescription})`
                      : ""}
                  </p>
                ) : null}
                {preflightResult.probe?.warning ? (
                  <p className="mt-2" style={{ color: "#b45309" }}>
                    Probe warning: {preflightResult.probe.warning}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
