/**
 * CLI Login Provider Selection Page
 *
 * Shows OAuth provider selection (Microsoft, Google, GitHub) for CLI login.
 * User selects their preferred provider, then redirects to OAuth.
 *
 * Uses the same retro UI styling as the main login window, displayed
 * in a floating window on the classic Windows 95 teal desktop.
 *
 * IMPORTANT: OAuth flow is initiated via /api/auth/oauth-signup endpoint
 * which properly generates and stores the state token. Do NOT build
 * OAuth URLs client-side as that bypasses state registration.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function CliLoginContent() {
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback');
  const cliState = searchParams.get('state'); // CLI's state for CSRF protection
  const [error, setError] = useState<string | null>(null);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

  const handleProviderClick = (provider: 'microsoft' | 'google' | 'github') => {
    if (!callback) {
      setError('Missing callback URL');
      return;
    }

    // Redirect to the oauth-signup endpoint which properly generates and stores the state
    // This is the correct flow - do NOT build OAuth URLs client-side
    // We pass the CLI's state so it can be returned in the callback for CSRF validation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    let oauthUrl = `${appUrl}/api/auth/oauth-signup?provider=${provider}&sessionType=cli&callback=${encodeURIComponent(callback)}`;

    // Pass CLI's original state so it can be returned in the callback
    if (cliState) {
      oauthUrl += `&cliState=${encodeURIComponent(cliState)}`;
    }

    window.location.href = oauthUrl;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (confirmPassword && value) {
      setPasswordMatch(confirmPassword === value);
    } else {
      setPasswordMatch(null);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (password && value) {
      setPasswordMatch(password === value);
    } else {
      setPasswordMatch(null);
    }
  };

  if (!callback) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#008080' }}>
        {/* Retro Window */}
        <div className="retro-window window-corners w-full max-w-sm">
          {/* Title Bar */}
          <div className="retro-titlebar window-titlebar-corners px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border flex items-center justify-center text-xs rounded"
                style={{
                  background: 'var(--shell-window-icon-bg)',
                  borderColor: 'var(--shell-window-icon-border)'
                }}
              >⚠️</div>
              <span className="font-pixel text-xs" style={{ color: 'var(--shell-titlebar-text)' }}>Error</span>
            </div>
            <div className="flex gap-[2px]">
              <button className="retro-control-button" title="Close">
                <span className="select-none">×</span>
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="p-6 text-center" style={{ background: 'var(--shell-surface)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="font-pixel text-sm retro-text mb-4">Invalid Request</h1>
            <p className="text-sm retro-text-secondary">
              Missing callback URL. Please try logging in again from the CLI.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#008080' }}>
      {/* Retro Window */}
      <div className="retro-window window-corners w-full max-w-md">
        {/* Title Bar */}
        <div className="retro-titlebar window-titlebar-corners px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border flex items-center justify-center text-xs rounded"
              style={{
                background: 'var(--shell-window-icon-bg)',
                borderColor: 'var(--shell-window-icon-border)'
              }}
            >🍰</div>
            <span className="font-pixel text-xs" style={{ color: 'var(--shell-titlebar-text)' }}>CLI Login</span>
          </div>
          <div className="flex gap-[2px]">
            <button className="retro-control-button" title="Minimize">
              <span className="select-none">−</span>
            </button>
            <button className="retro-control-button" title="Maximize">
              <span className="select-none">□</span>
            </button>
            <button className="retro-control-button" title="Close">
              <span className="select-none">×</span>
            </button>
          </div>
        </div>

        {/* Window Content */}
        <div className="p-6" style={{ background: 'var(--shell-surface)' }}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🍰</div>
            <h1 className="font-pixel text-sm retro-text">
              CLI Login
            </h1>
            <p className="text-xs mt-2 retro-text-secondary">
              Choose your preferred login method
            </p>
          </div>

          {error && (
            <div className="retro-error mb-4 p-3 text-sm">
              {error}
            </div>
          )}

          {!showEmailSignup ? (
            <>
              {/* OAuth Login Buttons */}
              <div className="space-y-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleProviderClick('github')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded beveled-button transition-colors bg-[#24292e] hover:bg-[#1a1e22] text-white"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="font-pixel text-xs">Continue with GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderClick('microsoft')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded beveled-button transition-colors bg-[#0078d4] hover:bg-[#006cbe] text-white"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                  <span className="font-pixel text-xs">Continue with Microsoft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderClick('google')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded beveled-button transition-colors bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-pixel text-xs">Continue with Google</span>
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'var(--shell-border)' }}></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 retro-text-secondary" style={{ background: 'var(--shell-surface)' }}>or</span>
                </div>
              </div>

              <button
                onClick={() => setShowEmailSignup(true)}
                className="w-full beveled-button beveled-button-sm py-2"
              >
                <span className="font-pixel text-xs">Create account with email</span>
              </button>
            </>
          ) : (
            <>
              {/* Email Signup Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();

                if (password !== confirmPassword) {
                  setError('Passwords do not match');
                  return;
                }

                if (password.length < 8) {
                  setError('Password must be at least 8 characters');
                  return;
                }

                setLoading(true);
                setError(null);

                try {
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                  const response = await fetch(`${appUrl}/api/auth/cli/email-signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      callback,
                      email,
                      password,
                      firstName,
                      lastName,
                      organizationName: organizationName || undefined,
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || 'Signup failed');
                  }

                  // Redirect to CLI callback with token
                  if (data.token && callback) {
                    const redirectUrl = new URL(callback);
                    redirectUrl.searchParams.set('token', data.token);
                    window.location.href = redirectUrl.toString();
                  }
                } catch (err: unknown) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
                  setError(errorMessage);
                  setLoading(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-pixel mb-1 retro-text">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full retro-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-pixel mb-1 retro-text">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full retro-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-pixel mb-1 retro-text">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full retro-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-pixel mb-1 retro-text">
                    Password * (min 8 characters)
                  </label>
                  <div className="retro-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      required
                      minLength={8}
                      className="w-full retro-input"
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
                    Confirm Password *
                  </label>
                  <div className="retro-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      required
                      minLength={8}
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
                    placeholder={`${firstName || 'Your'}'s Organization`}
                    className="w-full retro-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || passwordMatch === false}
                  className="w-full beveled-button py-3"
                >
                  <span className="font-pixel text-xs">
                    {loading ? 'Creating Account...' : 'Create Account & Login'}
                  </span>
                </button>
              </form>

              <button
                onClick={() => {
                  setShowEmailSignup(false);
                  setError(null);
                }}
                className="mt-4 beveled-button beveled-button-sm"
              >
                <span>←</span>
                <span className="font-pixel text-xs ml-1">Back to OAuth</span>
              </button>
            </>
          )}

          <div className="mt-6 retro-note p-3">
            <p className="text-xs retro-text-secondary">
              This will create the same account as platform login, just with CLI access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CliLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#008080' }}>
        {/* Retro Window */}
        <div className="retro-window window-corners w-full max-w-md">
          {/* Title Bar */}
          <div className="retro-titlebar window-titlebar-corners px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border flex items-center justify-center text-xs rounded"
                style={{
                  background: 'var(--shell-window-icon-bg)',
                  borderColor: 'var(--shell-window-icon-border)'
                }}
              >🍰</div>
              <span className="font-pixel text-xs" style={{ color: 'var(--shell-titlebar-text)' }}>CLI Login</span>
            </div>
            <div className="flex gap-[2px]">
              <button className="retro-control-button" title="Minimize">
                <span className="select-none">−</span>
              </button>
              <button className="retro-control-button" title="Maximize">
                <span className="select-none">□</span>
              </button>
              <button className="retro-control-button" title="Close">
                <span className="select-none">×</span>
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="p-6 text-center" style={{ background: 'var(--shell-surface)' }}>
            <div className="text-4xl mb-4">🍰</div>
            <h1 className="font-pixel text-sm retro-text">CLI Login</h1>
            <p className="text-sm retro-text-secondary mt-2">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CliLoginContent />
    </Suspense>
  );
}
