"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { CHANNELS, MODELS, SUBTYPES, formatAgentChannelLabel } from "./types"

type AgentFieldPatch = Record<string, unknown>

interface AgentFieldPatchEditorProps {
  patch: AgentFieldPatch
  currentValues?: Record<string, unknown>
  disabled?: boolean
  onPatchChange: (nextPatch: AgentFieldPatch) => void
  onValidationChange?: (hasErrors: boolean) => void
}

type EditorFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "string_list"
  | "faq_entries"
  | "boolean"
  | "channel_bindings"
  | "json"

interface EditorFieldConfig {
  field: string
  label: string
  type: EditorFieldType
  placeholder?: string
  description?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  step?: number
}

const FIELD_CONFIGS: EditorFieldConfig[] = [
  { field: "name", label: "Name", type: "text", placeholder: "Anne Operator" },
  { field: "displayName", label: "Display Name", type: "text", placeholder: "Anne" },
  { field: "subtype", label: "Subtype", type: "select", options: SUBTYPES.map((entry) => ({ value: entry.value, label: entry.label })) },
  {
    field: "agentClass",
    label: "Agent Class",
    type: "select",
    options: [
      { value: "internal_operator", label: "Internal operator" },
      { value: "external_customer_facing", label: "External customer-facing" },
    ],
  },
  { field: "personality", label: "Personality", type: "textarea", placeholder: "Friendly, concise, and practical." },
  { field: "language", label: "Language", type: "text", placeholder: "en" },
  {
    field: "additionalLanguages",
    label: "Additional Languages",
    type: "string_list",
    placeholder: "de\nfr",
    description: "One language code per line.",
  },
  { field: "voiceLanguage", label: "Voice Language", type: "text", placeholder: "en" },
  { field: "elevenLabsVoiceId", label: "ElevenLabs Voice ID", type: "text", placeholder: "voice_xxxxx" },
  {
    field: "brandVoiceInstructions",
    label: "Brand Voice Instructions",
    type: "textarea",
    placeholder: "Tone and style guidance for the agent.",
  },
  {
    field: "systemPrompt",
    label: "System Prompt",
    type: "textarea",
    placeholder: "Additional saved instructions for this agent.",
  },
  {
    field: "faqEntries",
    label: "FAQ Entries",
    type: "faq_entries",
    description: "Edit question/answer pairs that should be stored on the agent.",
  },
  {
    field: "knowledgeBaseTags",
    label: "Knowledge Base Tags",
    type: "string_list",
    placeholder: "shipping\nreturns",
    description: "One tag per line.",
  },
  { field: "toolProfile", label: "Tool Profile", type: "text", placeholder: "support" },
  {
    field: "enabledTools",
    label: "Enabled Tools",
    type: "string_list",
    placeholder: "query_org_data\nlist_forms",
    description: "One tool name per line.",
  },
  {
    field: "disabledTools",
    label: "Disabled Tools",
    type: "string_list",
    placeholder: "process_payment",
    description: "One tool name per line.",
  },
  {
    field: "autonomyLevel",
    label: "Autonomy Level",
    type: "select",
    options: [
      { value: "supervised", label: "Supervised" },
      { value: "sandbox", label: "Sandbox" },
      { value: "autonomous", label: "Autonomous" },
      { value: "delegation", label: "Delegation" },
      { value: "draft_only", label: "Draft only" },
    ],
  },
  { field: "maxMessagesPerDay", label: "Max Messages / Day", type: "number", min: 0, step: 1 },
  { field: "maxCostPerDay", label: "Max Cost / Day", type: "number", min: 0, step: 0.01 },
  {
    field: "requireApprovalFor",
    label: "Require Approval For",
    type: "string_list",
    placeholder: "process_payment\nmanage_bookings",
    description: "One tool name per line.",
  },
  {
    field: "modelId",
    label: "Model",
    type: "select",
    options: MODELS.map((entry) => ({ value: entry.value, label: entry.label })),
  },
  { field: "temperature", label: "Temperature", type: "number", min: 0, step: 0.1 },
  { field: "maxTokens", label: "Max Tokens", type: "number", min: 1, step: 1 },
  { field: "channelBindings", label: "Channel Bindings", type: "channel_bindings" },
  {
    field: "blockedTopics",
    label: "Blocked Topics",
    type: "string_list",
    placeholder: "legal advice\ncompetitor pricing",
    description: "One topic per line.",
  },
  {
    field: "telephonyConfig",
    label: "Telephony Config",
    type: "json",
    description: "Advanced JSON editor for telephony config patches.",
  },
  {
    field: "escalationPolicy",
    label: "Escalation Policy",
    type: "json",
    description: "Advanced JSON editor for the saved escalation policy.",
  },
  { field: "unifiedPersonality", label: "Unified Personality", type: "boolean" },
]

