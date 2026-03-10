"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Smartphone, Hourglass, PartyPopper, Clipboard, Download, UserRound, Lock, Layers, X } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { startAuthentication } from "@simplewebauthn/browser";
import { PasskeyEncouragementBanner } from "@/components/passkey-encouragement-banner";
import { FirstLoginPasskeyModal } from "@/components/first-login-passkey-modal";
import { captureRefCode, getRefCode, clearRefCode } from "@/lib/affiliate-capture";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function LoginWindow() {
  type OAuthProvider = "apple" | "microsoft" | "google" | "github";

  const [mode, setMode] = useState<"check" | "signin" | "setup" | "signup">("check");
  const [guestSignupHandoffActive, setGuestSignupHandoffActive] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [betaCode, setBetaCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showPasskeySetupPrompt, setShowPasskeySetupPrompt] = useState(false);
  const hasAppliedLoginDeepLinkRef = useRef(false);
  const [signupSuccess, setSignupSuccess] = useState<{
    apiKey: string;
    apiKeyPrefix: string;
    organization: { name: string };
    sessionId: string;
    betaAccessStatus?: "pending" | "approved";
  } | null>(null);

  const { user, isSignedIn, signIn, setupPassword, checkNeedsPasswordSetup, signOut, sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.login");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>,
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  // Check if beta access gating is enabled
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const betaGatingStatus = useQuery(api.betaAccess.getBetaGatingStatus);
  const betaGateEnabled = betaGatingStatus?.enabled === true;
  const betaCodeAutoApproveEnabled =
    (betaGatingStatus as {
      rollout?: { supportsBetaCodeAutoApprove?: boolean };
    } | undefined)?.rollout?.supportsBetaCodeAutoApprove === true;

  // Capture affiliate referral code from ?ref= URL parameter on mount
  useEffect(() => {
    captureRefCode();
  }, []);

  // Deep-link auth handoffs can prefill login/signup fields and jump to the proper mode.
  useEffect(() => {
    if (typeof window === "undefined" || hasAppliedLoginDeepLinkRef.current) return;
    hasAppliedLoginDeepLinkRef.current = true;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const prefillToken = (params.get("prefill") || "").trim();
      let shouldCleanup = false;

      type SignedPrefillData = {
        email?: string;
        firstName?: string;
        lastName?: string;
        organizationName?: string;
        betaCode?: string;
        authMode?: "check" | "signin" | "setup" | "signup";
        autoCheck?: boolean;
      };

      let signedPrefill: SignedPrefillData | null = null;

      if (prefillToken.length > 0) {
        shouldCleanup = true;
        try {
          const response = await fetch(
            `/api/auth/prefill/resolve?token=${encodeURIComponent(prefillToken)}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data?.valid && data?.prefill && typeof data.prefill === "object") {
              signedPrefill = data.prefill as SignedPrefillData;
            }
          }
        } catch (error) {
          console.error("[Login] Failed to resolve signed prefill token:", error);
        }
      }

      const signedEmail = typeof signedPrefill?.email === "string" ? signedPrefill.email : "";
      const signedFirstName = typeof signedPrefill?.firstName === "string" ? signedPrefill.firstName : "";
      const signedLastName = typeof signedPrefill?.lastName === "string" ? signedPrefill.lastName : "";
      const signedOrganizationName =
        typeof signedPrefill?.organizationName === "string" ? signedPrefill.organizationName : "";
      const signedBetaCode = typeof signedPrefill?.betaCode === "string" ? signedPrefill.betaCode : "";
      const signedAuthMode = typeof signedPrefill?.authMode === "string" ? signedPrefill.authMode : "";
      const signedAutoCheck = signedPrefill?.autoCheck === true;

      const requestedMode = (
        signedAuthMode
        || params.get("authMode")
        || ""
      ).trim().toLowerCase();
      const requestedBetaCode = (
        signedBetaCode
        || params.get("betaCode")
        || params.get("beta_code")
        || ""
      ).trim();
      const requestedEmail = (
        signedEmail
        || params.get("email")
        || params.get("emailAddress")
        || ""
      ).trim();
      const requestedFirstName = (
        signedFirstName
        || params.get("firstName")
        || params.get("first_name")
        || ""
      ).trim();
      const requestedLastName = (
        signedLastName
        || params.get("lastName")
        || params.get("last_name")
        || ""
      ).trim();
      const requestedOrganizationName = (
        signedOrganizationName
        || params.get("organizationName")
        || params.get("organization_name")
        || params.get("company")
        || ""
      ).trim();
      const autoCheckRaw = (params.get("autoCheck") || params.get("autoContinue") || "").trim().toLowerCase();
      const shouldAutoCheck = signedAutoCheck || autoCheckRaw === "1" || autoCheckRaw === "true" || autoCheckRaw === "yes";

      if (requestedEmail.length > 0) {
        setEmail(requestedEmail);
        shouldCleanup = true;
      }

      if (requestedFirstName.length > 0) {
        setFirstName(requestedFirstName);
        shouldCleanup = true;
      }

      if (requestedLastName.length > 0) {
        setLastName(requestedLastName);
        shouldCleanup = true;
      }

      if (requestedOrganizationName.length > 0) {
        setOrganizationName(requestedOrganizationName);
        shouldCleanup = true;
      }

      if (requestedMode === "signup") {
        setMode("signup");
        setGuestSignupHandoffActive(true);
        shouldCleanup = true;
      } else if (requestedMode === "setup") {
        setMode("setup");
        setWelcomeUser(requestedFirstName || requestedEmail || null);
        shouldCleanup = true;
      } else if (requestedMode === "signin") {
        setMode("signin");
        shouldCleanup = true;
      } else if (requestedMode === "check") {
        setMode("check");
        shouldCleanup = true;
      }

      if (requestedBetaCode.length > 0) {
        setMode("signup");
        setBetaCode(requestedBetaCode);
        setGuestSignupHandoffActive(true);
        shouldCleanup = true;
      }

      if (shouldAutoCheck && requestedEmail.length > 0) {
        setError("");
        setLoading(true);
        shouldCleanup = true;
        try {
          const result = await checkNeedsPasswordSetup(requestedEmail);

          if (!result.userExists) {
            setMode("check");
            setError(tx("ui.login.error_no_account", "No account found with this email"));
          } else if (result.needsSetup) {
            setMode("setup");
            setWelcomeUser(result.userName || requestedFirstName || requestedEmail);
          } else {
            setMode("signin");
          }
        } catch (err) {
          setMode("check");
          setError(err instanceof Error ? err.message : tx("ui.login.error_generic", "Something went wrong"));
        } finally {
          setLoading(false);
        }
      }

      if (!shouldCleanup) return;

      [
        "prefill",
        "authMode",
        "betaCode",
        "beta_code",
        "email",
        "emailAddress",
        "firstName",
        "first_name",
        "lastName",
        "last_name",
        "organizationName",
        "organization_name",
        "company",
        "autoCheck",
        "autoContinue",
      ].forEach((key) => params.delete(key));

      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    })();
  }, [checkNeedsPasswordSetup, tx]);

  // Get last used OAuth provider from localStorage
  const getLastUsedProvider = (): OAuthProvider | null => {
    if (typeof window === "undefined") return null;
    const lastUsed = localStorage.getItem("l4yercak3_last_oauth_provider");
    if (lastUsed && ["apple", "microsoft", "google", "github"].includes(lastUsed)) {
      return lastUsed as OAuthProvider;
    }
    return null;
  };

  const getGuestClaimToken = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    const token = localStorage.getItem("l4yercak3_native_guest_claim_token");
    if (!token) return undefined;
    const normalized = token.trim();
    return normalized.length > 0 ? normalized : undefined;
  };

  // Store last used provider
  const setLastUsedProvider = (provider: OAuthProvider) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("l4yercak3_last_oauth_provider", provider);
    }
  };

  // Handle OAuth login/signup
  const handleOAuth = (provider: OAuthProvider) => {
    setLastUsedProvider(provider);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const refcode = getRefCode();
    const params = new URLSearchParams({
      provider,
      sessionType: "platform",
    });

    if (refcode) {
      params.set("referrer", refcode);
    }

    if (mode === "signup") {
      const normalizedBetaCode = betaCode.trim();
      const normalizedOrganizationName = organizationName.trim();
      if (normalizedBetaCode.length > 0) {
        params.set("betaCode", normalizedBetaCode);
      }
      if (normalizedOrganizationName.length > 0) {
        params.set("organizationName", normalizedOrganizationName);
      }

      if (guestSignupHandoffActive) {
        const identityClaimToken = getGuestClaimToken();
        if (identityClaimToken) {
          params.set("identityClaimToken", identityClaimToken);
          params.set("onboardingChannel", "native_guest");
        }
      }
    }

    const oauthUrl = `${appUrl}/api/auth/oauth-signup?${params.toString()}`;
    window.location.href = oauthUrl;
  };

  // Get all providers, with last used first
  const getAllProviders = (): OAuthProvider[] => {
    const lastUsed = getLastUsedProvider();
    const allProviders: OAuthProvider[] = ["apple", "google", "github", "microsoft"];
    
    if (lastUsed) {
      // Move last used to front
      const filtered = allProviders.filter(p => p !== lastUsed);
      return [lastUsed, ...filtered];
    }
    
    return allProviders;
  };

  const getProviderButtonClass = (provider: OAuthProvider) => {
    const base = "w-full flex items-center justify-center gap-2 px-4 py-2 rounded beveled-button transition-colors";
    if (provider === "apple") return `${base} bg-black hover:bg-[#111] text-white`;
    if (provider === "github") return `${base} bg-[#24292e] hover:bg-[#1a1e22] text-white`;
    if (provider === "microsoft") return `${base} bg-[#0078d4] hover:bg-[#006cbe] text-white`;
    return `${base} bg-white hover:bg-gray-50 text-gray-700 border border-gray-300`;
  };

  const getLastUsedBadgeClass = (provider: OAuthProvider) => {
    if (provider === "apple") return "bg-black text-white border-white";
    if (provider === "github") return "bg-[#24292e] text-white border-white";
    if (provider === "microsoft") return "bg-[#0078d4] text-white border-white";
    return "bg-white text-gray-700 border-gray-300";
  };

  const getProviderDisplayName = (provider: OAuthProvider) => {
    if (provider === "apple") {
      return tx("ui.login.provider.apple", "Apple");
    }
    if (provider === "github") {
      return tx("ui.login.provider.github", "GitHub");
    }
    if (provider === "microsoft") {
      return tx("ui.login.provider.microsoft", "Microsoft");
    }
    return tx("ui.login.provider.google", "Google");
  };

  const getContinueWithProviderLabel = (provider: OAuthProvider) => {
    const providerName = getProviderDisplayName(provider);
    return tx(
      "ui.login.oauth.continue_with",
      `Continue with ${providerName}`,
      { provider: providerName },
    );
  };

  const getProviderIcon = (provider: OAuthProvider) => {
    if (provider === "apple") {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16.37 1.43c0 1.13-.42 2.26-1.23 3.08-.84.86-2.17 1.51-3.35 1.47-.15-1.12.43-2.29 1.22-3.11.88-.9 2.3-1.54 3.36-1.44zM20.8 17.3c-.56 1.27-.82 1.84-1.55 2.95-1 1.55-2.42 3.5-4.17 3.51-1.56.02-1.96-1.01-4.08-1.01-2.13.01-2.56 1.04-4.13 1.01-1.74-.02-3.1-1.78-4.1-3.33-2.8-4.29-3.1-9.32-1.36-11.97C2.64 6.56 4.57 5.45 6.4 5.45c1.84 0 3.01 1.02 4.52 1.02 1.48 0 2.37-1.02 4.52-1.02 1.61 0 3.34.88 4.56 2.41-4.01 2.2-3.37 7.93.8 9.44z" />
        </svg>
      );
    }
    if (provider === "github") {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    }
    if (provider === "microsoft") {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    );
  };

  const handleCheckEmail = async () => {
    if (!email) {
      setError(t('ui.login.error_email_required'));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await checkNeedsPasswordSetup(email);

      if (!result.userExists) {
        setError(t('ui.login.error_no_account'));
        setLoading(false);
        return;
      }

      if (result.needsSetup) {
        setWelcomeUser(result.userName || email);
        setMode("setup");
      } else {
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ui.login.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ui.login.error_invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  // Check if passwords match in real-time
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (password && value) {
      setPasswordMatch(password === value);
    } else {
      setPasswordMatch(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (confirmPassword && value) {
      setPasswordMatch(confirmPassword === value);
    } else {
      setPasswordMatch(null);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('ui.login.error_passwords_mismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('ui.login.error_password_length'));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await setupPassword(email, password, firstName || undefined, lastName || undefined);
      // Mark as first login to show passkey setup modal
      setIsFirstLogin(true);
      setShowFirstLoginModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ui.login.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError("");
    setPasskeyLoading(true);

    try {
      // Step 1: Get authentication challenge from server
      const challengeResponse = await fetch("/api/passkeys/authenticate/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();

        // Handle specific error: no passkey configured
        if (errorData.code === "NO_PASSKEY_CONFIGURED") {
          setShowPasskeySetupPrompt(true);
          return;
        }

        throw new Error(errorData.error || "Failed to start passkey authentication");
      }

      const options = await challengeResponse.json();

      // Step 2: Prompt user for biometric authentication
      let authResponse;
      try {
        authResponse = await startAuthentication(options);
      } catch (webAuthnError) {
        // User cancelled or biometric failed
        if (webAuthnError instanceof Error && webAuthnError.name === "NotAllowedError") {
          throw new Error("Authentication was cancelled");
        }
        throw new Error("Biometric authentication failed. Please try again or use your password.");
      }

      // Step 3: Verify authentication with server
      const verifyResponse = await fetch("/api/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          response: authResponse,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Authentication verification failed");
      }

      const result = await verifyResponse.json();

      if (result.success && result.sessionId) {
        // Store the session ID directly (passkey creates a valid session)
        localStorage.setItem("convex_session_id", result.sessionId);
        // Reload the page to trigger auth context update
        window.location.reload();
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey authentication failed");
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t('ui.login.error_passwords_mismatch'));
      return;
    }

    if (!agreedToTerms) {
      setError(t('ui.login.error_terms_required') || "You must agree to the terms to continue");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Call signup mutation via Convex HTTP endpoint (.convex.site)
      const apiUrl = process.env.NEXT_PUBLIC_API_ENDPOINT_URL;
      if (!apiUrl) {
        throw new Error("API endpoint URL not configured. Please check NEXT_PUBLIC_API_ENDPOINT_URL.");
      }

      console.log("Signing up with API URL:", apiUrl);

      const refcode = getRefCode();

      const response = await fetch(`${apiUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          organizationName: organizationName || undefined,
          betaCode: betaCode || undefined,
          identityClaimToken: guestSignupHandoffActive ? getGuestClaimToken() : undefined,
          refcode: refcode || undefined,
        }),
      });

      // Parse response body once
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response text:", responseText);

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse JSON response:", responseText);
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Signup failed with status ${response.status}`);
      }

      // Store session ID
      localStorage.setItem("convex_session_id", result.sessionId);

      // Track signup for affiliate attribution (fire-and-forget)
      if (refcode) {
        fetch("/api/affiliate/track-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: result.sessionId,
            email,
            name: `${firstName} ${lastName}`.trim(),
            refcode,
          }),
        }).catch(() => {
          // Silently ignore tracking errors
        });
        clearRefCode();
      }

      // Show onboarding with API key
      setSignupSuccess({
        apiKey: result.apiKey,
        apiKeyPrefix: result.apiKeyPrefix,
        organization: result.organization,
        sessionId: result.sessionId,
        betaAccessStatus: result.betaAccessStatus,
      });

      // Clear form
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setOrganizationName("");
      setBetaCode("");
      setAgreedToTerms(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setOrganizationName("");
    setBetaCode("");
    setAgreedToTerms(false);
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordMatch(null);
  };

  // Show onboarding window after successful signup
  if (signupSuccess) {
    const pendingApproval =
      signupSuccess.betaAccessStatus
        ? signupSuccess.betaAccessStatus === "pending"
        : Boolean(betaGatingStatus?.enabled);

    return (
      <div className="h-full flex flex-col desktop-shell-surface p-6">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            {pendingApproval ? (
              <Hourglass className="w-14 h-14" />
            ) : (
              <PartyPopper className="w-14 h-14" />
            )}
          </div>
          <h2 className="font-pixel text-xl desktop-shell-text mb-2">
            {pendingApproval
              ? tx("ui.login.signup_success.beta_access_requested", "Beta Access Requested")
              : tx("ui.login.signup_success.welcome", "Welcome to sevenlayers.io!")}
          </h2>
          <p className="text-sm desktop-shell-text-muted">
            {pendingApproval
              ? tx(
                  "ui.login.signup_success.pending_copy",
                  "Your account has been created. You'll need approval to access the platform.",
                )
              : tx(
                  "ui.login.signup_success.ready_copy",
                  "Your account is ready. Here's your API key to connect external tools.",
                )}
          </p>
        </div>

        {/* Beta Access Warning */}
        {pendingApproval && (
          <div className="desktop-shell-note mb-4" style={{background: 'var(--warning-bg)', borderColor: 'var(--warning)'}}>
            <p className="text-sm mb-2">
              <strong>{tx("ui.login.signup_success.awaiting_approval", "Awaiting Approval")}</strong>
            </p>
            <p className="text-xs">
              {tx(
                "ui.login.signup_success.pending_review_window",
                "We'll review your request within 24-48 hours. You'll receive an email confirmation once approved. Keep your API key safe for when you get access.",
              )}
            </p>
          </div>
        )}

        {!pendingApproval && (
          <div className="desktop-shell-note mb-4" style={{background: 'var(--info-bg)', borderColor: 'var(--info)'}}>
            <strong>{tx("ui.login.signup_success.api_key_purpose_title", "What's this for?")}</strong>{" "}
            {tx(
              "ui.login.signup_success.api_key_purpose_body",
              "Use this API key to connect your apps, scripts, or integrations to sevenlayers.io. It authenticates your requests to our API.",
            )}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-xs font-pixel mb-2 desktop-shell-text">
            {tx("ui.login.signup_success.api_key_label", "Your API Key")}
          </label>
          <div className="p-3 font-mono text-sm break-all" style={{background: 'var(--shell-button-surface)', border: '2px inset var(--shell-border)'}}>
            {signupSuccess.apiKey}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(signupSuccess.apiKey);
              // Could add a toast notification here
            }}
            className="flex-1 beveled-button py-2"
          >
            <span className="font-pixel text-xs flex items-center justify-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5" />
              {tx("ui.login.signup_success.copy_api_key", "Copy to Clipboard")}
            </span>
          </button>

          <button
            onClick={() => {
              const apiEndpointUrl = process.env.NEXT_PUBLIC_API_ENDPOINT_URL || 'https://agreeable-lion-828.convex.site';
              const envContent = `# L4YERCAK3 API Configuration
L4YERCAK3_API_KEY=${signupSuccess.apiKey}
L4YERCAK3_API_URL=${apiEndpointUrl}
`;
              const blob = new Blob([envContent], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = ".env.example";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex-1 beveled-button py-2"
          >
            <span className="font-pixel text-xs flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {tx("ui.login.signup_success.download_env", "Download .env File")}
            </span>
          </button>
        </div>

        <div className="text-xs desktop-shell-text-muted mb-4 text-center">
          {tx(
            "ui.login.signup_success.api_keys_manage_prefix",
            "You can always view and manage your API keys later in",
          )}{" "}
          <strong>{tx("ui.login.signup_success.api_keys_manage_location", "Settings -> Integrations")}</strong>
        </div>

        <div className="desktop-shell-note mb-6">
          <h3 className="font-pixel text-sm mb-2">
            {tx("ui.login.signup_success.account_details_title", "Account Details:")}
          </h3>
          <div className="text-xs space-y-1">
            <p>
              {tx("ui.login.signup_success.account_details.organization", "Organization:")}{" "}
              <strong>{signupSuccess.organization.name}</strong>
            </p>
            <p>
              {tx("ui.login.signup_success.account_details.plan", "Plan:")}{" "}
              <strong>{tx("ui.login.signup_success.account_details.plan_free", "Free")}</strong>
            </p>
            <p>
              {tx("ui.login.signup_success.account_details.api_keys", "API Keys:")}{" "}
              <strong>{tx("ui.login.signup_success.account_details.api_keys_usage", "1/1 used")}</strong>
            </p>
            <p>
              {tx("ui.login.signup_success.account_details.contacts", "Contacts:")}{" "}
              <strong>{tx("ui.login.signup_success.account_details.contacts_usage", "0/100 available")}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            // Set flag to show onboarding tutorial after page reload
            localStorage.setItem("show_onboarding_tutorial", "true");
            // Reload page to trigger auth context update
            window.location.reload();
          }}
          className="w-full beveled-button py-3"
        >
          <span className="font-pixel">
            {tx("ui.login.signup_success.continue_to_dashboard", "Continue to Dashboard ->")}
          </span>
        </button>
      </div>
    );
  }

  if (isSignedIn && user) {
    return (
      <div className="h-full flex flex-col p-6 desktop-shell-surface">
        {/* Show passkey encouragement banner if user doesn't have passkey */}
        {!user.hasPasskey && sessionId && !isFirstLogin && (
          <PasskeyEncouragementBanner sessionId={sessionId} />
        )}

        {/* First login modal for passkey setup */}
        {showFirstLoginModal && sessionId && (
          <FirstLoginPasskeyModal
            sessionId={sessionId}
            userName={user.firstName || undefined}
            onClose={() => {
              setShowFirstLoginModal(false);
              setIsFirstLogin(false);
            }}
            onPasskeySetup={() => {
              setShowFirstLoginModal(false);
              setIsFirstLogin(false);
            }}
          />
        )}

        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-2">
            <div className="mb-4 flex justify-center">
              <UserRound className="w-14 h-14" />
            </div>
            <h2 className="font-pixel text-lg desktop-shell-text">
              {t('ui.login.welcome', { name: user.firstName || user.email })}
            </h2>
            <p className="text-sm desktop-shell-text-muted">
              {t('ui.login.status_logged_in')}
              {user.isSuperAdmin && (
                <span className="ml-2 font-bold" style={{ color: 'var(--success)' }}>
                  [{tx("ui.login.user.super_admin_badge", "SUPER ADMIN")}]
                </span>
              )}
              {user.currentOrganization?.role && !user.isSuperAdmin && (
                <span className="ml-2" style={{ color: 'var(--info)' }}>[{user.currentOrganization.role.name.toUpperCase()}]</span>
              )}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-sm space-y-1 desktop-shell-text-muted">
              <p>{t('ui.login.label_email')}: {user.email}</p>
              <p>{t('ui.login.label_user_id')}: {user.id}</p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="beveled-button px-6 py-2"
          >
            <span className="font-pixel text-xs">{t('ui.login.button_sign_out')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Email check mode (initial state)
  if (mode === "check") {
    const lastUsedProvider = getLastUsedProvider();
    const allProviders = getAllProviders();
    const otherProviders = lastUsedProvider ? allProviders.filter(p => p !== lastUsedProvider) : allProviders;

    return (
      <div className="h-full flex flex-col desktop-shell-surface">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="mb-2 flex justify-center">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="font-pixel text-lg desktop-shell-text">
                {t('ui.login.title_system_access')}
              </h2>
              <p className="text-xs mt-2 desktop-shell-text-muted">
                {t('ui.login.subtitle_enter_email')}
              </p>
            </div>

            {/* Beta Access Notice */}
            {betaGateEnabled && (
              <div className="desktop-shell-note mb-4" style={{background: 'var(--info-bg)', borderColor: 'var(--info)'}}>
                <p className="text-xs">
                  <strong>{tx("ui.login.check.private_beta_label", "Private Beta:")}</strong>{" "}
                  {betaCodeAutoApproveEnabled
                    ? tx(
                        "ui.login.check.private_beta_autoapprove_copy",
                        "New signups require approval unless a valid beta code is provided.",
                      )
                    : tx(
                        "ui.login.check.private_beta_manual_copy",
                        "New signups require approval before accessing the platform.",
                      )}
                </p>
              </div>
            )}

            {error && (
              <div className="desktop-shell-error mb-4">
                {error}
              </div>
            )}

            {/* OAuth Login Buttons - Last Used First */}
            {lastUsedProvider && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuth(lastUsedProvider)}
                  className={`relative ${getProviderButtonClass(lastUsedProvider)} font-semibold`}
                >
                  {/* Last Used Badge */}
                  <span className={`absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 shadow-md ${getLastUsedBadgeClass(lastUsedProvider)}`}>
                    {t('ui.login.last_used')}
                  </span>
                  {getProviderIcon(lastUsedProvider)}
                  {getContinueWithProviderLabel(lastUsedProvider)}
                </button>
              </div>
            )}

            {/* All OAuth Options */}
            <div className="space-y-2 mb-4">
              {otherProviders.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleOAuth(provider)}
                  className={getProviderButtonClass(provider)}
                >
                  {getProviderIcon(provider)}
                  {getContinueWithProviderLabel(provider)}
                </button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white desktop-shell-text-muted">
                  {tx("ui.login.common.or", "or")}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {t('ui.login.label_email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                  className="w-full desktop-shell-input"
                  placeholder={t('ui.login.placeholder_email')}
                />
              </div>

              <button
                onClick={handleCheckEmail}
                disabled={loading || !email}
                className="w-full beveled-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading ? t('ui.login.button_checking') : t('ui.login.button_continue')}
                </span>
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs desktop-shell-text-muted mb-2">
                {tx("ui.login.check.no_account_prompt", "Don't have an account?")}
              </p>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setMode("signup");
                }}
                className="font-pixel text-xs underline desktop-shell-text"
              >
                {tx("ui.login.check.create_free_account", "Create Free Account")}
              </a>
            </div>

            <div className="mt-6 desktop-shell-note">
              <p className="text-xs">
                <strong>{tx("ui.login.check.note_label", "Note:")}</strong>{" "}
                {tx(
                  "ui.login.check.note_invited_users",
                  "Invited users can sign in above. Free accounts get 100 contacts, 1 API key, and 250MB storage.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signup mode (self-service account creation)
  if (mode === "signup") {
    const lastUsedProvider = getLastUsedProvider();
    const allProviders = getAllProviders();
    const otherProviders = lastUsedProvider ? allProviders.filter(p => p !== lastUsedProvider) : allProviders;

    return (
      <div className="h-full flex flex-col desktop-shell-surface">
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="text-center mb-6">
                <div className="mb-2 flex justify-center">
                  <Layers className="w-10 h-10" />
                </div>
                <h2 className="font-pixel text-lg desktop-shell-text">
                  {betaGateEnabled
                    ? tx("ui.login.signup.title_beta_access", "Apply for Beta Access")
                    : tx("ui.login.signup.title_start_building", "Start Building with sevenlayers.io")}
                </h2>
                <p className="text-xs mt-2 desktop-shell-text-muted">
                  {betaGateEnabled
                    ? betaCodeAutoApproveEnabled
                      ? tx(
                          "ui.login.signup.subtitle_beta_code",
                          "Request access or activate instantly with a valid beta code",
                        )
                      : tx("ui.login.signup.subtitle_private_beta", "Request access to our private beta")
                    : tx("ui.login.signup.subtitle_free_tier", "100 contacts - 1 API key - Free forever")}
                </p>
              </div>

              {/* Beta Access Notice */}
              {betaGateEnabled && (
                <div className="desktop-shell-note mb-4" style={{background: 'var(--warning-bg)', borderColor: 'var(--warning)'}}>
                  <p className="text-xs">
                    <strong>{tx("ui.login.signup.beta_access_required", "Beta Access Required:")}</strong>{" "}
                    {betaCodeAutoApproveEnabled
                      ? tx(
                          "ui.login.signup.beta_access_code_required",
                          "Without a valid beta code, you'll need admin approval before platform access.",
                        )
                      : tx(
                          "ui.login.signup.beta_access_manual_approval",
                          "Your account will be created, but admin approval is still required before platform access.",
                        )}
                  </p>
                </div>
              )}

              {error && (
                <div className="desktop-shell-error">
                  {error}
                </div>
              )}

              {/* OAuth Signup Buttons - Last Used First */}
              {lastUsedProvider && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => handleOAuth(lastUsedProvider)}
                    className={`relative ${getProviderButtonClass(lastUsedProvider)} font-semibold`}
                  >
                    {/* Last Used Badge */}
                    <span className={`absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 shadow-md ${getLastUsedBadgeClass(lastUsedProvider)}`}>
                      {t('ui.login.last_used')}
                    </span>
                    {getProviderIcon(lastUsedProvider)}
                    {getContinueWithProviderLabel(lastUsedProvider)}
                  </button>
                </div>
              )}

              {/* All OAuth Options */}
              <div className="space-y-2 mb-4">
                {otherProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => handleOAuth(provider)}
                    className={getProviderButtonClass(provider)}
                  >
                    {getProviderIcon(provider)}
                    {getContinueWithProviderLabel(provider)}
                  </button>
                ))}
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white desktop-shell-text-muted">
                    {tx("ui.login.common.or", "or")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                    {tx("ui.login.signup.label_first_name", "First Name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full desktop-shell-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                    {tx("ui.login.signup.label_last_name", "Last Name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full desktop-shell-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {tx("ui.login.signup.label_email", "Email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full desktop-shell-input"
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {tx("ui.login.signup.label_password", "Password")}
                </label>
                <div className="desktop-shell-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full desktop-shell-input"
                    placeholder={tx("ui.login.signup.placeholder_password", "Min. 8 characters")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="desktop-shell-eye-toggle"
                    aria-label={
                      showPassword
                        ? tx("ui.login.aria_hide_password", "Hide password")
                        : tx("ui.login.aria_show_password", "Show password")
                    }
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {tx("ui.login.signup.label_confirm_password", "Confirm Password")}
                </label>
                <div className="desktop-shell-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className="w-full desktop-shell-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="desktop-shell-eye-toggle"
                    aria-label={
                      showConfirmPassword
                        ? tx("ui.login.aria_hide_password", "Hide password")
                        : tx("ui.login.aria_show_password", "Show password")
                    }
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {passwordMatch !== null && (
                  <p className={passwordMatch ? "desktop-shell-validation-success" : "desktop-shell-validation-error"}>
                    {passwordMatch
                      ? tx("ui.login.signup.validation_passwords_match", "Passwords match")
                      : tx("ui.login.signup.validation_passwords_mismatch", "Passwords don't match")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {tx("ui.login.signup.label_organization_name", "Organization Name (optional)")}
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full desktop-shell-input"
                  placeholder={tx(
                    "ui.login.signup.placeholder_organization",
                    `${firstName || tx("ui.login.signup.placeholder_org_owner", "Your")}'s Organization`,
                    {
                      owner: firstName || tx("ui.login.signup.placeholder_org_owner", "Your"),
                    },
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {tx("ui.login.signup.label_beta_code", "Beta Code (optional)")}
                </label>
                <input
                  type="text"
                  value={betaCode}
                  onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                  className="w-full desktop-shell-input"
                  placeholder={tx("ui.login.signup.placeholder_beta_code", "BNI-PSW-001")}
                />
                <p className="text-[11px] mt-1 desktop-shell-text-muted">
                  {betaCodeAutoApproveEnabled
                    ? tx(
                        "ui.login.signup.beta_code_autoapprove_enabled",
                        "Valid beta codes skip manual approval while beta gate is enabled.",
                      )
                    : tx(
                        "ui.login.signup.beta_code_autoapprove_disabled",
                        "Beta-code auto-approval is currently in legacy/manual mode and can be enabled during rollout.",
                      )}
                </p>
              </div>

              <div className="desktop-shell-note">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs">
                    {tx("ui.login.signup.terms.prefix", "I agree to the")}{" "}
                    <a href="/terms" target="_blank" className="underline">
                      {tx("ui.login.signup.terms.terms_of_service", "Terms of Service")}
                    </a>{" "}
                    {tx("ui.login.signup.terms.and", "and")}{" "}
                    <a href="/privacy" target="_blank" className="underline">
                      {tx("ui.login.signup.terms.privacy_policy", "Privacy Policy")}
                    </a>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreedToTerms || !passwordMatch}
                className="w-full beveled-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading
                    ? tx("ui.login.signup.button_creating_account", "Creating Account...")
                    : tx("ui.login.signup.button_create_free_account", "Create Free Account")}
                </span>
              </button>
            </form>

            <button
              onClick={() => {
                setMode("check");
                resetForm();
              }}
              className="mt-4 beveled-button beveled-button-sm"
            >
              <span>←</span>
              <span className="font-pixel">{tx("ui.login.signup.button_back", "Back")}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password setup mode (first time login)
  if (mode === "setup") {
    return (
      <div className="h-full flex flex-col desktop-shell-surface">
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div className="text-center mb-6">
                <div className="mb-2 flex justify-center">
                  <Layers className="w-10 h-10" />
                </div>
                <h2 className="font-pixel text-lg desktop-shell-text">
                  {t('ui.login.title_welcome')}
                </h2>
                <p className="text-sm mt-2 desktop-shell-text-muted">
                  {welcomeUser ? t('ui.login.subtitle_hello', { name: welcomeUser }) + ' ' : ''}{t('ui.login.subtitle_setup_password')}
                </p>
              </div>

              {error && (
                <div className="desktop-shell-error">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {t('ui.login.label_first_name')}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full desktop-shell-input"
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {t('ui.login.label_last_name')}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full desktop-shell-input"
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {t('ui.login.label_password')}
                </label>
                <div className="desktop-shell-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full desktop-shell-input"
                    placeholder={t('ui.login.placeholder_password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="desktop-shell-eye-toggle"
                    aria-label={showPassword ? t('ui.login.aria_hide_password') : t('ui.login.aria_show_password')}
                  >
                    {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                  {t('ui.login.label_confirm_password')}
                </label>
                <div className="desktop-shell-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className="w-full desktop-shell-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="desktop-shell-eye-toggle"
                    aria-label={showConfirmPassword ? t('ui.login.aria_hide_password') : t('ui.login.aria_show_password')}
                  >
                    {showConfirmPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                {passwordMatch !== null && (
                  <p className={passwordMatch ? "desktop-shell-validation-success" : "desktop-shell-validation-error"}>
                    {passwordMatch ? t('ui.login.validation_passwords_match') : t('ui.login.validation_passwords_mismatch')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full beveled-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading ? t('ui.login.button_setting_up') : t('ui.login.button_set_password')}
                </span>
              </button>
            </form>

            <button
              onClick={() => {
                setMode("check");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setError("");
                setShowPassword(false);
                setShowConfirmPassword(false);
                setPasswordMatch(null);
              }}
              className="mt-4 beveled-button beveled-button-sm"
            >
              <span>←</span>
              <span className="font-pixel">{t('ui.login.button_back')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sign in mode (returning user)
  const lastUsedProviderSignin = getLastUsedProvider();
  const allProvidersSignin = getAllProviders();
  const otherProvidersSignin = lastUsedProviderSignin ? allProvidersSignin.filter(p => p !== lastUsedProviderSignin) : allProvidersSignin;

  return (
    <div className="h-full flex flex-col desktop-shell-surface">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="text-center mb-6">
              <div className="mb-2 flex justify-center">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="font-pixel text-lg desktop-shell-text">
                {t('ui.login.title_sign_in')}
              </h2>
              <p className="text-sm mt-2 desktop-shell-text-muted">
                {email}
              </p>
            </div>

            {error && (
              <div className="desktop-shell-error">
                {error}
              </div>
            )}

            {/* OAuth Login Buttons - Last Used First */}
            {lastUsedProviderSignin && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuth(lastUsedProviderSignin)}
                  className={`relative ${getProviderButtonClass(lastUsedProviderSignin)} font-semibold`}
                >
                  {/* Last Used Badge */}
                  <span className={`absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 shadow-md ${getLastUsedBadgeClass(lastUsedProviderSignin)}`}>
                    {t('ui.login.last_used')}
                  </span>
                  {getProviderIcon(lastUsedProviderSignin)}
                  {getContinueWithProviderLabel(lastUsedProviderSignin)}
                </button>
              </div>
            )}

            {/* All OAuth Options */}
            <div className="space-y-2 mb-4">
              {otherProvidersSignin.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleOAuth(provider)}
                  className={getProviderButtonClass(provider)}
                >
                  {getProviderIcon(provider)}
                  {getContinueWithProviderLabel(provider)}
                </button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white desktop-shell-text-muted">
                  {tx("ui.login.common.or", "or")}
                </span>
              </div>
            </div>

            {/* Passkey Setup Prompt Modal */}
            {showPasskeySetupPrompt && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center"
                style={{ background: "var(--modal-overlay-bg)" }}
                onClick={() => setShowPasskeySetupPrompt(false)}
              >
                <div
                  className="border-4 max-w-md w-full mx-4"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-surface)',
                    boxShadow: "var(--modal-shadow)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Titlebar */}
                  <div
                    className="px-3 py-2 flex items-center justify-between border-b-2"
                    style={{
                      background: "var(--shell-titlebar-gradient)",
                      borderColor: "var(--shell-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 border"
                        style={{
                          background: "var(--shell-window-icon-bg)",
                          borderColor: "var(--shell-window-icon-border)",
                        }}
                      />
                      <span className="text-xs font-bold" style={{ color: "var(--shell-titlebar-text)" }}>
                        {t('ui.login.passkey_setup_required.title')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPasskeySetupPrompt(false)}
                      className="beveled-button w-5 h-5 flex items-center justify-center hover:opacity-80"
                      style={{
                        background: "var(--shell-button-surface)",
                      }}
                    >
                      <X className="w-3 h-3" style={{ color: "var(--shell-text)" }} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4" style={{ background: 'var(--shell-surface)' }}>
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <Lock className="w-12 h-12" />
                      </div>
                      <h3 className="font-pixel text-sm mb-2" style={{ color: 'var(--shell-text)' }}>
                        {t('ui.login.passkey_setup_required.heading')}
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--neutral-gray)' }}>
                        {t('ui.login.passkey_setup_required.description')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPasskeySetupPrompt(false)}
                        className="beveled-button flex-1 px-4 py-2 text-xs font-bold"
                        style={{
                          background: "var(--shell-accent)",
                          color: "white",
                        }}
                      >
                        <span className="font-pixel">{t('ui.login.passkey_setup_required.button_use_password')}</span>
                      </button>
                    </div>

                    <div
                      className="p-3 border-l-4 text-xs"
                      style={{
                        background: 'var(--shell-button-surface)',
                        borderColor: 'var(--info)',
                        color: 'var(--shell-text)'
                      }}
                    >
                      <strong>{t('ui.login.passkey_setup_required.tip_title')}</strong> {t('ui.login.passkey_setup_required.tip_description')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-pixel mb-1 desktop-shell-text">
                {t('ui.login.label_password')}
              </label>
              <div className="desktop-shell-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full desktop-shell-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="desktop-shell-eye-toggle"
                  aria-label={showPassword ? t('ui.login.aria_hide_password') : t('ui.login.aria_show_password')}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full beveled-button py-2"
            >
              <span className="font-pixel text-xs">
                {loading ? t('ui.login.button_signing_in') : t('ui.login.button_sign_in')}
              </span>
            </button>
          </form>

          {/* Passkey Login Option */}
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--shell-border)' }}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 desktop-shell-surface desktop-shell-text-muted">
                  {tx("ui.login.common.or", "or")}
                </span>
              </div>
            </div>

            <button
              onClick={handlePasskeyLogin}
              disabled={loading || passkeyLoading}
              className="w-full beveled-button py-2 mt-4"
              style={{ background: 'var(--info)' }}
            >
              <span className="font-pixel text-xs flex items-center justify-center gap-2">
                <Smartphone size={14} />
                {passkeyLoading
                  ? tx("ui.login.signin.passkey_authenticating", "Authenticating...")
                  : tx("ui.login.signin.passkey_button", "Sign in with Face ID / Touch ID")}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              setMode("check");
              setEmail("");
              setPassword("");
              setError("");
              setShowPassword(false);
            }}
            className="mt-4 beveled-button beveled-button-sm"
          >
            <span>←</span>
            <span className="font-pixel">{t('ui.login.button_use_different_email')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
