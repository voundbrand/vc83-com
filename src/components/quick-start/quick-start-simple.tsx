"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/**
 * Simple Quick Start Component
 *
 * Runs the EXACT same onboarding as new user signup:
 * - Assigns ALL apps
 * - Provisions Freelancer Portal template
 *
 * No ICP selection needed - just one button to run onboarding
 */
export function QuickStartSimple() {
  const { sessionId } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const applyQuickStart = useMutation(api.manualOnboarding.applyQuickStart);

  const handleStart = async () => {
    if (!sessionId) {
      setError("Not authenticated");
      return;
    }

    setIsRunning(true);
    setError(null);
    setProgress(0);
    setResults(null);

    try {
      // Step 1: Assigning apps
      setCurrentStep("Assigning all apps...");
      setProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Provisioning templates
      setCurrentStep("Provisioning Freelancer Portal template...");
      setProgress(50);

      // Run the mutation
      const result = await applyQuickStart({ sessionId });

      // Step 3: Finalizing
      setCurrentStep("Finalizing setup...");
      setProgress(90);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Complete
      setProgress(100);
      setCurrentStep("Setup complete!");
      setResults(result);
    } catch (err: any) {
      console.error("Quick Start failed:", err);
      setError(err.message || "Something went wrong");
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setIsRunning(false);
    setProgress(0);
    setCurrentStep("");
    setResults(null);
    setError(null);
  };

  if (results) {
    return (
      <div className="p-6 space-y-6">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 border-4 border-gray-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]">
          <h2 className="text-white font-bold text-xl mb-2">
            ✅ Setup Complete!
          </h2>
          <p className="text-green-100 text-sm">
            Your workspace has been configured successfully.
          </p>
        </div>

        {/* Results */}
        <div className="bg-white border-4 border-gray-400 p-4 space-y-3">
          <p className="font-bold text-sm text-gray-800 border-b-2 border-gray-300 pb-2">
            📦 What was added:
          </p>

          {results.appsProvisioned.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1">
                NEW APPS ({results.appsProvisioned.length}):
              </p>
              <p className="text-xs text-gray-700">
                {results.appsProvisioned.join(", ")}
              </p>
            </div>
          )}

          {results.templatesProvisioned.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1">
                NEW TEMPLATES ({results.templatesProvisioned.length}):
              </p>
              <p className="text-xs text-gray-700">
                {results.templatesProvisioned.join(", ")}
              </p>
            </div>
          )}

          {results.alreadyInstalled.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1">
                ALREADY INSTALLED ({results.alreadyInstalled.length}):
              </p>
              <p className="text-xs text-gray-700">
                {results.alreadyInstalled.join(", ")}
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="w-full px-4 py-3 bg-purple-600 text-white border-4 border-purple-800 font-bold text-sm hover:bg-purple-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
        >
          CLOSE
        </button>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="p-6 space-y-6">
        {/* Progress Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 border-4 border-gray-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]">
          <h2 className="text-white font-bold text-xl mb-2">
            ⚙️ Setting Up Your Workspace
          </h2>
          <p className="text-purple-100 text-sm">
            Please wait while we configure your account...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-4 border-gray-400 p-4">
          <p className="text-sm font-bold text-gray-800 mb-2">{currentStep}</p>
          <div className="w-full bg-gray-300 border-2 border-gray-500 h-8">
            <div
              className="bg-purple-600 h-full transition-all duration-300 flex items-center justify-center"
              style={{ width: `${progress}%` }}
            >
              {progress > 0 && (
                <span className="text-white text-xs font-bold">{progress}%</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 border-4 border-gray-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]">
        <h2 className="text-white font-bold text-xl mb-2">
          🚀 Quick Start Setup
        </h2>
        <p className="text-purple-100 text-sm">
          Configure your workspace with pre-configured apps and templates
        </p>
      </div>

      {/* What You'll Get */}
      <div className="bg-white border-4 border-gray-400 p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800 border-b-2 border-gray-300 pb-2">
          📦 What you'll get:
        </p>

        <div>
          <p className="text-xs font-bold text-gray-600 mb-1">ALL APPS:</p>
          <p className="text-xs text-gray-700">
            CRM, Projects, Invoicing, Forms, Events, Templates, Media Library,
            Web Publishing, Integrations, AI Chat, and more...
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-600 mb-1">
            FREELANCER PORTAL TEMPLATE:
          </p>
          <p className="text-xs text-gray-700">
            Ready-to-deploy client portal with projects, invoices, and profile
            management
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-4 border-red-400 p-3">
          <p className="text-red-800 text-xs">
            ⚠️ <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={isRunning}
        className="w-full px-4 py-3 bg-purple-600 text-white border-4 border-purple-800 font-bold text-sm hover:bg-purple-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ✓ START QUICK SETUP
      </button>

      {/* Safety Notice */}
      <div className="bg-yellow-50 border-4 border-yellow-400 p-3">
        <p className="text-yellow-800 text-xs">
          ⚠️ <strong>Note:</strong> This will ADD apps and templates to your
          workspace. Your existing data will not be affected.
        </p>
      </div>
    </div>
  );
}