const FIELD_CONFIG_BY_NAME = new Map(
  FIELD_CONFIGS.map((config) => [config.field, config]),
)
const JSON_FIELDS = new Set(["telephonyConfig", "escalationPolicy"])

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function formatJsonValue(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

function parseStringListValue(rawValue: string): string[] {
  const deduped = new Set<string>()
  for (const entry of rawValue.split(/\n|,/)) {
    const normalized = entry.trim()
    if (!normalized) {
      continue
    }
    deduped.add(normalized)
  }
  return Array.from(deduped)
}

function readFaqEntries(value: unknown): Array<{ q: string; a: string }> {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is { q?: unknown; a?: unknown } => !!entry && typeof entry === "object")
    .map((entry) => ({
      q: typeof entry.q === "string" ? entry.q : "",
      a: typeof entry.a === "string" ? entry.a : "",
    }))
}

function readChannelBindings(
  value: unknown,
): Array<{ channel: string; enabled: boolean }> {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => {
      return !!entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).channel === "string"
    })
    .map((entry) => ({
      channel: String(entry.channel).trim().toLowerCase(),
      enabled: entry.enabled === true,
    }))
}

function buildDefaultFieldValue(
  field: string,
  currentValues?: Record<string, unknown>,
): unknown {
  const currentValue = currentValues?.[field]
  if (currentValue !== undefined && currentValue !== null) {
    return cloneValue(currentValue)
  }

  switch (field) {
    case "agentClass":
      return "internal_operator"
    case "autonomyLevel":
      return "supervised"
    case "maxMessagesPerDay":
      return 100
    case "maxCostPerDay":
      return 5
    case "temperature":
      return 0.7
    case "maxTokens":
      return 4096
    case "unifiedPersonality":
      return true
    case "faqEntries":
    case "additionalLanguages":
    case "knowledgeBaseTags":
    case "enabledTools":
    case "disabledTools":
    case "requireApprovalFor":
    case "channelBindings":
    case "blockedTopics":
      return []
    case "telephonyConfig":
    case "escalationPolicy":
      return {}
    default:
      return ""
  }
}

function resolveSelectOptions(
  config: EditorFieldConfig,
  currentValue: unknown,
): Array<{ value: string; label: string }> {
  const options = config.options ? [...config.options] : []
  if (typeof currentValue !== "string" || currentValue.trim().length === 0) {
    return options
  }
  if (options.some((option) => option.value === currentValue)) {
    return options
  }
  return [
    ...options,
    {
      value: currentValue,
      label: `Custom (${currentValue})`,
    },
  ]
}

function getOrderedPatchFields(patch: AgentFieldPatch): string[] {
  return Object.keys(patch).sort((left, right) => {
    const leftIndex = FIELD_CONFIGS.findIndex((config) => config.field === left)
    const rightIndex = FIELD_CONFIGS.findIndex((config) => config.field === right)
    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right)
    }
    if (leftIndex === -1) {
      return 1
    }
    if (rightIndex === -1) {
      return -1
    }
    return leftIndex - rightIndex
  })
}

