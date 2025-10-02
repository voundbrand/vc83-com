"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

const workspaceSuffixes = [
  "Studio",
  "Lab",
  "Hub",
  "Space",
  "Zone",
  "Base",
  "HQ",
  "Workshop",
  "Center",
  "Office",
];

interface PersonalRegisterFormProps {
  onSuccess?: () => void;
  onSwitchToBusiness?: () => void;
}

export function PersonalRegisterForm({ onSuccess, onSwitchToBusiness }: PersonalRegisterFormProps) {
  const { signUpPersonal } = useAuth();
  
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot protection

  // Generate creative workspace name
  useEffect(() => {
    if (firstName.length >= 2) {
      const suffix = workspaceSuffixes[Math.floor(Math.random() * workspaceSuffixes.length)];
      setWorkspaceName(`${firstName}'s ${suffix}`);
    } else {
      setWorkspaceName("");
    }
  }, [firstName]);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(pwd)) {
      setError("Password must contain an uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(pwd)) {
      setError("Password must contain a lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(pwd)) {
      setError("Password must contain a number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Bot protection: check honeypot
    if (honeypot) {
      console.warn("Bot detected");
      return;
    }

    // Validation
    if (!firstName || firstName.length < 2) {
      setError("Please enter your name");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      await signUpPersonal({
        firstName,
        email,
        password,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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

      {/* Honeypot field (hidden from users) */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* Name Field */}
      <div className="space-y-1">
        <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
          First Name
        </label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="retro-input w-full"
          placeholder="Your name"
          required
          disabled={isLoading}
        />
      </div>

      {/* Workspace Preview */}
      {workspaceName && (
        <div className="retro-panel text-sm">
          <strong>Workspace:</strong> {workspaceName}
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
            placeholder="At least 8 characters"
            required
            disabled={isLoading}
            autoComplete="new-password"
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

      {/* Confirm Password Field */}
      <div className="space-y-1">
        <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
          Confirm Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="retro-input w-full pr-10"
            placeholder="Confirm password"
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isLoading}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <Eye className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
            ) : (
              <EyeOff className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Terms Checkbox */}
      <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 cursor-pointer"
        />
        <span className="font-semibold">
          I accept the{" "}
          <a href="/terms" className="underline" style={{ color: 'var(--win95-text)' }}>
            Terms & Conditions
          </a>
        </span>
      </label>

      {/* Submit Button */}
      <button
        type="submit"
        className="retro-button-primary w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Create Personal Account"}
      </button>

      {/* Switch to Business */}
      <div className="text-center pt-4 border-t-2 mt-4" style={{ borderColor: 'var(--win95-border)' }}>
        <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
          Need a business account?{" "}
          <button
            type="button"
            onClick={onSwitchToBusiness}
            className="font-semibold underline"
            style={{ color: 'var(--win95-highlight)' }}
            disabled={isLoading}
          >
            Switch to Business
          </button>
        </p>
      </div>
    </form>
  );
}