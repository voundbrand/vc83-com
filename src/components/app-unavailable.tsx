"use client";

import { AlertCircle, Lock } from "lucide-react";

interface AppUnavailableProps {
  appName: string;
  appCode: string;
  organizationName?: string;
  message?: string;
}

/**
 * Universal component shown when an app is not available to an organization
 * Displays a consistent message across all apps with contact information
 */
export function AppUnavailable({
  appName,
  appCode,
  organizationName = "your organization",
  message,
}: AppUnavailableProps) {
  return (
    <div className="flex items-center justify-center h-full p-8" style={{ background: 'var(--win95-bg)' }}>
      <div className="max-w-md w-full">
        <div className="border-4 p-8 text-center" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Lock className="w-16 h-16 text-gray-400" />
              <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                <AlertCircle className="w-6 h-6 text-gray-800" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {appName} Not Available
          </h2>

          {/* Message */}
          <div className="space-y-4 text-sm text-gray-700">
            <p>
              {message ||
                `The ${appName} app is not currently enabled for ${organizationName}.`}
            </p>

            <div className="bg-gray-50 border-2 border-gray-300 p-4 text-left">
              <p className="font-bold mb-2">To enable this app:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Contact the platform administrator</li>
                <li>Request access to the {appName} app</li>
                <li>Provide your organization name: <strong>{organizationName}</strong></li>
                <li>App code for reference: <code className="bg-gray-200 px-1">{appCode}</code></li>
              </ol>
            </div>

            <p className="text-xs text-gray-500 italic">
              App availability is managed by platform administrators to ensure
              proper licensing and feature access control.
            </p>
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 border-2 border-gray-400 text-sm font-bold transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline version for use within forms or smaller spaces
 */
export function AppUnavailableInline({
  appName,
  organizationName = "your organization",
}: {
  appName: string;
  organizationName?: string;
}) {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-yellow-900 mb-1">
            {appName} Not Available
          </p>
          <p className="text-yellow-800">
            This feature requires the {appName} app, which is not enabled for{" "}
            {organizationName}.{" "}
            <strong>Please contact your administrator to enable access.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
