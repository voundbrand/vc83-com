"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Smartphone } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { startAuthentication } from "@simplewebauthn/browser";
import { PasskeyEncouragementBanner } from "@/components/passkey-encouragement-banner";
import { FirstLoginPasskeyModal } from "@/components/first-login-passkey-modal";

export function LoginWindow() {
  const [mode, setMode] = useState<"check" | "signin" | "setup">("check");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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

  const { user, isSignedIn, signIn, setupPassword, checkNeedsPasswordSetup, signOut, sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.login");

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
            <div className="text-6xl mb-4">👤</div>
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
    return (
      <div className="h-full flex flex-col retro-bg">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🔐</div>
              <h2 className="font-pixel text-lg retro-text">
                {t('ui.login.title_system_access')}
              </h2>
              <p className="text-xs mt-2 retro-text-secondary">
                {t('ui.login.subtitle_enter_email')}
              </p>
            </div>

            {error && (
              <div className="retro-error mb-4">
                {error}
              </div>
            )}

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

            <div className="mt-6 retro-note">
              <p className="text-xs">
                <strong>{t('ui.login.note_title')}</strong> {t('ui.login.note_invitation_only')}
              </p>
            </div>
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
                <div className="text-4xl mb-2">🎉</div>
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
  return (
    <div className="h-full flex flex-col retro-bg">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🔐</div>
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

            {/* Passkey Setup Prompt Modal */}
            {showPasskeySetupPrompt && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="retro-window w-full max-w-md mx-4">
                  <div className="retro-window-title-bar">
                    <span className="retro-window-title">{t('ui.login.passkey_setup_required.title')}</span>
                    <button
                      onClick={() => setShowPasskeySetupPrompt(false)}
                      className="retro-window-close"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="retro-window-body p-6 space-y-4">
                    <div className="text-center">
                      <div className="text-5xl mb-3">🔐</div>
                      <h3 className="font-pixel text-sm retro-text mb-2">
                        {t('ui.login.passkey_setup_required.heading')}
                      </h3>
                      <p className="text-xs retro-text-secondary leading-relaxed">
                        {t('ui.login.passkey_setup_required.description')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPasskeySetupPrompt(false)}
                        className="flex-1 retro-button py-2"
                      >
                        <span className="font-pixel text-xs">{t('ui.login.passkey_setup_required.button_use_password')}</span>
                      </button>
                    </div>

                    <div className="retro-note">
                      <p className="text-xs">
                        <strong>{t('ui.login.passkey_setup_required.tip_title')}</strong> {t('ui.login.passkey_setup_required.tip_description')}
                      </p>
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