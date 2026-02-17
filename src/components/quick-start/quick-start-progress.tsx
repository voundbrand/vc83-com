"use client";

import React from "react";
import { AlertTriangle, Check, X, CircleCheckBig } from "lucide-react";
import type { QuickStartProgress } from "./types";

interface QuickStartProgressProps {
  progress: QuickStartProgress;
  onClose: () => void;
}

/**
 * Progress indicator for Quick Start provisioning
 * Shows Win95-style progress bar and step-by-step status
 */
export function QuickStartProgressComponent({
  progress,
  onClose,
}: QuickStartProgressProps) {
  const isComplete = progress.status === "completed";
  const hasError = progress.status === "error";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] w-full max-w-lg">
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-2 flex items-center justify-between border-b-4 border-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-800 border-2 border-purple-900" />
            <span className="text-white font-bold text-sm">
              {isComplete
                ? "Setup Complete!"
                : hasError
                ? "Setup Error"
                : "Setting Up Your Workspace..."}
            </span>
          </div>
          {(isComplete || hasError) && (
            <button
              onClick={onClose}
              className="w-6 h-6 bg-red-600 border-2 border-red-800 text-white font-bold text-xs hover:bg-red-700"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Progress Bar */}
          {!hasError && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-700">Progress:</span>
                <span className="text-gray-600">{progress.progress}%</span>
              </div>
              <div className="h-8 bg-white border-4 border-gray-400 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {hasError && (
            <div className="bg-red-100 border-4 border-red-600 p-4">
              <p className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Setup Failed
              </p>
              <p className="text-red-700 text-xs">{progress.error}</p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {progress.steps.map((step, idx) => (
              <div
                key={idx}
                className={`
                  flex items-start gap-3 p-3
                  border-2
                  ${
                    step.status === "completed"
                      ? "bg-green-50 border-green-400"
                      : step.status === "in_progress"
                      ? "bg-purple-50 border-purple-400"
                      : step.status === "error"
                      ? "bg-red-50 border-red-400"
                      : "bg-gray-50 border-gray-300"
                  }
                `}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === "completed" ? (
                    <div className="w-5 h-5 bg-green-600 border-2 border-green-800 flex items-center justify-center text-white text-xs font-bold">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : step.status === "in_progress" ? (
                    <div className="w-5 h-5 bg-purple-600 border-2 border-purple-800 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  ) : step.status === "error" ? (
                    <div className="w-5 h-5 bg-red-600 border-2 border-red-800 flex items-center justify-center text-white text-xs font-bold">
                      <X className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-gray-300 border-2 border-gray-400" />
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {step.name}
                  </p>
                  {step.message && (
                    <p className="text-xs text-gray-600 mt-1">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Completion Message */}
          {isComplete && (
            <div className="bg-green-100 border-4 border-green-600 p-4">
              <p className="text-green-800 font-bold text-sm mb-2 flex items-center gap-2">
                <CircleCheckBig className="w-4 h-4" />
                Setup Complete!
              </p>
              <p className="text-green-700 text-xs">
                Your workspace is ready. All apps and templates have been
                provisioned.
              </p>
            </div>
          )}

          {/* Close Button */}
          {(isComplete || hasError) && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-purple-600 text-white border-4 border-purple-800 font-bold text-sm hover:bg-purple-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
