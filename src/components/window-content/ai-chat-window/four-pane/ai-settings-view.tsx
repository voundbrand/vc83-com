"use client"

import { useState } from "react"
import { SlidersHorizontal, Save, X, AlertCircle, RefreshCw } from "lucide-react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { useNotification } from "@/hooks/use-notification"

interface AISettingsViewProps {
  onClose: () => void
}

export function AISettingsView({ onClose }: AISettingsViewProps) {
  const { organizationId } = useAIChatContext()
  const notification = useNotification()

  // Fetch current AI settings
  const aiSettings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  )

  // Mutation to save settings
  const updateSettings = useMutation(api.ai.settings.updateToolExecutionSettings)

  // Local state for settings - initialize from backend
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(
    aiSettings?.autoRecovery?.enabled ?? true
  )
  const [maxRetries, setMaxRetries] = useState(
    aiSettings?.autoRecovery?.maxRetries ?? 3
  )
  const [requireApprovalPerRetry, setRequireApprovalPerRetry] = useState(
    aiSettings?.autoRecovery?.requireApprovalPerRetry ?? true
  )
  const [toolApprovalMode, setToolApprovalMode] = useState<"all" | "dangerous" | "none">(
    aiSettings?.toolApprovalMode ?? "all"
  )

  const handleSave = async () => {
    if (!organizationId) {
      notification.error("Error", "Organization ID not found")
      return
    }

    try {
      await updateSettings({
        organizationId,
        humanInLoopEnabled: toolApprovalMode === "all", // For now, map "all" mode to humanInLoopEnabled
        toolApprovalMode,
        autoRecovery: {
          enabled: autoRecoveryEnabled,
          maxRetries,
          requireApprovalPerRetry,
        },
      })
      notification.success("Settings Saved", "AI settings have been updated successfully")
      onClose()
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save settings"
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 p-3 border-b-2"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-title-bg)'
        }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--win95-text)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            AI Settings
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
          title="Close settings"
        >
          <X className="w-4 h-4" style={{ color: 'var(--win95-text-muted)' }} />
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Tool Approval Mode */}
        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            Tool Approval Mode
          </label>
          <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
            Control when AI asks for permission before executing tools
          </p>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={toolApprovalMode === "all"}
                onChange={() => setToolApprovalMode("all")}
                className="w-4 h-4"
              />
              <div>
                <span className="text-sm" style={{ color: 'var(--win95-text)' }}>
                  Approve all tools
                </span>
                <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                  AI asks permission for every action (safest)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer opacity-50">
              <input
                type="radio"
                checked={toolApprovalMode === "dangerous"}
                onChange={() => setToolApprovalMode("dangerous")}
                className="w-4 h-4"
                disabled
              />
              <div>
                <span className="text-sm" style={{ color: 'var(--win95-text)' }}>
                  Approve dangerous tools only
                </span>
                <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                  AI runs safe tools automatically (Coming soon)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer opacity-50">
              <input
                type="radio"
                checked={toolApprovalMode === "none"}
                onChange={() => setToolApprovalMode("none")}
                className="w-4 h-4"
                disabled
              />
              <div>
                <span className="text-sm" style={{ color: 'var(--win95-text)' }}>
                  No approval required
                </span>
                <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                  AI runs all tools automatically (Coming soon)
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: 'var(--win95-border-light)' }} />

        {/* Auto-Recovery Settings */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--win95-text)' }} />
            <div className="flex-1">
              <label className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                Auto-Recovery
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--win95-text-muted)' }}>
                When a tool fails, AI automatically analyzes the error and proposes a corrected approach
              </p>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRecoveryEnabled}
              onChange={(e) => setAutoRecoveryEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm" style={{ color: 'var(--win95-text)' }}>
              Enable auto-recovery
            </span>
          </label>

          {/* Max Retries */}
          {autoRecoveryEnabled && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--win95-text)' }}>
                  Max retry attempts
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-8 text-center" style={{ color: 'var(--win95-text)' }}>
                    {maxRetries}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                  AI will attempt to fix errors up to {maxRetries} time{maxRetries > 1 ? 's' : ''}
                </p>
              </div>

              {/* Require Approval Per Retry */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApprovalPerRetry}
                  onChange={(e) => setRequireApprovalPerRetry(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm" style={{ color: 'var(--win95-text)' }}>
                    Require approval for each retry
                  </span>
                  <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
                    You'll approve each corrected attempt before execution
                  </p>
                </div>
              </label>
            </>
          )}
        </div>

        <div className="border-t" style={{ borderColor: 'var(--win95-border-light)' }} />

        {/* Info Box */}
        <div
          className="p-3 rounded border flex gap-2"
          style={{
            borderColor: 'var(--info)',
            background: 'var(--info-bg)'
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--win95-text)' }}>
              How Auto-Recovery Works
            </p>
            <ul className="text-xs space-y-1" style={{ color: 'var(--win95-text-muted)' }}>
              <li>• Tool fails with helpful error message</li>
              <li>• Error is fed back to AI conversation</li>
              <li>• AI analyzes error and proposes corrected approach</li>
              <li>• You approve the retry (if approval required)</li>
              <li>• Process repeats until success or max retries reached</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer - Save Button */}
      <div
        className="p-3 border-t-2"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-bg)'
        }}
      >
        <button
          onClick={handleSave}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--success)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--win95-button-face)';
            e.currentTarget.style.color = 'var(--win95-text)';
          }}
          className="w-full px-3 py-2 text-sm font-medium rounded border transition-colors flex items-center justify-center gap-2"
          style={{
            borderColor: 'var(--win95-border-light)',
            background: 'var(--win95-button-face)',
            color: 'var(--win95-text)'
          }}
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  )
}
