"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

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

  const { user, isSignedIn, signIn, setupPassword, checkNeedsPasswordSetup, signOut } = useAuth();

  const handleCheckEmail = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await checkNeedsPasswordSetup(email);

      if (!result.userExists) {
        setError("No account found. Please contact an administrator for access.");
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
      setError(err instanceof Error ? err.message : "An error occurred");
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
      setError(err instanceof Error ? err.message : "Invalid credentials");
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
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await setupPassword(email, password, firstName || undefined, lastName || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isSignedIn && user) {
    return (
      <div className="h-full flex flex-col p-6 retro-bg">
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-2">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="font-pixel text-lg retro-text">
              Welcome, {user.firstName || user.email}!
            </h2>
            <p className="text-sm retro-text-secondary">
              You are currently logged in
              {user.isSuperAdmin && (
                <span className="ml-2 text-green-600 font-bold">[SUPER ADMIN]</span>
              )}
              {user.currentOrganization?.role && !user.isSuperAdmin && (
                <span className="ml-2 text-blue-600">[{user.currentOrganization.role.name.toUpperCase()}]</span>
              )}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-sm space-y-1 retro-text-secondary">
              <p>Email: {user.email}</p>
              <p>User ID: {user.id}</p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="retro-button px-6 py-2"
          >
            <span className="font-pixel text-xs">LOG OUT</span>
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
                ACCESS SYSTEM
              </h2>
              <p className="text-xs mt-2 retro-text-secondary">
                Enter your email to continue
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
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                  className="w-full retro-input"
                  placeholder="user@example.com"
                />
              </div>

              <button
                onClick={handleCheckEmail}
                disabled={loading || !email}
                className="w-full retro-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading ? "CHECKING..." : "CONTINUE"}
                </span>
              </button>
            </div>

            <div className="mt-6 retro-note">
              <p className="text-xs">
                <strong>Note:</strong> This is an invite-only system. You must have been granted access by an administrator to sign in.
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
                  WELCOME!
                </h2>
                <p className="text-sm mt-2 retro-text-secondary">
                  {welcomeUser ? `Hello ${welcomeUser}! ` : ''}Set up your password to continue
                </p>
              </div>

              {error && (
                <div className="retro-error">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  FIRST NAME (Optional)
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
                  LAST NAME (Optional)
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
                  PASSWORD
                </label>
                <div className="retro-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full retro-input"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="retro-eye-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-pixel mb-1 retro-text">
                  CONFIRM PASSWORD
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
                    {showConfirmPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                {passwordMatch !== null && (
                  <p className={passwordMatch ? "retro-validation-success" : "retro-validation-error"}>
                    {passwordMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full retro-button py-2"
              >
                <span className="font-pixel text-xs">
                  {loading ? "SETTING UP..." : "SET PASSWORD"}
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
              <span className="font-pixel">BACK</span>
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
                SIGN IN
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

            <div>
              <label className="block text-xs font-pixel mb-1 retro-text">
                PASSWORD
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full retro-button py-2"
            >
              <span className="font-pixel text-xs">
                {loading ? "SIGNING IN..." : "SIGN IN"}
              </span>
            </button>
          </form>

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
            <span className="font-pixel">USE DIFFERENT EMAIL</span>
          </button>
        </div>
      </div>
    </div>
  );
}