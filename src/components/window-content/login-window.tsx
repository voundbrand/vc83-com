"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Smartphone, Hourglass, PartyPopper, Clipboard, Download, UserRound, Lock, Cake, X } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { startAuthentication } from "@simplewebauthn/browser";
import { PasskeyEncouragementBanner } from "@/components/passkey-encouragement-banner";
import { FirstLoginPasskeyModal } from "@/components/first-login-passkey-modal";
import { captureRefCode, getRefCode, clearRefCode } from "@/lib/affiliate-capture";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function LoginWindow() {
  const [mode, setMode] = useState<"check" | "signin" | "setup" | "signup">("check");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
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
  const [signupSuccess, setSignupSuccess] = useState<{apiKey: string; apiKeyPrefix: string; organization: { name: string }; sessionId: string} | null>(null);

  const { user, isSignedIn, signIn, setupPassword, checkNeedsPasswordSetup, signOut, sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.login");

  // Check if beta access gating is enabled
  const betaGatingStatus = useQuery(api.betaAccess.getBetaGatingStatus);

  // Capture affiliate referral code from ?ref= URL parameter on mount
  useEffect(() => {
    captureRefCode();
  }, []);

  // Get last used OAuth provider from localStorage
  const getLastUsedProvider = (): "microsoft" | "google" | "github" | null => {
    if (typeof window === "undefined") return null;
    const lastUsed = localStorage.getItem("l4yercak3_last_oauth_provider");
    if (lastUsed && ["microsoft", "google", "github"].includes(lastUsed)) {
      return lastUsed as "microsoft" | "google" | "github";
    }
    return null;
  };

  // Store last used provider
  const setLastUsedProvider = (provider: "microsoft" | "google" | "github") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("l4yercak3_last_oauth_provider", provider);
    }
  };

  // Handle OAuth login/signup
  const handleOAuth = (provider: "microsoft" | "google" | "github") => {
    setLastUsedProvider(provider);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const refcode = getRefCode();
    const oauthUrl = `${appUrl}/api/auth/oauth-signup?provider=${provider}&sessionType=platform${refcode ? `&ref=${encodeURIComponent(refcode)}` : ""}`;
    window.location.href = oauthUrl;
  };

  // Get all providers, with last used first
  const getAllProviders = (): Array<"microsoft" | "google" | "github"> => {
    const lastUsed = getLastUsedProvider();
    const allProviders: Array<"microsoft" | "google" | "github"> = ["github", "microsoft", "google"];
    
    if (lastUsed) {
      // Move last used to front
      const filtered = allProviders.filter(p => p !== lastUsed);
      return [lastUsed, ...filtered];
    }
    
    return allProviders;
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
      });

      // Clear form
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setOrganizationName("");
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
    setAgreedToTerms(false);
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordMatch(null);
  };

  // Show onboarding window after successful signup
  if (signupSuccess) {
    return (
      <div className="h-full flex flex-col retro-bg p-6">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            {betaGatingStatus?.enabled ? (
              <Hourglass className="w-14 h-14" />
            ) : (
              <PartyPopper className="w-14 h-14" />
            )}
          </div>
          <h2 className="font-pixel text-xl retro-text mb-2">
            {betaGatingStatus?.enabled ? "Beta Access Requested" : "Welcome to l4yercak3!"}
          </h2>
          <p className="text-sm retro-text-secondary">
            {betaGatingStatus?.enabled
              ? "Your account has been created. You'll need approval to access the platform."
              : "Your account is ready. Here's your API key to connect external tools."}
          </p>
        </div>

        {/* Beta Access Warning */}
        {betaGatingStatus?.enabled && (
          <div className="retro-note mb-4" style={{background: 'var(--warning-bg)', borderColor: 'var(--warning)'}}>
            <p className="text-sm mb-2">
              <strong>Awaiting Approval</strong>
            </p>
            <p className="text-xs">
              We'll review your request within 24-48 hours. You'll receive an email confirmation once approved. Keep your API key safe for when you get access.
            </p>
          </div>
        )}

        {!betaGatingStatus?.enabled && (
          <div className="retro-note mb-4" style={{background: 'var(--info-bg)', borderColor: 'var(--info)'}}>
            <strong>What's this for?</strong> Use this API key to connect your apps, scripts, or integrations to l4yercak3. It authenticates your requests to our API.
          </div>
        )}

        <div className="mb-6">
          <label className="block text-xs font-pixel mb-2 retro-text">
            Your API Key
          </label>
          <div className="p-3 font-mono text-sm break-all" style={{background: 'var(--win95-button-face)', border: '2px inset var(--win95-border)'}}>
            {signupSuccess.apiKey}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(signupSuccess.apiKey);
              // Could add a toast notification here
            }}
            className="flex-1 retro-button py-2"
          >
            <span className="font-pixel text-xs flex items-center justify-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5" />
              Copy to Clipboard
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
            className="flex-1 retro-button py-2"
          >
            <span className="font-pixel text-xs flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download .env File
            </span>
          </button>
        </div>

        <div className="text-xs retro-text-secondary mb-4 text-center">
          You can always view and manage your API keys later in <strong>Settings → Integrations</strong>
        </div>

        <div className="retro-note mb-6">
          <h3 className="font-pixel text-sm mb-2">Account Details:</h3>
          <div className="text-xs space-y-1">
            <p>Organization: <strong>{signupSuccess.organization.name}</strong></p>
            <p>Plan: <strong>Free</strong></p>
            <p>API Keys: <strong>1/1 used</strong></p>
            <p>Contacts: <strong>0/100 available</strong></p>
          </div>
        </div>

        <button
          onClick={() => {
            // Set flag to show onboarding tutorial after page reload
            localStorage.setItem("show_onboarding_tutorial", "true");
            // Reload page to trigger auth context update
            window.location.reload();
          }}
          className="w-full retro-button py-3"
        >
          <span className="font-pixel">Continue to Dashboard →</span>
        </button>
      </div>
    );
  }

  if (isSignedIn && user) {
    return (
      <div className="h-full flex flex-col p-6 retro-bg">
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
            <h2 className="font-pixel text-lg retro-text">
              {t('ui.login.welcome', { name: user.firstName || user.email })}
            </h2>
            <p className="text-sm retro-text-secondary">
              {t('ui.login.status_logged_in')}
              {user.isSuperAdmin && (
                <span className="ml-2 font-bold" style={{ color: 'var(--success)' }}>[SUPER ADMIN]</span>
              )}
              {user.currentOrganization?.role && !user.isSuperAdmin && (
                <span className="ml-2" style={{ color: 'var(--info)' }}>[{user.currentOrganization.role.name.toUpperCase()}]</span>
              )}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-sm space-y-1 retro-text-secondary">
              <p>{t('ui.login.label_email')}: {user.email}</p>
              <p>{t('ui.login.label_user_id')}: {user.id}</p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="retro-button px-6 py-2"
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
      <div className="h-full flex flex-col retro-bg">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="mb-2 flex justify-center">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="font-pixel text-lg retro-text">
                {t('ui.login.title_system_access')}
              </h2>
              <p className="text-xs mt-2 retro-text-secondary">
                {t('ui.login.subtitle_enter_email')}
              </p>
            </div>

            {/* Beta Access Notice */}
            {betaGatingStatus?.enabled && (
              <div className="retro-note mb-4" style={{background: 'var(--info-bg)', borderColor: 'var(--info)'}}>
                <p className="text-xs">
                  <strong>Private Beta:</strong> We're currently in private beta. New signups will require approval before accessing the platform.
                </p>
              </div>
            )}

            {error && (
              <div className="retro-error mb-4">
                {error}
              </div>
            )}

            {/* OAuth Login Buttons - Last Used First */}
            {lastUsedProvider && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuth(lastUsedProvider)}
                  className="relative w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#9F7AEA] hover:bg-[#8B6BC7] text-white rounded retro-button transition-colors font-semibold"
                >
                  {/* Last Used Badge */}
                  <span className="absolute -top-2 -right-2 bg-[#9F7AEA] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md">
                    {t('ui.login.last_used')}
                  </span>
                  {lastUsedProvider === "github" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  {lastUsedProvider === "microsoft" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                  )}
                  {lastUsedProvider === "google" && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with {lastUsedProvider === "github" ? "GitHub" : lastUsedProvider === "microsoft" ? "Microsoft" : "Google"}
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
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded retro-button transition-colors ${
                    provider === "github"
                      ? "bg-[#24292e] hover:bg-[#1a1e22] text-white"
                      : provider === "microsoft"
                      ? "bg-[#0078d4] hover:bg-[#006cbe] text-white"
                      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                  }`}
                >
                  {provider === "github" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  {provider === "microsoft" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                  )}
                  {provider === "google" && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with {provider === "github" ? "GitHub" : provider === "microsoft" ? "Microsoft" : "Google"}
                </button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white retro-text-secondary">or</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  {t('ui.login.label_email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                  className="w-full retro-input"
                  placeholder={t('ui.login.placeholder_email')}
                />
              </div>

              <button
                onClick={handleCheckEmail}
                disabled={loading || !email}
                className="w-full retro-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading ? t('ui.login.button_checking') : t('ui.login.button_continue')}
                </span>
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs retro-text-secondary mb-2">
                Don't have an account?
              </p>
              <button
                onClick={() => setMode("signup")}
                className="retro-button-small"
              >
                <span className="font-pixel text-xs">Create Free Account →</span>
              </button>
            </div>

            <div className="mt-6 retro-note">
              <p className="text-xs">
                <strong>Note:</strong> Invited users can sign in above. Free accounts get 100 contacts, 1 API key, and 250MB storage.
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
      <div className="h-full flex flex-col retro-bg">
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="text-center mb-6">
                <div className="mb-2 flex justify-center">
                  <Cake className="w-10 h-10" />
                </div>
                <h2 className="font-pixel text-lg retro-text">
                  {betaGatingStatus?.enabled ? "Apply for Beta Access" : "Start Building with l4yercak3"}
                </h2>
                <p className="text-xs mt-2 retro-text-secondary">
                  {betaGatingStatus?.enabled
                    ? "Request access to our private beta"
                    : "100 contacts • 1 API key • Free forever"}
                </p>
              </div>

              {/* Beta Access Notice */}
              {betaGatingStatus?.enabled && (
                <div className="retro-note mb-4" style={{background: 'var(--warning-bg)', borderColor: 'var(--warning)'}}>
                  <p className="text-xs">
                    <strong>Beta Access Required:</strong> Your account will be created, but you'll need admin approval before accessing the platform. We'll email you when approved.
                  </p>
                </div>
              )}

              {error && (
                <div className="retro-error">
                  {error}
                </div>
              )}

              {/* OAuth Signup Buttons - Last Used First */}
              {lastUsedProvider && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => handleOAuth(lastUsedProvider)}
                    className="relative w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#9F7AEA] hover:bg-[#8B6BC7] text-white rounded retro-button transition-colors font-semibold"
                  >
                    {/* Last Used Badge */}
                    <span className="absolute -top-2 -right-2 bg-[#9F7AEA] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md">
                      {t('ui.login.last_used')}
                    </span>
                    {lastUsedProvider === "github" && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    )}
                    {lastUsedProvider === "microsoft" && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                      </svg>
                    )}
                    {lastUsedProvider === "google" && (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with {lastUsedProvider === "github" ? "GitHub" : lastUsedProvider === "microsoft" ? "Microsoft" : "Google"}
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
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded retro-button transition-colors ${
                      provider === "github"
                        ? "bg-[#24292e] hover:bg-[#1a1e22] text-white"
                        : provider === "microsoft"
                        ? "bg-[#0078d4] hover:bg-[#006cbe] text-white"
                        : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                    }`}
                  >
                    {provider === "github" && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    )}
                    {provider === "microsoft" && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                      </svg>
                    )}
                    {provider === "google" && (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with {provider === "github" ? "GitHub" : provider === "microsoft" ? "Microsoft" : "Google"}
                  </button>
                ))}
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white retro-text-secondary">or</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-pixel mb-1 retro-text">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full retro-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-pixel mb-1 retro-text">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full retro-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full retro-input"
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  Password
                </label>
                <div className="retro-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full retro-input"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="retro-eye-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  Confirm Password
                </label>
                <div className="retro-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className="w-full retro-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="retro-eye-toggle"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {passwordMatch !== null && (
                  <p className={passwordMatch ? "retro-validation-success" : "retro-validation-error"}>
                    {passwordMatch ? "Passwords match" : "Passwords don't match"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  Organization Name (optional)
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full retro-input"
                  placeholder={`${firstName || 'Your'}'s Organization`}
                />
              </div>

              <div className="retro-note">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs">
                    I agree to the <a href="/terms" target="_blank" className="underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !agreedToTerms || !passwordMatch}
                className="w-full retro-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading ? "Creating Account..." : "Create Free Account"}
                </span>
              </button>
            </form>

            <button
              onClick={() => {
                setMode("check");
                resetForm();
              }}
              className="mt-4 retro-button-small"
            >
              <span>←</span>
              <span className="font-pixel">Back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password setup mode (first time login)
  if (mode === "setup") {
    return (
      <div className="h-full flex flex-col retro-bg">
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div className="text-center mb-6">
                <div className="mb-2 flex justify-center">
                  <Cake className="w-10 h-10" />
                </div>
                <h2 className="font-pixel text-lg retro-text">
                  {t('ui.login.title_welcome')}
                </h2>
                <p className="text-sm mt-2 retro-text-secondary">
                  {welcomeUser ? t('ui.login.subtitle_hello', { name: welcomeUser }) + ' ' : ''}{t('ui.login.subtitle_setup_password')}
                </p>
              </div>

              {error && (
                <div className="retro-error">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  {t('ui.login.label_first_name')}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full retro-input"
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  {t('ui.login.label_last_name')}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full retro-input"
                />
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  {t('ui.login.label_password')}
                </label>
                <div className="retro-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full retro-input"
                    placeholder={t('ui.login.placeholder_password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="retro-eye-toggle"
                    aria-label={showPassword ? t('ui.login.aria_hide_password') : t('ui.login.aria_show_password')}
                  >
                    {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  {t('ui.login.label_confirm_password')}
                </label>
                <div className="retro-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className="w-full retro-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="retro-eye-toggle"
                    aria-label={showConfirmPassword ? t('ui.login.aria_hide_password') : t('ui.login.aria_show_password')}
                  >
                    {showConfirmPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                {passwordMatch !== null && (
                  <p className={passwordMatch ? "retro-validation-success" : "retro-validation-error"}>
                    {passwordMatch ? t('ui.login.validation_passwords_match') : t('ui.login.validation_passwords_mismatch')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full retro-button py-2"
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
              className="mt-4 retro-button-small"
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
    <div className="h-full flex flex-col retro-bg">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="text-center mb-6">
              <div className="mb-2 flex justify-center">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="font-pixel text-lg retro-text">
                {t('ui.login.title_sign_in')}
              </h2>
              <p className="text-sm mt-2 retro-text-secondary">
                {email}
              </p>
            </div>

            {error && (
              <div className="retro-error">
                {error}
              </div>
            )}

            {/* OAuth Login Buttons - Last Used First */}
            {lastUsedProviderSignin && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuth(lastUsedProviderSignin)}
                  className="relative w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#9F7AEA] hover:bg-[#8B6BC7] text-white rounded retro-button transition-colors font-semibold"
                >
                  {/* Last Used Badge */}
                  <span className="absolute -top-2 -right-2 bg-[#9F7AEA] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md">
                    {t('ui.login.last_used')}
                  </span>
                  {lastUsedProviderSignin === "github" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  {lastUsedProviderSignin === "microsoft" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                  )}
                  {lastUsedProviderSignin === "google" && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with {lastUsedProviderSignin === "github" ? "GitHub" : lastUsedProviderSignin === "microsoft" ? "Microsoft" : "Google"}
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
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded retro-button transition-colors ${
                    provider === "github"
                      ? "bg-[#24292e] hover:bg-[#1a1e22] text-white"
                      : provider === "microsoft"
                      ? "bg-[#0078d4] hover:bg-[#006cbe] text-white"
                      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                  }`}
                >
                  {provider === "github" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  {provider === "microsoft" && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                  )}
                  {provider === "google" && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with {provider === "github" ? "GitHub" : provider === "microsoft" ? "Microsoft" : "Google"}
                </button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white retro-text-secondary">or</span>
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
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-bg)',
                    boxShadow: "var(--modal-shadow)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Titlebar */}
                  <div
                    className="px-3 py-2 flex items-center justify-between border-b-2"
                    style={{
                      background: "var(--win95-titlebar)",
                      borderColor: "var(--win95-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 border"
                        style={{
                          background: "var(--win95-window-icon-bg)",
                          borderColor: "var(--win95-window-icon-border)",
                        }}
                      />
                      <span className="text-xs font-bold" style={{ color: "var(--win95-titlebar-text)" }}>
                        {t('ui.login.passkey_setup_required.title')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPasskeySetupPrompt(false)}
                      className="beveled-button w-5 h-5 flex items-center justify-center hover:opacity-80"
                      style={{
                        background: "var(--win95-button-face)",
                      }}
                    >
                      <X className="w-3 h-3" style={{ color: "var(--win95-text)" }} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4" style={{ background: 'var(--win95-bg)' }}>
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <Lock className="w-12 h-12" />
                      </div>
                      <h3 className="font-pixel text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
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
                          background: "var(--win95-highlight)",
                          color: "white",
                        }}
                      >
                        <span className="font-pixel">{t('ui.login.passkey_setup_required.button_use_password')}</span>
                      </button>
                    </div>

                    <div
                      className="p-3 border-l-4 text-xs"
                      style={{
                        background: 'var(--win95-button-face)',
                        borderColor: 'var(--info)',
                        color: 'var(--win95-text)'
                      }}
                    >
                      <strong>{t('ui.login.passkey_setup_required.tip_title')}</strong> {t('ui.login.passkey_setup_required.tip_description')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-pixel mb-1 retro-text">
                {t('ui.login.label_password')}
              </label>
              <div className="retro-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full retro-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="retro-eye-toggle"
                  aria-label={showPassword ? t('ui.login.aria_hide_password') : t('ui.login.aria_show_password')}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full retro-button py-2"
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
                <div className="w-full border-t" style={{ borderColor: 'var(--win95-border)' }}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 retro-bg retro-text-secondary">or</span>
              </div>
            </div>

            <button
              onClick={handlePasskeyLogin}
              disabled={loading || passkeyLoading}
              className="w-full retro-button py-2 mt-4"
              style={{ background: 'var(--info)' }}
            >
              <span className="font-pixel text-xs flex items-center justify-center gap-2">
                <Smartphone size={14} />
                {passkeyLoading ? "Authenticating..." : "Sign in with Face ID / Touch ID"}
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
            className="mt-4 retro-button-small"
          >
            <span>←</span>
            <span className="font-pixel">{t('ui.login.button_use_different_email')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
