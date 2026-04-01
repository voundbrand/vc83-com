"use client"

import { useEffect, useMemo, useState } from "react"
import { useAction, useQuery } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useWindowManager } from "@/hooks/use-window-manager"
import { AIChatWindow } from "../ai-chat-window"
import { getVoiceAssistantWindowContract } from "../ai-chat-window/voice-assistant-contract"
import {
  addAIWritebackEventListener,
  BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION,
  BOOKING_SETUP_WRITEBACK_EVENT,
  type BookingSetupCourseWriteback,
  type BookingSetupWizardWritebackEventDetail,
} from "@/lib/ai/ui-writeback-bridge"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"

// Workaround for Convex deep type instantiation issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _api = require("../../../../convex/_generated/api").api
} catch {
  _api = null
}

type SetupTemplate = "sailing_school_two_boats" | "custom"

interface SetupInventoryGroupRow {
  id: string
  label: string
  capacity: number
}

interface SetupCourseRow {
  courseId: string
  displayName: string
  bookingDurationMinutes: number
  availableTimes: string
  bookingResourceId: string
  checkoutProductId: string
  checkoutPublicUrl: string
  isMultiDay: boolean
}

interface BookingSetupDiagnostic {
  courseId: string
  displayName: string
  bookingResourceId: string | null
  checkoutProductId: string | null
  checkoutPublicUrl: string | null
  resourceCandidates: Array<{ id: string; name: string }>
  checkoutCandidates: Array<{ id: string; name: string }>
  checkoutPublicUrlCandidates: string[]
  warnings: string[]
}

interface BookingSurfaceBindingRow {
  bindingId: string
  appSlug: string
  surfaceType: string
  surfaceKey: string
  enabled: boolean
  priority: number
  status: string
  updatedAt: number
  name: string | null
}

interface ConfigureBookingWorkflowResult {
  success: boolean
  action: string
  message?: string
  error?: string
  data?: {
    diagnostics?: BookingSetupDiagnostic[]
    warnings?: string[]
    envMapping?: Record<string, string>
    bookingCatalogJson?: string
    legacyBindingsJson?: string
    calendarReadiness?: Record<string, unknown> | null
    bindings?: BookingSurfaceBindingRow[]
    questions?: BookingSetupInterviewQuestion[]
    hints?: string[]
    requiredSequence?: string[]
    nextAction?: string
    suggestedCatalog?: Record<string, unknown>
    catalog?: Record<string, unknown>
    payload?: Record<string, unknown>
    total?: number
    bindingId?: string
    [key: string]: unknown
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConfigureBookingWorkflowAction = (args: any) => Promise<ConfigureBookingWorkflowResult>

type SetupWorkflowAction =
  | "generate_booking_setup_blueprint"
  | "upsert_booking_surface_binding"
  | "list_booking_surface_bindings"
  | "bootstrap_booking_surface"

type SetupWorkflowMode = "preview" | "execute" | "interview"

const DEFAULT_TIMES_CSV = "09:00,10:00,11:00,13:00,14:00,15:00"

const SAILING_PRESET_INVENTORY_GROUPS: SetupInventoryGroupRow[] = [
  { id: "fraukje", label: "Fraukje", capacity: 4 },
  { id: "rose", label: "Rose", capacity: 4 },
]

const SAILING_PRESET_COURSES: SetupCourseRow[] = [
  {
    courseId: "schnupper",
    displayName: "Taster course",
    bookingDurationMinutes: 180,
    availableTimes: "09:00,13:00",
    bookingResourceId: "",
    checkoutProductId: "",
    checkoutPublicUrl: "",
    isMultiDay: false,
  },
  {
    courseId: "grund",
    displayName: "Weekend course",
    bookingDurationMinutes: 480,
    availableTimes: DEFAULT_TIMES_CSV,
    bookingResourceId: "",
    checkoutProductId: "",
    checkoutPublicUrl: "",
    isMultiDay: true,
  },
  {
    courseId: "intensiv",
    displayName: "Intensive sailing license course",
    bookingDurationMinutes: 480,
    availableTimes: DEFAULT_TIMES_CSV,
    bookingResourceId: "",
    checkoutProductId: "",
    checkoutPublicUrl: "",
    isMultiDay: true,
  },
]

function cloneInventoryGroups(
  value: SetupInventoryGroupRow[]
): SetupInventoryGroupRow[] {
  return value.map((group) => ({ ...group }))
}

function cloneCourses(value: SetupCourseRow[]): SetupCourseRow[] {
  return value.map((course) => ({ ...course }))
}

function resolveTemplatePreset(
  template: SetupTemplate
): {
  timezone: string
  defaultTimes: string
  inventoryGroups: SetupInventoryGroupRow[]
  courses: SetupCourseRow[]
} {
  if (template === "sailing_school_two_boats") {
    return {
      timezone: "Europe/Berlin",
      defaultTimes: DEFAULT_TIMES_CSV,
      inventoryGroups: cloneInventoryGroups(SAILING_PRESET_INVENTORY_GROUPS),
      courses: cloneCourses(SAILING_PRESET_COURSES),
    }
  }

  return {
    timezone: "Europe/Berlin",
    defaultTimes: DEFAULT_TIMES_CSV,
    inventoryGroups: [],
    courses: [],
  }
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

function normalizeTimeSlotsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const unique = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue
    }
    const normalized = entry.trim()
    if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      unique.add(normalized)
    }
  }
  return Array.from(unique)
}

function encodeUtf8Base64(value: unknown): string | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const json = JSON.stringify(value)
    const bytes = new TextEncoder().encode(json)
    let binary = ""
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return window.btoa(binary)
  } catch {
    return null
  }
}

function toLocalDate(value: number): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return "-"
  }
  return date.toLocaleString()
}

interface BookingSetupInterviewQuestion {
  id: string
  title: string
  description: string
  fieldPath: string
  answerType: string
  required: boolean
  defaultValue?: unknown
  options?: string[]
}

