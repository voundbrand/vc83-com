"use client";

import React, { useState, useEffect } from "react";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useProjectDrawer } from "./ProjectDrawerProvider";

type LoginState = "idle" | "loading" | "success" | "error";

/**
 * Magic link login prompt for client authentication
 * Shown when user is not authenticated in the drawer
 */
export function LoginPrompt() {
  const { themeColors, config, authError } = useProjectDrawer();
  const [email, setEmail] = useState("");
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Show auth error from callback if present
  useEffect(() => {
    if (authError) {
      setLoginState("error");
      setErrorMessage(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setLoginState("loading");
    setErrorMessage("");

    try {
      // Call magic link API
      const response = await fetch("/api/auth/project-drawer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          organizationId: config.organizationId,
          projectId: config.projectId,
          redirectPath: window.location.pathname,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden des Magic Links");
      }

      setLoginState("success");
    } catch (err) {
      setLoginState("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
      );
    }
  };

  // Success state
  if (loginState === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-8">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{ backgroundColor: "#dcfce7" }}
        >
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            E-Mail gesendet!
          </h3>
          <p className="text-sm text-gray-600">
            Wir haben einen Login-Link an <strong>{email}</strong> gesendet.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Bitte prüfen Sie Ihren Posteingang und klicken Sie auf den Link.
          </p>
        </div>

        <button
          onClick={() => {
            setLoginState("idle");
            setEmail("");
          }}
          className="mt-4 text-sm transition-colors"
          style={{ color: themeColors.primary }}
        >
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 py-8">
      {/* Icon */}
      <div
        className="flex items-center justify-center w-16 h-16 rounded-full"
        style={{ backgroundColor: themeColors.background }}
      >
        <Mail className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>

      {/* Title and description */}
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Anmeldung erforderlich
        </h3>
        <p className="text-sm text-gray-600">
          Um die Projekt-Details anzuzeigen, melden Sie sich bitte mit Ihrer
          E-Mail-Adresse an.
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            E-Mail-Adresse
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ihre@email.de"
            className="w-full px-4 py-3 text-center border rounded-lg focus:outline-none focus:ring-2"
            style={{
              borderColor: loginState === "error" ? "#ef4444" : themeColors.border,
              // @ts-expect-error CSS variable
              "--tw-ring-color": themeColors.primary,
            }}
            disabled={loginState === "loading"}
            required
          />
        </div>

        {/* Error message */}
        {loginState === "error" && errorMessage && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loginState === "loading" || !email.trim()}
          className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium text-white transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: themeColors.primary }}
        >
          {loginState === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Wird gesendet...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Login-Link anfordern
            </>
          )}
        </button>
      </form>

      {/* Privacy note */}
      <p className="text-xs text-center text-gray-500">
        Wir senden Ihnen einen sicheren Link per E-Mail.
        <br />
        Kein Passwort erforderlich.
      </p>
    </div>
  );
}
