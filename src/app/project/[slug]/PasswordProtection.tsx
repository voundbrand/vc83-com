"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Lock, ArrowRight, X, Loader2 } from "lucide-react";

interface PasswordProtectionProps {
  slug: string;
  theme: string;
  projectName: string;
  onSuccess: () => void;
}

const themeColors = {
  amber: {
    bg: "from-amber-50 to-orange-50",
    accent: "amber",
    button: "from-amber-500 to-orange-600",
    buttonHover: "from-amber-600 to-orange-700",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    focus: "focus:ring-amber-500",
  },
  purple: {
    bg: "from-purple-50 to-indigo-50",
    accent: "purple",
    button: "from-purple-500 to-indigo-600",
    buttonHover: "from-purple-600 to-indigo-700",
    icon: "text-purple-600",
    iconBg: "bg-purple-100",
    focus: "focus:ring-purple-500",
  },
  blue: {
    bg: "from-blue-50 to-cyan-50",
    accent: "blue",
    button: "from-blue-500 to-cyan-600",
    buttonHover: "from-blue-600 to-cyan-700",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    focus: "focus:ring-blue-500",
  },
  green: {
    bg: "from-green-50 to-emerald-50",
    accent: "green",
    button: "from-green-500 to-emerald-600",
    buttonHover: "from-green-600 to-emerald-700",
    icon: "text-green-600",
    iconBg: "bg-green-100",
    focus: "focus:ring-green-500",
  },
  neutral: {
    bg: "from-gray-50 to-slate-50",
    accent: "gray",
    button: "from-gray-600 to-slate-700",
    buttonHover: "from-gray-700 to-slate-800",
    icon: "text-gray-600",
    iconBg: "bg-gray-100",
    focus: "focus:ring-gray-500",
  },
};

export default function PasswordProtection({
  slug,
  theme,
  projectName,
  onSuccess,
}: PasswordProtectionProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const colors = themeColors[theme as keyof typeof themeColors] || themeColors.purple;

  // Use the verification query
  const verifyResult = useQuery(
    api.projectOntology.verifyProjectPagePassword,
    checking ? { slug, password } : "skip"
  );

  // Handle verification result
  useEffect(() => {
    if (!checking) return;

    if (verifyResult?.valid) {
      onSuccess();
    } else if (verifyResult?.reason === "incorrect") {
      setError(true);
      setChecking(false);
    }
  }, [verifyResult, onSuccess, checking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError(false);
    setChecking(true);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${colors.bg} flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 shadow-xl p-8 rounded-lg">
          {/* Logo Area */}
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 ${colors.iconBg} rounded-full mb-4`}
            >
              <Lock className={`w-8 h-8 ${colors.icon}`} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-gray-800">
              {projectName}
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              This page is password protected
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Enter password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`w-full pl-10 pr-4 py-3 border ${
                    error ? "border-red-300 bg-red-50" : "border-gray-200"
                  } rounded-lg focus:outline-none focus:ring-2 ${colors.focus} focus:border-transparent transition-all`}
                  placeholder="••••••••"
                  autoFocus
                  disabled={checking}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Incorrect password. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={checking || !password}
              className={`w-full bg-gradient-to-r ${colors.button} hover:${colors.buttonHover} text-white py-3 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {checking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Powered by{" "}
              <a
                href="https://l4yercak3.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`${colors.icon} italic hover:opacity-80 transition-colors`}
              >
                l4yercak3
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
