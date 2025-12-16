"use client";

import React, { useState } from "react";
import { ICPCard } from "./icp-card";
import { QuickStartProgressComponent } from "./quick-start-progress";
import { ICP_DEFINITIONS } from "./icp-definitions";
import type { ICPId, QuickStartProgress } from "./types";

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
  const [selectedICP, setSelectedICP] = useState<ICPId | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [progress, setProgress] = useState<QuickStartProgress | null>(null);

  const handleSelectICP = (icpId: string) => {
    setSelectedICP(icpId as ICPId);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!selectedICP) return;

    setShowConfirmation(false);

    // Initialize progress tracking
    const initialProgress: QuickStartProgress = {
      icpId: selectedICP,
      status: "provisioning",
      progress: 0,
      steps: [
        { name: "Validating configuration", status: "in_progress" },
        { name: "Installing apps", status: "pending" },
        { name: "Provisioning templates", status: "pending" },
        { name: "Configuring settings", status: "pending" },
        { name: "Finalizing setup", status: "pending" },
      ],
    };

    setProgress(initialProgress);

    // Simulate provisioning steps (replace with actual backend call)
    await simulateProvisioning(selectedICP, (updatedProgress) => {
      setProgress(updatedProgress);
    });

    onComplete?.(selectedICP);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 border-4 border-gray-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]">
        <h2 className="text-white font-bold text-xl mb-2">
          🚀 Quick Start Setup
        </h2>
        <p className="text-purple-100 text-sm">
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
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-2 flex items-center justify-between border-b-4 border-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-800 border-2 border-purple-900" />
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
                <div className="text-5xl">{selectedICPDefinition.icon}</div>
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
                <p className="font-bold text-sm text-gray-800 border-b-2 border-gray-300 pb-2">
                  📦 What will be added:
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
                <p className="text-yellow-800 text-xs">
                  ⚠️ <strong>Note:</strong> This will ADD apps and templates to
                  your workspace. Your existing data will not be affected.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white border-4 border-purple-800 font-bold text-sm hover:bg-purple-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  ✓ CONFIRM & START SETUP
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

/**
 * Simulate provisioning steps (replace with actual backend call)
 */
async function simulateProvisioning(
  icpId: ICPId,
  onProgress: (progress: QuickStartProgress) => void
) {
  const steps = [
    "Validating configuration",
    "Installing apps",
    "Provisioning templates",
    "Configuring settings",
    "Finalizing setup",
  ];

  for (let i = 0; i < steps.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const isLastStep = i === steps.length - 1;

    const progress: QuickStartProgress = {
      icpId,
      status: isLastStep ? "completed" : "provisioning",
      progress: ((i + 1) / steps.length) * 100,
      steps: steps.map((name, idx) => ({
        name,
        status:
          idx < i
            ? "completed"
            : idx === i
            ? isLastStep
              ? "completed" // Mark last step as completed, not in_progress
              : "in_progress"
            : "pending",
        message:
          idx === i
            ? isLastStep
              ? "Done"
              : `Processing ${name.toLowerCase()}...`
            : idx < i
            ? "Done"
            : undefined,
      })),
    };

    onProgress(progress);
  }
}
