"use client";

/**
 * BUILDER PREVIEW PANEL
 *
 * Live preview of the AI-generated page.
 * Shows the rendered page with device viewport toggles.
 */

import { useState } from "react";
import { useBuilder } from "@/contexts/builder-context";
import { PageRenderer } from "./page-renderer";
import {
  Monitor,
  Tablet,
  Smartphone,
  Edit3,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type DeviceMode = "desktop" | "tablet" | "mobile";

const deviceWidths: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export function BuilderPreviewPanel() {
  const {
    pageSchema,
    selectedSectionId,
    setSelectedSectionId,
    isEditMode,
    setIsEditMode,
    isGenerating,
  } = useBuilder();

  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        {/* Device toggles */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`p-2 rounded-md transition-colors ${
              deviceMode === "desktop"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`p-2 rounded-md transition-colors ${
              deviceMode === "tablet"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Tablet view"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`p-2 rounded-md transition-colors ${
              deviceMode === "mobile"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Edit/Preview toggle */}
          {pageSchema && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setIsEditMode(false)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  !isEditMode
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isEditMode
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          )}

          {/* Open in new tab (would work after saving) */}
          {pageSchema && (
            <button
              className="p-2 text-gray-400 cursor-not-allowed"
              title="Save to open in new tab"
              disabled
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div
          className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
          style={{
            width: deviceWidths[deviceMode],
            maxWidth: "100%",
            minHeight: deviceMode === "desktop" ? "100%" : "600px",
          }}
        >
          {/* Loading state */}
          {isGenerating && !pageSchema && (
            <div className="h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Generating your page...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isGenerating && !pageSchema && (
            <div className="h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Monitor className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Your page will appear here
                </h3>
                <p className="text-gray-500 max-w-sm">
                  Start by describing the landing page you want to create in the
                  chat panel.
                </p>
              </div>
            </div>
          )}

          {/* Rendered page */}
          {pageSchema && (
            <PageRenderer
              schema={pageSchema}
              selectedSectionId={selectedSectionId}
              isEditMode={isEditMode}
              onSectionClick={setSelectedSectionId}
            />
          )}
        </div>
      </div>

      {/* Section info bar (when section selected) */}
      {selectedSectionId && pageSchema && (
        <div className="px-4 py-2 border-t border-gray-200 bg-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="text-sm text-indigo-900">
              Section selected:{" "}
              <span className="font-medium">
                {pageSchema.sections.find((s) => s.id === selectedSectionId)
                  ?.type || selectedSectionId}
              </span>
            </span>
          </div>
          <button
            onClick={() => setSelectedSectionId(null)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
