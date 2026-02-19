"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ICPCard } from "./icp-card";
import { QuickStartProgressComponent } from "./quick-start-progress";
import { ICP_DEFINITIONS } from "./icp-definitions";
import type { ICPId, QuickStartProgress } from "./types";
import { Bot, Rocket, CalendarDays, BriefcaseBusiness, Building2, Package, AlertTriangle, Check } from "lucide-react";

interface QuickStartICPSelectorProps {
  onComplete?: (icpId: ICPId) => void;
  completedICPs?: ICPId[];
}

/**
 * Main Quick Start ICP Selector Component
 * Shows grid of ICP cards and handles provisioning flow
 */
export function QuickStartICPSelector({
  onComplete,
  completedICPs = [],
}: QuickStartICPSelectorProps) {
  const { sessionId } = useAuth();
  const applyQuickStart = useMutation(api.manualOnboarding.applyQuickStart);

  const [selectedICP, setSelectedICP] = useState<ICPId | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [progress, setProgress] = useState<QuickStartProgress | null>(null);

  // Debug: Log render
  console.log("QuickStartICPSelector rendering", { completedICPs, ICP_DEFINITIONS });

  const handleSelectICP = (icpId: string) => {
    setSelectedICP(icpId as ICPId);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!selectedICP || !sessionId) return;

    setShowConfirmation(false);

    // Define provisioning steps
    const stepNames = [
      "Validating configuration",
      "Installing apps",
      "Provisioning templates",
      "Configuring settings",
      "Finalizing setup",
    ];

    // Initialize progress tracking
    const initialProgress: QuickStartProgress = {
      icpId: selectedICP,
      status: "provisioning",
      progress: 0,
      steps: stepNames.map((name, idx) => ({
        name,
        status: idx === 0 ? "in_progress" : "pending",
      })),
    };

    setProgress(initialProgress);

    try {
      // Step 1: Validating configuration
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress({
        ...initialProgress,
        progress: 20,
        steps: stepNames.map((name, idx) => ({
          name,
          status: idx === 0 ? "completed" : idx === 1 ? "in_progress" : "pending",
          message: idx === 0 ? "Done" : idx === 1 ? "Processing..." : undefined,
        })),
      });

      // Step 2: Call real backend mutation
      console.log("[Quick Start] Calling applyQuickStart mutation...");
      const result = await applyQuickStart({ sessionId });
      console.log("[Quick Start] Backend result:", result);

      // Step 3: Update progress - Apps installed
      setProgress({
        icpId: selectedICP,
        status: "provisioning",
        progress: 60,
        steps: stepNames.map((name, idx) => ({
          name,
          status: idx <= 1 ? "completed" : idx === 2 ? "in_progress" : "pending",
          message: idx <= 1 ? "Done" : idx === 2 ? "Processing..." : undefined,
        })),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Update progress - Templates provisioned
      setProgress({
        icpId: selectedICP,
        status: "provisioning",
        progress: 80,
        steps: stepNames.map((name, idx) => ({
          name,
          status: idx <= 2 ? "completed" : idx === 3 ? "in_progress" : "pending",
          message: idx <= 2 ? "Done" : idx === 3 ? "Processing..." : undefined,
        })),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 5: Complete
      setProgress({
        icpId: selectedICP,
        status: "completed",
        progress: 100,
        steps: stepNames.map((name) => ({
          name,
          status: "completed",
          message: "Done",
        })),
      });

      console.log("[Quick Start] Provisioning complete:", {
        appsProvisioned: result.appsProvisioned,
        templatesProvisioned: result.templatesProvisioned,
        alreadyInstalled: result.alreadyInstalled,
      });

      onComplete?.(selectedICP);
    } catch (error) {
      console.error("[Quick Start] Provisioning failed:", error);
      setProgress({
        icpId: selectedICP,
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Provisioning failed",
        steps: stepNames.map((name) => ({
          name,
          status: "error",
        })),
      });
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedICP(null);
  };

  const handleCloseProgress = () => {
    setProgress(null);
    setSelectedICP(null);
  };

  const selectedICPDefinition = selectedICP
    ? ICP_DEFINITIONS.find((icp) => icp.id === selectedICP)
    : null;
  const selectedIcpIconMap = {
    "ai-agency": Bot,
    "founder-builder": Rocket,
    "event-manager": CalendarDays,
    freelancer: BriefcaseBusiness,
    enterprise: Building2,
  } as const;
  const SelectedIcpIcon = selectedICP ? selectedIcpIconMap[selectedICP] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 border-4 border-gray-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]">
        <h2 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
          <Rocket className="w-5 h-5" />
          Quick Start Setup
        </h2>
        <p className="text-violet-100 text-sm">
          Choose your profile to get started with pre-configured apps,
          templates, and workflows
        </p>
      </div>

      {/* ICP Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ICP_DEFINITIONS.map((icp) => (
          <ICPCard
            key={icp.id}
            icp={icp}
            onSelect={handleSelectICP}
            isCompleted={completedICPs.includes(icp.id)}
          />
        ))}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedICPDefinition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] w-full max-w-2xl">
            {/* Title Bar */}
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-3 py-2 flex items-center justify-between border-b-4 border-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-violet-800 border-2 border-violet-900" />
                <span className="text-white font-bold text-sm">
                  Confirm Setup
                </span>
              </div>
              <button
                onClick={handleCancel}
                className="w-6 h-6 bg-red-600 border-2 border-red-800 text-white font-bold text-xs hover:bg-red-700"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Selected ICP Info */}
              <div className="flex items-center gap-4">
                {SelectedIcpIcon && <SelectedIcpIcon className="w-12 h-12 text-violet-700" />}
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {selectedICPDefinition.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedICPDefinition.description}
                  </p>
                </div>
              </div>

              {/* What Will Be Provisioned */}
              <div className="bg-white border-4 border-gray-400 p-4 space-y-3">
                <p className="font-bold text-sm text-gray-800 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  What will be added:
                </p>

                {/* Apps */}
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">
                    APPS ({selectedICPDefinition.provisions.apps.length}):
                  </p>
                  <p className="text-xs text-gray-700">
                    {selectedICPDefinition.provisions.apps.join(", ")}
                  </p>
                </div>

                {/* Templates */}
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">
                    TEMPLATES ({selectedICPDefinition.provisions.templates.length}):
                  </p>
                  <p className="text-xs text-gray-700">
                    {selectedICPDefinition.provisions.templates.join(", ")}
                  </p>
                </div>

                {/* Features */}
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-1">
                    FEATURES ({selectedICPDefinition.provisions.features.length}):
                  </p>
                  <p className="text-xs text-gray-700">
                    {selectedICPDefinition.provisions.features.join(", ")}
                  </p>
                </div>
              </div>

              {/* Safety Notice */}
              <div className="bg-yellow-50 border-4 border-yellow-400 p-3">
                <p className="text-yellow-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <strong>Note:</strong> This will ADD apps and templates to
                  your workspace. Your existing data will not be affected.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-3 bg-violet-600 text-white border-4 border-violet-800 font-bold text-sm hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  CONFIRM & START SETUP
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-300 text-gray-800 border-4 border-gray-500 font-bold text-sm hover:bg-gray-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {progress && (
        <QuickStartProgressComponent
          progress={progress}
          onClose={handleCloseProgress}
        />
      )}
    </div>
  );
}