function normalizeCatalogFromUnknown(
  value: unknown,
  fallbackTimesCsv: string
): {
  timezone?: string
  defaultTimesCsv?: string
  inventoryGroups?: SetupInventoryGroupRow[]
  courses?: SetupCourseRow[]
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const timezone = normalizeOptionalString(record.timezone) || undefined
  const defaultTimes = normalizeTimeSlotsFromUnknown(record.defaultAvailableTimes)
  const fallbackTimes = defaultTimes.length > 0
    ? defaultTimes.join(",")
    : fallbackTimesCsv

  const inventoryGroups = Array.isArray(record.inventoryGroups)
    ? record.inventoryGroups
      .map((rawGroup) => {
        if (!rawGroup || typeof rawGroup !== "object") {
          return null
        }
        const group = rawGroup as Record<string, unknown>
        const id = normalizeOptionalString(group.id)?.toLowerCase()
        const label = normalizeOptionalString(group.label)
        const capacity = normalizePositiveInteger(group.capacity)
        if (!id || !label || !capacity) {
          return null
        }
        return { id, label, capacity }
      })
      .filter((entry): entry is SetupInventoryGroupRow => Boolean(entry))
    : undefined

  const courses = Array.isArray(record.courses)
    ? record.courses
      .map((rawCourse) => {
        if (!rawCourse || typeof rawCourse !== "object") {
          return null
        }
        const course = rawCourse as Record<string, unknown>
        const courseId = normalizeOptionalString(
          course.courseId || course.id
        )?.toLowerCase()
        const bookingDurationMinutes = normalizePositiveInteger(
          course.bookingDurationMinutes
        )
        if (!courseId || !bookingDurationMinutes) {
          return null
        }
        const displayName = normalizeOptionalString(course.displayName) || courseId
        const availableTimes = normalizeTimeSlotsFromUnknown(course.availableTimes)
        return {
          courseId,
          displayName,
          bookingDurationMinutes,
          availableTimes:
            availableTimes.length > 0 ? availableTimes.join(",") : fallbackTimes,
          bookingResourceId: normalizeOptionalString(course.bookingResourceId) || "",
          checkoutProductId: normalizeOptionalString(course.checkoutProductId) || "",
          checkoutPublicUrl: normalizeOptionalString(course.checkoutPublicUrl) || "",
          isMultiDay: course.isMultiDay === true,
        }
      })
      .filter((entry): entry is SetupCourseRow => Boolean(entry))
    : undefined

  const hasValues = Boolean(
    timezone
    || defaultTimes.length > 0
    || (inventoryGroups && inventoryGroups.length >= 0)
    || (courses && courses.length >= 0)
  )
  if (!hasValues) {
    return null
  }

  return {
    timezone,
    defaultTimesCsv: defaultTimes.length > 0 ? defaultTimes.join(",") : undefined,
    inventoryGroups,
    courses,
  }
}

function resolveCatalogFromActionData(
  data: ConfigureBookingWorkflowResult["data"],
  fallbackTimesCsv: string
) {
  if (!data || typeof data !== "object") {
    return null
  }
  const topLevel = normalizeCatalogFromUnknown(
    (data as Record<string, unknown>).catalog,
    fallbackTimesCsv
  )
  if (topLevel) {
    return topLevel
  }

  const suggested = normalizeCatalogFromUnknown(
    (data as Record<string, unknown>).suggestedCatalog,
    fallbackTimesCsv
  )
  if (suggested) {
    return suggested
  }

  const payload = (data as Record<string, unknown>).payload
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return normalizeCatalogFromUnknown(
      (payload as Record<string, unknown>).runtimeConfig,
      fallbackTimesCsv
    )
  }

  return null
}

