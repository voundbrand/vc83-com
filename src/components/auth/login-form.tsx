"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      
      if (typeof window !== "undefined" && rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Error Display */}
      {error && (
        <div className="retro-panel border-red-500 bg-red-50">
          <p className="text-sm text-red-800 font-semibold">⚠️ {error}</p>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1">
        <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="retro-input w-full"
          placeholder="you@example.com"
          required
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-1">
        <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="retro-input w-full pr-10"
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isLoading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <Eye className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
            ) : (
              <EyeOff className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="font-semibold">Remember me</span>
        </label>
        <a href="/forgot-password" className="text-sm font-semibold underline" style={{ color: 'var(--win95-text)' }}>
          Forgot password?
        </a>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="retro-button-primary w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? "Signing In..." : "Sign In"}
      </button>

      {/* Divider */}
      <div className="retro-panel my-4 text-center text-sm font-semibold">
        Or
      </div>

      {/* Social Login */}
      <button
        type="button"
        className="retro-button w-full flex items-center justify-center gap-2"
        disabled={isLoading}
      >
        <span>🔷</span>
        <span>Sign in with Microsoft</span>
      </button>

      {/* Switch to Register */}
      <div className="text-center pt-4 border-t-2 mt-4" style={{ borderColor: 'var(--win95-border)' }}>
        <p className="text-sm">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold underline"
            style={{ color: 'var(--win95-text)' }}
            disabled={isLoading}
          >
            Create Account
          </button>
        </p>
      </div>
    </form>
  );
}
