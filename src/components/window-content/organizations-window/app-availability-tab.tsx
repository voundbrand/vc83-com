"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Check, X, Loader2, AlertCircle } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * App Availability Tab
 *
 * Super admin UI to manage which apps are available to which organizations.
 * Displays a matrix: rows = organizations, columns = apps, cells = toggle buttons.
 */
export function AppAvailabilityTab() {
  const { sessionId, user } = useAuth();

  // Fetch availability matrix data
  const matrixData = useQuery(
    api.appAvailability.getAvailabilityMatrix,
    sessionId ? { sessionId } : "skip"
  );

  if (!matrixData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  const { organizations, apps, availabilities } = matrixData;

  if (organizations.length === 0 || apps.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-yellow-900">No Apps or Organizations Found</h4>
              <p className="text-xs text-yellow-800 mt-1">
                {apps.length === 0 && "No apps have been registered yet. Run the seed script to create system apps."}
                {organizations.length === 0 && "No organizations exist yet."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Shield size={16} />
          App Availability Management
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Control which apps are visible to each organization. Click checkboxes to enable/disable.
        </p>
      </div>

      {/* Matrix Table */}
      <div className="border-2 border-gray-400 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-200 border-b-2 border-gray-400">
              <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                Organization
              </th>
              {apps.map((app) => (
                <th key={app._id} className="px-3 py-2 text-center font-bold min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>{app.icon || "📦"}</span>
                    <span>{app.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <OrganizationRow
                key={org._id}
                organization={org}
                apps={apps}
                availabilities={availabilities.filter((a) => a.organizationId === org._id)}
                sessionId={sessionId!}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
            <Check size={10} className="text-white" />
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
            <X size={10} className="text-white" />
          </div>
          <span>Not Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
            <Loader2 size={10} className="animate-spin" />
          </div>
          <span>Updating...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual organization row with app availability toggles
 */
function OrganizationRow({
  organization,
  apps,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apps: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingAppId, setLoadingAppId] = useState<Id<"apps"> | null>(null);
  const setAvailability = useMutation(api.appAvailability.setAppAvailability);

  const handleToggle = async (appId: Id<"apps">, currentState: boolean) => {
    try {
      setLoadingAppId(appId);
      await setAvailability({
        sessionId,
        organizationId: organization._id,
        appId,
        isAvailable: !currentState,
      });
    } catch (error) {
      console.error("Failed to toggle app availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingAppId(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {apps.map((app) => {
        const availability = availabilities.find((a) => a.appId === app._id);
        const isAvailable = availability?.isAvailable ?? false;
        const isLoading = loadingAppId === app._id;

        return (
          <td key={app._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(app._id, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${app.name} for ${organization.name}`
                  : `Click to enable ${app.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