export function BookingSetupWizard() {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const { openWindow } = useWindowManager()

  const executeConfigureBookingWorkflow = useAction(
    _api?.ai?.tools?.bookingWorkflowTool?.executeConfigureBookingWorkflow
  ) as ConfigureBookingWorkflowAction

  const customPreset = useMemo(() => resolveTemplatePreset("custom"), [])
  const [setupTemplate, setSetupTemplate] =
    useState<SetupTemplate>("custom")
  const [appSlug, setAppSlug] = useState("my-app")
  const [surfaceType, setSurfaceType] = useState("booking")
  const [surfaceKey, setSurfaceKey] = useState("default")
  const [timezone, setTimezone] = useState(customPreset.timezone)
  const [defaultTimes, setDefaultTimes] = useState(customPreset.defaultTimes)
  const [bindingEnabled, setBindingEnabled] = useState(true)
  const [bindingPriority, setBindingPriority] = useState(100)
  const [inventoryGroups, setInventoryGroups] =
    useState<SetupInventoryGroupRow[]>(customPreset.inventoryGroups)
  const [courses, setCourses] = useState<SetupCourseRow[]>(customPreset.courses)

  const [diagnostics, setDiagnostics] = useState<BookingSetupDiagnostic[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [bindings, setBindings] = useState<BookingSurfaceBindingRow[]>([])
  const [interviewQuestions, setInterviewQuestions] = useState<
    BookingSetupInterviewQuestion[]
  >([])
  const [interviewHints, setInterviewHints] = useState<string[]>([])
  const [requiredSequence, setRequiredSequence] = useState<string[]>([])
  const [nextAction, setNextAction] = useState<string | null>(null)
  const [envMapping, setEnvMapping] = useState<Record<string, string>>({})
  const [bookingCatalogJson, setBookingCatalogJson] = useState("")
  const [legacyBindingsJson, setLegacyBindingsJson] = useState("")
  const [calendarReadinessJson, setCalendarReadinessJson] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const availableApps = useQuery(
    _api?.appAvailability?.getAvailableApps,
    sessionId && currentOrganization?.id
      ? { sessionId, organizationId: currentOrganization.id }
      : "skip"
  ) as Array<{ code?: string; name?: string }> | undefined

  const registeredAppSlugs = useMemo(() => {
    const slugs = new Set<string>()

    if (Array.isArray(availableApps)) {
      for (const app of availableApps) {
        if (typeof app?.code === "string" && app.code.trim()) {
          slugs.add(app.code.trim().toLowerCase())
        }
      }
    }

    for (const binding of bindings) {
      const slug = binding.appSlug?.trim().toLowerCase()
      if (slug) {
        slugs.add(slug)
      }
    }

    return Array.from(slugs).sort((left, right) =>
      left.localeCompare(right)
    )
  }, [availableApps, bindings])

  const normalizedAppSlug = appSlug.trim().toLowerCase()
  const normalizedSurfaceType = surfaceType.trim().toLowerCase()
  const normalizedSurfaceKey = surfaceKey.trim().toLowerCase()
  const appSlugIsCustom =
    !normalizedAppSlug || !registeredAppSlugs.includes(normalizedAppSlug)
  const appSlugSelectValue = appSlugIsCustom ? "__custom__" : normalizedAppSlug

  const catalogInput = useMemo(
    () => ({
      timezone,
      defaultAvailableTimes: splitCsv(defaultTimes),
      inventoryGroups: inventoryGroups.map((group) => ({
        id: group.id.trim().toLowerCase(),
        label: group.label.trim(),
        capacity: Math.max(1, Math.round(group.capacity)),
      })),
      courses: courses.map((course) => ({
        courseId: course.courseId.trim().toLowerCase(),
        displayName: course.displayName.trim(),
        bookingDurationMinutes: Math.max(
          1,
          Math.round(course.bookingDurationMinutes)
        ),
        availableTimes: splitCsv(course.availableTimes),
        bookingResourceId: course.bookingResourceId.trim() || undefined,
        checkoutProductId: course.checkoutProductId.trim() || undefined,
        checkoutPublicUrl: course.checkoutPublicUrl.trim() || undefined,
        isMultiDay: course.isMultiDay,
      })),
    }),
    [timezone, defaultTimes, inventoryGroups, courses]
  )

  const operatorPrompt = useMemo(
    () =>
      [
        "I am org owner. Configure universal booking setup for my app.",
        `appSlug=${normalizedAppSlug || "my-app"}`,
        `surface=${normalizedSurfaceType || "booking"}/${normalizedSurfaceKey || "default"}`,
        `template=${setupTemplate}`,
        "",
        "Deterministic sequence:",
        "1) configure_booking_workflow(action=bootstrap_booking_surface, mode=interview)",
        "2) Ask only for missing inventory/profile/pricing inputs.",
        "3) Return one booking_writeback_v1 block with merged wizard fields.",
        "4) configure_booking_workflow(action=bootstrap_booking_surface, mode=execute, bootstrapInput=<answers>)",
        "5) configure_booking_workflow(action=list_booking_surface_bindings)",
        "6) return PASS/FAIL with unresolved warnings and exact next action.",
      ].join("\n"),
    [normalizedAppSlug, normalizedSurfaceType, normalizedSurfaceKey, setupTemplate]
  )

  const canRun = Boolean(sessionId)
  const currentOrganizationId = currentOrganization?.id
    ? String(currentOrganization.id)
    : null

  useEffect(() => {
    const unsubscribe = addAIWritebackEventListener<BookingSetupWizardWritebackEventDetail>(
      BOOKING_SETUP_WRITEBACK_EVENT,
      (detail) => {
        if (
          !detail
          || detail.contractVersion !== BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION
        ) {
          return
        }

        const eventSourceSessionId = normalizeOptionalString(detail.sourceSessionId)
        if (eventSourceSessionId && sessionId && eventSourceSessionId !== sessionId) {
          return
        }

        const eventSourceOrgId = normalizeOptionalString(detail.sourceOrganizationId)
        if (eventSourceOrgId && currentOrganizationId && eventSourceOrgId !== currentOrganizationId) {
          return
        }

        let appliedCount = 0

        const incomingAppSlug = normalizeOptionalString(detail.appSlug)
        if (incomingAppSlug) {
          setAppSlug(incomingAppSlug.toLowerCase())
          appliedCount += 1
        }

        const incomingSurfaceType = normalizeOptionalString(detail.surfaceType)
        if (incomingSurfaceType) {
          setSurfaceType(incomingSurfaceType.toLowerCase())
          appliedCount += 1
        }

        const incomingSurfaceKey = normalizeOptionalString(detail.surfaceKey)
        if (incomingSurfaceKey) {
          setSurfaceKey(incomingSurfaceKey.toLowerCase())
          appliedCount += 1
        }

        const incomingSetupTemplate = normalizeOptionalString(detail.setupTemplate)
        if (
          incomingSetupTemplate
          && (incomingSetupTemplate === "custom"
            || incomingSetupTemplate === "sailing_school_two_boats")
        ) {
          setSetupTemplate(incomingSetupTemplate)
          appliedCount += 1
        }

        const incomingTimezone = normalizeOptionalString(detail.timezone)
        if (incomingTimezone) {
          setTimezone(incomingTimezone)
          appliedCount += 1
        }

        const incomingDefaultTimes = normalizeTimeSlotsFromUnknown(
          detail.defaultAvailableTimes
        )
        if (incomingDefaultTimes.length > 0) {
          setDefaultTimes(incomingDefaultTimes.join(","))
          appliedCount += 1
        }

        if (typeof detail.bindingEnabled === "boolean") {
          setBindingEnabled(detail.bindingEnabled)
          appliedCount += 1
        }

        if (typeof detail.priority === "number" && Number.isFinite(detail.priority)) {
          setBindingPriority(Math.round(detail.priority))
          appliedCount += 1
        }

        if (Array.isArray(detail.inventoryGroups)) {
          const nextInventoryGroups = detail.inventoryGroups
            .map((group) => {
              const id = normalizeOptionalString(group.id)?.toLowerCase()
              const label = normalizeOptionalString(group.label)
              const capacity = normalizePositiveInteger(group.capacity)
              if (!id || !label || !capacity) {
                return null
              }
              return {
                id,
                label,
                capacity,
              }
            })
            .filter((group): group is SetupInventoryGroupRow => Boolean(group))
          if (nextInventoryGroups.length > 0) {
            setInventoryGroups(nextInventoryGroups)
            appliedCount += 1
          }
        }

        if (Array.isArray(detail.courses) && detail.courses.length > 0) {
          setCourses((current) => {
            const byCourseId = new Map<string, SetupCourseRow>()
            for (const row of current) {
              byCourseId.set(row.courseId.trim().toLowerCase(), row)
            }

            for (const patch of detail.courses as BookingSetupCourseWriteback[]) {
              const courseId = normalizeOptionalString(patch.courseId)?.toLowerCase()
              if (!courseId) {
                continue
              }

              const existing = byCourseId.get(courseId)
              const availableTimes = normalizeTimeSlotsFromUnknown(
                patch.availableTimes
              )
              const bookingDurationMinutes = normalizePositiveInteger(
                patch.bookingDurationMinutes
              )
              const displayName = normalizeOptionalString(patch.displayName)
              const bookingResourceId = normalizeOptionalString(
                patch.bookingResourceId
              )
              const checkoutProductId = normalizeOptionalString(
                patch.checkoutProductId
              )
              const checkoutPublicUrl = normalizeOptionalString(
                patch.checkoutPublicUrl
              )

              const nextCourse: SetupCourseRow = {
                courseId,
                displayName: displayName || existing?.displayName || courseId,
                bookingDurationMinutes:
                  bookingDurationMinutes || existing?.bookingDurationMinutes || 60,
                availableTimes:
                  availableTimes.length > 0
                    ? availableTimes.join(",")
                    : existing?.availableTimes || defaultTimes,
                bookingResourceId:
                  bookingResourceId || existing?.bookingResourceId || "",
                checkoutProductId:
                  checkoutProductId || existing?.checkoutProductId || "",
                checkoutPublicUrl:
                  checkoutPublicUrl || existing?.checkoutPublicUrl || "",
                isMultiDay:
                  typeof patch.isMultiDay === "boolean"
                    ? patch.isMultiDay
                    : existing?.isMultiDay || false,
              }
              byCourseId.set(courseId, nextCourse)
            }

            return Array.from(byCourseId.values())
          })
          appliedCount += 1
        }

        if (Array.isArray(detail.warnings)) {
          const nextWarnings = detail.warnings
            .filter((warning): warning is string => typeof warning === "string")
            .map((warning) => warning.trim())
            .filter((warning) => warning.length > 0)
          setWarnings(nextWarnings)
          appliedCount += 1
        }

        if (appliedCount > 0) {
          setStatusError(null)
          setStatusMessage(
            "AI write-back applied. Wizard fields updated from chat."
          )
          notification.success(
            "Wizard Updated",
            "Applied AI booking setup updates to this wizard."
          )
        }
      }
    )

    return unsubscribe
  }, [currentOrganizationId, defaultTimes, notification, sessionId])

  function applyTemplateDefaults(template: SetupTemplate) {
    const preset = resolveTemplatePreset(template)
    setSetupTemplate(template)
    setTimezone(preset.timezone)
    setDefaultTimes(preset.defaultTimes)
    setInventoryGroups(preset.inventoryGroups)
    setCourses(preset.courses)
    setDiagnostics([])
    setWarnings([])
    setInterviewQuestions([])
    setInterviewHints([])
    setRequiredSequence([])
    setNextAction(null)
    setStatusMessage(
      `Template defaults loaded for "${template}".`
    )
    setStatusError(null)
  }

  function patchInventoryGroup(
    index: number,
    updates: Partial<SetupInventoryGroupRow>
  ) {
    setInventoryGroups((current) =>
      current.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...updates } : group
      )
    )
  }

  function patchCourse(index: number, updates: Partial<SetupCourseRow>) {
    setCourses((current) =>
      current.map((course, courseIndex) =>
        courseIndex === index ? { ...course, ...updates } : course
      )
    )
  }

  function applyCandidate(
    courseId: string,
    field: "bookingResourceId" | "checkoutProductId" | "checkoutPublicUrl",
    value: string
  ) {
    setCourses((current) =>
      current.map((course) =>
        course.courseId === courseId ? { ...course, [field]: value } : course
      )
    )
  }

  function updateFromActionResult(result: ConfigureBookingWorkflowResult) {
    const resultData = result.data || {}
    const normalizedCatalog = resolveCatalogFromActionData(resultData, defaultTimes)
    if (normalizedCatalog?.timezone) {
      setTimezone(normalizedCatalog.timezone)
    }
    if (normalizedCatalog?.defaultTimesCsv) {
      setDefaultTimes(normalizedCatalog.defaultTimesCsv)
    }
    if (Array.isArray(normalizedCatalog?.inventoryGroups)) {
      setInventoryGroups(normalizedCatalog.inventoryGroups)
    }
    if (Array.isArray(normalizedCatalog?.courses)) {
      setCourses(normalizedCatalog.courses)
    }
    if (Array.isArray(resultData.diagnostics)) {
      setDiagnostics(resultData.diagnostics)
    }
    if (Array.isArray(resultData.warnings)) {
      setWarnings(resultData.warnings)
    }
    if (Array.isArray(resultData.bindings)) {
      setBindings(resultData.bindings)
    }
    if (Array.isArray(resultData.questions)) {
      const questions = resultData.questions
        .filter((question): question is BookingSetupInterviewQuestion => {
          if (!question || typeof question !== "object") {
            return false
          }
          const record = question as unknown as Record<string, unknown>
          return typeof record.id === "string"
            && typeof record.title === "string"
            && typeof record.description === "string"
            && typeof record.fieldPath === "string"
            && typeof record.answerType === "string"
            && typeof record.required === "boolean"
        })
      setInterviewQuestions(questions)
    } else {
      setInterviewQuestions([])
    }
    if (Array.isArray(resultData.hints)) {
      setInterviewHints(
        resultData.hints
          .filter((hint): hint is string => typeof hint === "string")
          .map((hint) => hint.trim())
          .filter((hint) => hint.length > 0)
      )
    } else {
      setInterviewHints([])
    }
    if (Array.isArray(resultData.requiredSequence)) {
      setRequiredSequence(
        resultData.requiredSequence
          .filter((step): step is string => typeof step === "string")
          .map((step) => step.trim())
          .filter((step) => step.length > 0)
      )
    } else {
      setRequiredSequence([])
    }
    const resultNextAction =
      typeof resultData.nextAction === "string"
        ? resultData.nextAction.trim()
        : ""
    setNextAction(resultNextAction || null)
    if (resultData.envMapping && typeof resultData.envMapping === "object") {
      setEnvMapping(resultData.envMapping as Record<string, string>)
    }
    if (typeof resultData.bookingCatalogJson === "string") {
      setBookingCatalogJson(resultData.bookingCatalogJson)
    }
    if (typeof resultData.legacyBindingsJson === "string") {
      setLegacyBindingsJson(resultData.legacyBindingsJson)
    }
    if (resultData.calendarReadiness) {
      setCalendarReadinessJson(
        JSON.stringify(resultData.calendarReadiness, null, 2)
      )
    }
  }

  async function runWorkflowAction(action: SetupWorkflowAction, mode?: SetupWorkflowMode) {
    if (!canRun) {
      setStatusError(
        tWithFallback(
          "ui.app.booking.settings.setup.login_required",
          "Please sign in to run setup actions."
        )
      )
      return
    }

    setIsRunning(true)
    setStatusError(null)
    setStatusMessage(null)
    const normalizedAppSlug = appSlug.trim().toLowerCase() || "my-app"
    const normalizedSurfaceType = surfaceType.trim().toLowerCase() || "booking"
    const normalizedSurfaceKey = surfaceKey.trim().toLowerCase() || "default"
    const effectiveMode =
      mode
      || (action === "bootstrap_booking_surface" ? "interview" : "preview")
    try {
      const result = await executeConfigureBookingWorkflow({
        sessionId,
        action,
        mode: effectiveMode,
        appSlug: normalizedAppSlug,
        surfaceType: normalizedSurfaceType,
        surfaceKey: normalizedSurfaceKey,
        bindingEnabled,
        priority: bindingPriority,
        setupTemplate,
        catalogInput,
        includeCalendarReadiness: true,
        bootstrapInput:
          action === "bootstrap_booking_surface"
            ? {
                catalogInput,
                checkoutStrategy: "per_course",
                publishCheckouts: true,
                reuseExistingMappings: true,
              }
            : undefined,
      })

      if (!result.success) {
        throw new Error(result.error || "Setup action failed")
      }

      updateFromActionResult(result)
      setStatusMessage(result.message || "Action completed.")
      setAppSlug(normalizedAppSlug)
      setSurfaceType(normalizedSurfaceType)
      setSurfaceKey(normalizedSurfaceKey)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Setup action failed"
      setStatusError(message)
    } finally {
      setIsRunning(false)
    }
  }

  function openBookingSetupChat() {
    if (!sessionId) {
      setStatusError(
        tWithFallback(
          "ui.app.booking.settings.setup.login_required",
          "Please sign in to run setup actions."
        )
      )
      return
    }

    const sourceOrganizationId = currentOrganization?.id
      ? String(currentOrganization.id)
      : null
    if (!sourceOrganizationId) {
      setStatusError("Organization context is required to start AI chat.")
      return
    }

    const encodedPayload = encodeUtf8Base64({
      contractVersion: "booking_setup_chat_context_v1",
      requestedAt: Date.now(),
      appSlug: normalizedAppSlug || "my-app",
      surfaceType: normalizedSurfaceType || "booking",
      surfaceKey: normalizedSurfaceKey || "default",
      setupTemplate,
      bindingEnabled,
      priority: bindingPriority,
      availableAppSlugs: registeredAppSlugs,
      catalogInput,
      diagnostics: diagnostics.map((diagnostic) => ({
        courseId: diagnostic.courseId,
        bookingResourceId: diagnostic.bookingResourceId,
        checkoutProductId: diagnostic.checkoutProductId,
        checkoutPublicUrl: diagnostic.checkoutPublicUrl,
        warnings: diagnostic.warnings,
      })),
      warnings,
      requiredSequence,
      nextAction,
      interviewQuestions,
      interviewHints,
      operatorPrompt,
    })

    const openContext = encodedPayload ? `booking_setup:${encodedPayload}` : "booking_setup"
    const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant")
    setStatusError(null)

    openWindow(
      aiAssistantWindowContract.windowId,
      aiAssistantWindowContract.title,
      <AIChatWindow
        initialLayoutMode="slick"
        initialPanel="booking-setup"
        openContext={openContext}
        sourceSessionId={sessionId}
        sourceOrganizationId={sourceOrganizationId}
      />,
      aiAssistantWindowContract.position,
      aiAssistantWindowContract.size,
      aiAssistantWindowContract.titleKey,
      aiAssistantWindowContract.iconId,
      {
        initialLayoutMode: "slick",
        initialPanel: "booking-setup",
        openContext,
        sourceSessionId: sessionId,
        sourceOrganizationId,
      }
    )

    setStatusMessage("AI Assistant opened with booking setup context.")
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      notification.success("Copied", successMessage)
    } catch {
      notification.error("Error", "Copy failed")
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="font-pixel text-xs flex items-center gap-2">
            <Sparkles size={14} />
            {tWithFallback(
              "ui.app.booking.settings.setup.title",
              "Booking Setup Wizard"
            )}
          </h2>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              className="desktop-interior-button px-2 py-1 text-xs sm:text-xs flex items-center gap-1"
              onClick={openBookingSetupChat}
              disabled={isRunning || !canRun}
              title="Open AI Assistant for booking setup"
            >
              <Sparkles size={11} />
              Start Chat
            </button>
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
          {tWithFallback(
            "ui.app.booking.settings.setup.subtitle",
            "Configure tickets, checkout, and availability bindings for any frontend surface."
          )}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
          {tWithFallback(
            "ui.app.booking.settings.setup.organization",
            "Organization"
          )}
          : {currentOrganization?.name || "-"}
        </p>
      </div>

      {!canRun && (
        <div
          className="rounded-lg border p-3 text-xs flex items-center gap-2"
          style={{
            borderColor: "var(--warning)",
            background: "var(--desktop-shell-accent)",
            color: "var(--warning)",
          }}
        >
          <AlertTriangle size={14} />
          {tWithFallback(
            "ui.app.booking.settings.setup.login_required",
            "Please sign in to run setup actions."
          )}
        </div>
      )}

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <h3 className="font-pixel text-xs">
          {tWithFallback(
            "ui.app.booking.settings.setup.surface_identity",
            "Surface Identity"
          )}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs flex flex-col gap-1">
            Template
            <select
              value={setupTemplate}
              onChange={(event) =>
                setSetupTemplate(event.target.value as SetupTemplate)
              }
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <option value="custom">custom</option>
              <option value="sailing_school_two_boats">
                sailing_school_two_boats
              </option>
            </select>
            <button
              type="button"
              className="desktop-interior-button px-2 py-1 text-xs self-start"
              onClick={() => applyTemplateDefaults(setupTemplate)}
              disabled={isRunning}
            >
              Load template defaults
            </button>
            <span style={{ color: "var(--neutral-gray)" }}>
              `custom` keeps catalog schema generic. `sailing_school_two_boats`
              is a preset only.
            </span>
          </label>
          <label className="text-xs flex flex-col gap-1">
            App Slug
            <select
              value={appSlugSelectValue}
              onChange={(event) => {
                const value = event.target.value
                if (value === "__custom__") {
                  if (!normalizedAppSlug) {
                    setAppSlug("my-app")
                  }
                  return
                }
                setAppSlug(value)
              }}
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              {registeredAppSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
              <option value="__custom__">custom</option>
            </select>
            <span style={{ color: "var(--neutral-gray)" }}>
              {registeredAppSlugs.length > 0
                ? `${registeredAppSlugs.length} registered app slug${registeredAppSlugs.length === 1 ? "" : "s"}`
                : "No registered app slugs found yet"}
            </span>
            {appSlugIsCustom && (
              <input
                value={appSlug}
                onChange={(event) => setAppSlug(event.target.value.toLowerCase())}
                className="px-2 py-1.5 border text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="Custom app slug"
              />
            )}
          </label>
          <label className="text-xs flex flex-col gap-1">
            Surface Type
            <input
              value={surfaceType}
              onChange={(event) => setSurfaceType(event.target.value.toLowerCase())}
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
          <label className="text-xs flex flex-col gap-1">
            Surface Key
            <input
              value={surfaceKey}
              onChange={(event) => setSurfaceKey(event.target.value.toLowerCase())}
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
          <label className="text-xs flex flex-col gap-1">
            Timezone
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
          <label className="text-xs flex flex-col gap-1">
            Default Times (CSV)
            <input
              value={defaultTimes}
              onChange={(event) => setDefaultTimes(event.target.value)}
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
          <label className="text-xs flex flex-col gap-1">
            Priority
            <input
              type="number"
              value={bindingPriority}
              onChange={(event) =>
                setBindingPriority(
                  Number.parseInt(event.target.value || "100", 10) || 100
                )
              }
              className="px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
          <label className="text-xs flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              checked={bindingEnabled}
              onChange={(event) => setBindingEnabled(event.target.checked)}
            />
            Binding enabled
          </label>
        </div>
      </div>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-xs">Inventory Groups (Seat/Unit)</h3>
          <button
            type="button"
            className="desktop-interior-button px-2 py-1 text-xs flex items-center gap-1"
            onClick={() =>
              setInventoryGroups((current) => [
                ...current,
                {
                  id: `group-${current.length + 1}`,
                  label: `Group ${current.length + 1}`,
                  capacity: 1,
                },
              ])
            }
          >
            <Plus size={12} />
            Add group
          </button>
        </div>
        {inventoryGroups.map((group, index) => (
          <div key={`${group.id}-${index}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              value={group.id}
              onChange={(event) =>
                patchInventoryGroup(index, { id: event.target.value })
              }
              className="sm:col-span-4 px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              placeholder="group id"
            />
            <input
              value={group.label}
              onChange={(event) =>
                patchInventoryGroup(index, { label: event.target.value })
              }
              className="sm:col-span-5 px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              placeholder="group label"
            />
            <input
              type="number"
              min={1}
              value={group.capacity}
              onChange={(event) =>
                patchInventoryGroup(index, {
                  capacity:
                    Number.parseInt(event.target.value || "1", 10) || 1,
                })
              }
              className="sm:col-span-2 px-2 py-1.5 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
            <button
              type="button"
              className="desktop-interior-button sm:col-span-1 px-2 py-1"
              onClick={() =>
                setInventoryGroups((current) =>
                  current.filter((_, i) => i !== index)
                )
              }
              aria-label={`remove inventory group ${group.id}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-xs">Profiles / Products</h3>
          <button
            type="button"
            className="desktop-interior-button px-2 py-1 text-xs flex items-center gap-1"
            onClick={() =>
              setCourses((current) => [
                ...current,
                {
                  courseId: `course-${current.length + 1}`,
                  displayName: `Course ${current.length + 1}`,
                  bookingDurationMinutes: 60,
                  availableTimes: defaultTimes,
                  bookingResourceId: "",
                  checkoutProductId: "",
                  checkoutPublicUrl: "",
                  isMultiDay: false,
                },
              ])
            }
          >
            <Plus size={12} />
            Add profile
          </button>
        </div>
        {courses.map((course, index) => (
          <div
            key={`${course.courseId}-${index}`}
            className="border p-3 space-y-2"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={course.courseId}
                onChange={(event) =>
                  patchCourse(index, { courseId: event.target.value })
                }
                className="px-2 py-1.5 border text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="profile id"
              />
              <input
                value={course.displayName}
                onChange={(event) =>
                  patchCourse(index, { displayName: event.target.value })
                }
                className="px-2 py-1.5 border text-xs sm:col-span-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="display name"
              />
              <input
                type="number"
                min={1}
                value={course.bookingDurationMinutes}
                onChange={(event) =>
                  patchCourse(index, {
                    bookingDurationMinutes:
                      Number.parseInt(event.target.value || "1", 10) || 1,
                  })
                }
                className="px-2 py-1.5 border text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="duration"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={course.availableTimes}
                onChange={(event) =>
                  patchCourse(index, { availableTimes: event.target.value })
                }
                className="px-2 py-1.5 border text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="available times CSV"
              />
              <input
                value={course.bookingResourceId}
                onChange={(event) =>
                  patchCourse(index, {
                    bookingResourceId: event.target.value,
                  })
                }
                className="px-2 py-1.5 border text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="bookingResourceId"
              />
              <input
                value={course.checkoutProductId}
                onChange={(event) =>
                  patchCourse(index, {
                    checkoutProductId: event.target.value,
                  })
                }
                className="px-2 py-1.5 border text-xs"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="checkoutProductId"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
              <input
                value={course.checkoutPublicUrl}
                onChange={(event) =>
                  patchCourse(index, {
                    checkoutPublicUrl: event.target.value,
                  })
                }
                className="px-2 py-1.5 border text-xs sm:col-span-3"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                placeholder="checkoutPublicUrl (optional)"
              />
              <div className="flex items-center justify-between">
                <label className="text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={course.isMultiDay}
                    onChange={(event) =>
                      patchCourse(index, {
                        isMultiDay: event.target.checked,
                      })
                    }
                  />
                  multi-day
                </label>
                <button
                  type="button"
                  className="desktop-interior-button px-2 py-1"
                  onClick={() =>
                    setCourses((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                  aria-label={`remove course ${course.courseId}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="desktop-interior-button px-3 py-1.5 text-xs flex items-center gap-1"
          onClick={() =>
            void runWorkflowAction("generate_booking_setup_blueprint", "preview")
          }
          disabled={isRunning || !canRun}
        >
          <RefreshCw size={12} />
          Generate Blueprint
        </button>
        <button
          type="button"
          className="desktop-interior-button px-3 py-1.5 text-xs flex items-center gap-1"
          onClick={() =>
            void runWorkflowAction("upsert_booking_surface_binding", "execute")
          }
          disabled={isRunning || !canRun}
        >
          <Save size={12} />
          Save Binding
        </button>
        <button
          type="button"
          className="desktop-interior-button px-3 py-1.5 text-xs"
          onClick={() =>
            void runWorkflowAction("list_booking_surface_bindings", "preview")
          }
          disabled={isRunning || !canRun}
        >
          List Bindings
        </button>
        <button
          type="button"
          className="desktop-interior-button px-3 py-1.5 text-xs"
          onClick={() =>
            void runWorkflowAction("bootstrap_booking_surface", "interview")
          }
          disabled={isRunning || !canRun}
        >
          Bootstrap Interview
        </button>
        <button
          type="button"
          className="desktop-interior-button px-3 py-1.5 text-xs"
          onClick={() =>
            void runWorkflowAction("bootstrap_booking_surface", "execute")
          }
          disabled={isRunning || !canRun}
        >
          Bootstrap Execute
        </button>
      </div>

      {(statusMessage || statusError) && (
        <div
          className="rounded-lg border p-3 text-xs"
          style={{
            borderColor: statusError ? "var(--error-bg)" : "var(--success-bg)",
            background: "var(--desktop-shell-accent)",
            color: statusError ? "var(--error-bg)" : "var(--success-bg)",
          }}
        >
          {statusError ? (
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} />
              {statusError}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} />
              {statusMessage}
            </div>
          )}
        </div>
      )}

      {(interviewQuestions.length > 0 || interviewHints.length > 0 || requiredSequence.length > 0 || nextAction) && (
        <div
          className="border p-4 space-y-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
          }}
        >
          <h3 className="font-pixel text-xs">Interview / Execute Flow</h3>
          {requiredSequence.length > 0 && (
            <div className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              sequence: {requiredSequence.join(" -> ")}
            </div>
          )}
          {nextAction && (
            <div className="text-xs" style={{ color: "var(--window-document-text)" }}>
              next: {nextAction}
            </div>
          )}
          {interviewQuestions.length > 0 && (
            <div className="space-y-2">
              {interviewQuestions.map((question) => (
                <div
                  key={question.id}
                  className="border p-2 text-xs"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <div className="font-semibold">
                    {question.title} ({question.id})
                  </div>
                  <div>{question.description}</div>
                  <div>
                    field={question.fieldPath} type={question.answerType} required=
                    {String(question.required)}
                  </div>
                  {typeof question.defaultValue !== "undefined" && (
                    <div style={{ color: "var(--desktop-menu-text-muted)" }}>
                      default={JSON.stringify(question.defaultValue)}
                    </div>
                  )}
                  {Array.isArray(question.options) && question.options.length > 0 && (
                    <div style={{ color: "var(--desktop-menu-text-muted)" }}>
                      options={question.options.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {interviewHints.length > 0 && (
            <div className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              hints: {interviewHints.join(" | ")}
            </div>
          )}
        </div>
      )}

      {diagnostics.length > 0 && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
          }}
        >
          <h3 className="font-pixel text-xs">Diagnostics</h3>
          {diagnostics.map((diagnostic) => (
            <div
              key={diagnostic.courseId}
              className="border p-3 text-xs space-y-2"
              style={{ borderColor: "var(--window-document-border)" }}
            >
              <div className="font-semibold">{diagnostic.displayName}</div>
              <div>courseId: {diagnostic.courseId}</div>
              <div>
                bookingResourceId: {diagnostic.bookingResourceId || "(unset)"} |{" "}
                checkoutProductId: {diagnostic.checkoutProductId || "(unset)"}
              </div>
              <div>
                checkoutPublicUrl: {diagnostic.checkoutPublicUrl || "(optional)"}
              </div>
              {diagnostic.warnings.length > 0 && (
                <div className="text-xs" style={{ color: "var(--warning)" }}>
                  warnings: {diagnostic.warnings.join(", ")}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {diagnostic.resourceCandidates.map((candidate) => (
                  <button
                    type="button"
                    key={`resource-${diagnostic.courseId}-${candidate.id}`}
                    className="desktop-interior-button px-2 py-1 text-xs"
                    onClick={() =>
                      applyCandidate(
                        diagnostic.courseId,
                        "bookingResourceId",
                        candidate.id
                      )
                    }
                  >
                    resource: {candidate.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {diagnostic.checkoutCandidates.map((candidate) => (
                  <button
                    type="button"
                    key={`checkout-${diagnostic.courseId}-${candidate.id}`}
                    className="desktop-interior-button px-2 py-1 text-xs"
                    onClick={() =>
                      applyCandidate(
                        diagnostic.courseId,
                        "checkoutProductId",
                        candidate.id
                      )
                    }
                  >
                    checkout: {candidate.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {diagnostic.checkoutPublicUrlCandidates.map((candidateUrl) => (
                  <button
                    type="button"
                    key={`checkout-url-${diagnostic.courseId}-${candidateUrl}`}
                    className="desktop-interior-button px-2 py-1 text-xs"
                    onClick={() =>
                      applyCandidate(
                        diagnostic.courseId,
                        "checkoutPublicUrl",
                        candidateUrl
                      )
                    }
                  >
                    checkoutUrl: {candidateUrl}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {warnings.length > 0 && (
            <div className="text-xs" style={{ color: "var(--warning)" }}>
              {warnings.join(" | ")}
            </div>
          )}
        </div>
      )}

      <div
        className="rounded-xl border p-4 space-y-2"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <h3 className="font-pixel text-xs">Env Mapping</h3>
        <textarea
          readOnly
          value={
            envMapping.BOOKING_RUNTIME_CONFIG_JSON ||
            envMapping.SEGELSCHULE_BOOKING_CATALOG_JSON ||
            bookingCatalogJson
          }
          className="w-full h-24 px-2 py-1.5 border text-xs"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
            color: "var(--window-document-text)",
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="desktop-interior-button px-2 py-1 text-xs flex items-center gap-1"
            onClick={() =>
              void copyText(
                envMapping.BOOKING_RUNTIME_CONFIG_JSON ||
                  envMapping.SEGELSCHULE_BOOKING_CATALOG_JSON ||
                  bookingCatalogJson,
                "Copied runtime config JSON"
              )
            }
            disabled={
              !envMapping.BOOKING_RUNTIME_CONFIG_JSON &&
              !envMapping.SEGELSCHULE_BOOKING_CATALOG_JSON &&
              !bookingCatalogJson
            }
          >
            <ClipboardCopy size={12} />
            Copy catalog JSON
          </button>
          <button
            type="button"
            className="desktop-interior-button px-2 py-1 text-xs flex items-center gap-1"
            onClick={() =>
              void copyText(
                envMapping.BOOKING_COURSE_BINDINGS_JSON ||
                  envMapping.SEGELSCHULE_COURSE_BINDINGS_JSON ||
                  legacyBindingsJson,
                "Copied course bindings JSON"
              )
            }
            disabled={
              !envMapping.BOOKING_COURSE_BINDINGS_JSON &&
              !envMapping.SEGELSCHULE_COURSE_BINDINGS_JSON &&
              !legacyBindingsJson
            }
          >
            <ClipboardCopy size={12} />
            Copy bindings JSON
          </button>
        </div>
      </div>

      {bindings.length > 0 && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
          }}
        >
          <h3 className="font-pixel text-xs">Saved Bindings</h3>
          {bindings.map((binding) => (
            <div
              key={binding.bindingId}
              className="border p-2 text-xs"
              style={{ borderColor: "var(--window-document-border)" }}
            >
              <div>{binding.name || binding.bindingId}</div>
              <div>
                {binding.appSlug}:{binding.surfaceType}:{binding.surfaceKey}
              </div>
              <div>
                enabled={String(binding.enabled)} priority={binding.priority} status=
                {binding.status} updated={toLocalDate(binding.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {calendarReadinessJson && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
          }}
        >
          <h3 className="font-pixel text-xs">Google Calendar Readiness</h3>
          <textarea
            readOnly
            value={calendarReadinessJson}
            className="w-full h-32 px-2 py-1.5 border text-xs"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          />
        </div>
      )}

      <div
        className="rounded-xl border p-4 space-y-2"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <h3 className="font-pixel text-xs">Agent Prompt</h3>
        <textarea
          readOnly
          value={operatorPrompt}
          className="w-full h-28 px-2 py-1.5 border text-xs"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
            color: "var(--window-document-text)",
          }}
        />
        <button
          type="button"
          className="desktop-interior-button px-2 py-1 text-xs flex items-center gap-1"
          onClick={() => void copyText(operatorPrompt, "Copied agent setup prompt")}
        >
          <ClipboardCopy size={12} />
          Copy prompt
        </button>
      </div>
    </div>
  )
}