export function AgentFieldPatchEditor({
  patch,
  currentValues,
  disabled = false,
  onPatchChange,
  onValidationChange,
}: AgentFieldPatchEditorProps) {
  const [fieldToAdd, setFieldToAdd] = useState("")
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({})
  const [jsonErrors, setJsonErrors] = useState<Record<string, string | null>>({})

  const orderedFields = useMemo(() => getOrderedPatchFields(patch), [patch])
  const availableFields = useMemo(() => {
    return FIELD_CONFIGS.filter((config) => !Object.prototype.hasOwnProperty.call(patch, config.field))
  }, [patch])

  useEffect(() => {
    setJsonDrafts((current) => {
      const nextDrafts = { ...current }
      for (const field of JSON_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(patch, field)) {
          nextDrafts[field] = formatJsonValue(patch[field])
        } else {
          delete nextDrafts[field]
        }
      }
      return nextDrafts
    })
    setJsonErrors((current) => {
      const nextErrors = { ...current }
      for (const field of JSON_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(patch, field)) {
          delete nextErrors[field]
        }
      }
      return nextErrors
    })
  }, [patch])

  useEffect(() => {
    onValidationChange?.(
      Object.values(jsonErrors).some((value) => typeof value === "string" && value.length > 0),
    )
  }, [jsonErrors, onValidationChange])

  const updatePatchField = (field: string, value: unknown) => {
    onPatchChange({
      ...patch,
      [field]: value,
    })
  }

  const removePatchField = (field: string) => {
    const nextPatch = { ...patch }
    delete nextPatch[field]
    onPatchChange(nextPatch)
    setJsonDrafts((current) => {
      const nextDrafts = { ...current }
      delete nextDrafts[field]
      return nextDrafts
    })
    setJsonErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
  }

  const addPatchField = () => {
    if (!fieldToAdd) {
      return
    }
    updatePatchField(fieldToAdd, buildDefaultFieldValue(fieldToAdd, currentValues))
    setFieldToAdd("")
  }

  const renderFieldEditor = (field: string) => {
    const config = FIELD_CONFIG_BY_NAME.get(field)
    if (!config) {
      return (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
            This field is not editable in the approval editor yet. Remove it from the patch or keep it for diff-only review.
          </p>
          <pre
            className="rounded border p-2 text-[11px] whitespace-pre-wrap break-words"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-surface)",
              color: "var(--shell-text)",
            }}
          >
            {formatJsonValue(patch[field])}
          </pre>
        </div>
      )
    }

    if (config.type === "text" || config.type === "textarea") {
      const Element = config.type === "textarea" ? "textarea" : "input"
      return (
        <Element
          value={typeof patch[field] === "string" ? patch[field] : ""}
          onChange={(event) => updatePatchField(field, event.target.value)}
          placeholder={config.placeholder}
          disabled={disabled}
          aria-label={config.label}
          rows={config.type === "textarea" ? 4 : undefined}
          className="w-full rounded border px-2 py-1.5 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-text)",
          }}
        />
      )
    }

    if (config.type === "number") {
      const numericValue =
        typeof patch[field] === "number" && Number.isFinite(patch[field])
          ? String(patch[field])
          : ""
      return (
        <input
          type="number"
          value={numericValue}
          min={config.min}
          step={config.step}
          aria-label={config.label}
          onChange={(event) => {
            if (event.target.value === "") {
              return
            }
            const parsed = Number(event.target.value)
            if (Number.isFinite(parsed)) {
              updatePatchField(field, parsed)
            }
          }}
          disabled={disabled}
          className="w-full rounded border px-2 py-1.5 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-text)",
          }}
        />
      )
    }

    if (config.type === "select") {
      const options = resolveSelectOptions(config, patch[field])
      return (
        <select
          value={typeof patch[field] === "string" ? patch[field] : ""}
          onChange={(event) => updatePatchField(field, event.target.value)}
          disabled={disabled}
          aria-label={config.label}
          className="w-full rounded border px-2 py-1.5 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-text)",
          }}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (config.type === "string_list") {
      return (
        <textarea
          value={Array.isArray(patch[field]) ? (patch[field] as string[]).join("\n") : ""}
          onChange={(event) => updatePatchField(field, parseStringListValue(event.target.value))}
          placeholder={config.placeholder}
          disabled={disabled}
          aria-label={config.label}
          rows={4}
          className="w-full rounded border px-2 py-1.5 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-text)",
          }}
        />
      )
    }

    if (config.type === "faq_entries") {
      const faqEntries = readFaqEntries(patch[field])
      return (
        <div className="space-y-3">
          {faqEntries.length === 0 && (
            <p className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
              No FAQ entries in this patch yet.
            </p>
          )}
          {faqEntries.map((entry, index) => (
            <div
              key={`${field}-${index}`}
              className="rounded border p-3 space-y-2"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-surface)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold" style={{ color: "var(--shell-text)" }}>
                  FAQ {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextEntries = faqEntries.filter((_, entryIndex) => entryIndex !== index)
                    updatePatchField(field, nextEntries)
                  }}
                  disabled={disabled}
                  className="rounded border px-2 py-1 text-[11px]"
                  style={{
                    borderColor: "var(--shell-border)",
                    background: "var(--shell-input-surface)",
                    color: "var(--shell-text)",
                  }}
                >
                  Remove
                </button>
              </div>
              <input
                value={entry.q}
                onChange={(event) => {
                  const nextEntries = faqEntries.slice()
                  nextEntries[index] = {
                    ...nextEntries[index],
                    q: event.target.value,
                  }
                  updatePatchField(field, nextEntries)
                }}
                placeholder="Question"
                disabled={disabled}
                aria-label={`${config.label} Question ${index + 1}`}
                className="w-full rounded border px-2 py-1.5 text-xs"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-text)",
                }}
              />
              <textarea
                value={entry.a}
                onChange={(event) => {
                  const nextEntries = faqEntries.slice()
                  nextEntries[index] = {
                    ...nextEntries[index],
                    a: event.target.value,
                  }
                  updatePatchField(field, nextEntries)
                }}
                placeholder="Answer"
                disabled={disabled}
                aria-label={`${config.label} Answer ${index + 1}`}
                rows={3}
                className="w-full rounded border px-2 py-1.5 text-xs"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-text)",
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              updatePatchField(field, [...faqEntries, { q: "", a: "" }])
            }}
            disabled={disabled}
            className="rounded border px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-surface)",
              color: "var(--shell-text)",
            }}
          >
            Add FAQ Entry
          </button>
        </div>
      )
    }

    if (config.type === "boolean") {
      return (
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--shell-text)" }}>
          <input
            type="checkbox"
            checked={patch[field] === true}
            onChange={(event) => updatePatchField(field, event.target.checked)}
            disabled={disabled}
            aria-label={config.label}
          />
          <span>Enabled</span>
        </label>
      )
    }

    if (config.type === "channel_bindings") {
      const bindings = readChannelBindings(patch[field])
      const bindingNames = new Set<string>(CHANNELS)
      for (const entry of bindings) {
        bindingNames.add(entry.channel)
      }
      const currentBindings = readChannelBindings(currentValues?.channelBindings)
      for (const entry of currentBindings) {
        bindingNames.add(entry.channel)
      }
      const allChannels = Array.from(bindingNames).sort((left, right) => left.localeCompare(right))

      return (
        <div className="space-y-2">
          {allChannels.map((channel) => {
            const existingBinding = bindings.find((entry) => entry.channel === channel)
            return (
              <label
                key={channel}
                className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text)",
                }}
              >
                <input
                  type="checkbox"
                  checked={existingBinding?.enabled === true}
                  onChange={(event) => {
                    const nextBindings = bindings.filter((entry) => entry.channel !== channel)
                    nextBindings.push({
                      channel,
                      enabled: event.target.checked,
                    })
                    nextBindings.sort((left, right) => left.channel.localeCompare(right.channel))
                    updatePatchField(field, nextBindings)
                  }}
                  disabled={disabled}
                  aria-label={`${config.label} ${formatAgentChannelLabel(channel)}`}
                />
                <span>{formatAgentChannelLabel(channel)}</span>
              </label>
            )
          })}
        </div>
      )
    }

    if (config.type === "json") {
      const draftValue = jsonDrafts[field] ?? formatJsonValue(patch[field])
      const error = jsonErrors[field]
      return (
        <div className="space-y-2">
          <textarea
            value={draftValue}
            onChange={(event) => {
              const nextDraft = event.target.value
              setJsonDrafts((current) => ({
                ...current,
                [field]: nextDraft,
              }))

              if (nextDraft.trim().length === 0) {
                setJsonErrors((current) => ({
                  ...current,
                  [field]: null,
                }))
                updatePatchField(field, {})
                return
              }

              try {
                const parsed = JSON.parse(nextDraft)
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                  throw new Error("Expected a JSON object.")
                }
                setJsonErrors((current) => ({
                  ...current,
                  [field]: null,
                }))
                updatePatchField(field, parsed)
              } catch (parseError) {
                setJsonErrors((current) => ({
                  ...current,
                  [field]:
                    parseError instanceof Error
                      ? parseError.message
                      : "Invalid JSON object.",
                }))
              }
            }}
            disabled={disabled}
            aria-label={config.label}
            rows={10}
            className="w-full rounded border px-2 py-1.5 font-mono text-[11px]"
            style={{
              borderColor: error ? "var(--error)" : "var(--shell-border)",
              background: "var(--shell-input-surface)",
              color: "var(--shell-text)",
            }}
          />
          {error && (
            <p className="text-[11px]" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded border p-3"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface)",
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
              Edit Proposed Patch
            </p>
            <p className="text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
              Edit the exact fields that will be previewed and, after approval, applied.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <select
            value={fieldToAdd}
            onChange={(event) => setFieldToAdd(event.target.value)}
            disabled={disabled || availableFields.length === 0}
            aria-label="Add patch field"
            className="min-w-0 flex-1 rounded border px-2 py-1.5 text-xs"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
              color: "var(--shell-text)",
            }}
          >
            <option value="">Add field to patch…</option>
            {availableFields.map((config) => (
              <option key={config.field} value={config.field}>
                {config.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addPatchField}
            disabled={disabled || !fieldToAdd}
            className="inline-flex items-center justify-center gap-1 rounded border px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
              color: "var(--shell-text)",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Field
          </button>
        </div>
      </div>

      {orderedFields.length === 0 && (
        <div
          className="rounded border p-3 text-xs"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface)",
            color: "var(--shell-text-dim)",
          }}
        >
          The patch is currently empty. Add fields above, then refresh the proposal preview.
        </div>
      )}

      {orderedFields.map((field) => {
        const config = FIELD_CONFIG_BY_NAME.get(field)
        return (
          <div
            key={field}
            className="rounded border p-3"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                  {config?.label || field}
                </p>
                {config?.description && (
                  <p className="mt-1 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                    {config.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePatchField(field)}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px]"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text)",
                }}
                aria-label={`Remove ${config?.label || field} from patch`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
            {renderFieldEditor(field)}
          </div>
        )
      })}
    </div>
  )
}
