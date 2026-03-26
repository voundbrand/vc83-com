export interface SegelschuleCoursePlatformBinding {
  courseId: string
  checkoutProductId?: string
  checkoutPublicUrl?: string
  bookingResourceId?: string
  bookingDurationMinutes?: number
}

export interface SegelschuleBoatConfig {
  id: string
  name: string
  seatCount: number
}

export interface SegelschuleCourseRuntimeConfig
  extends SegelschuleCoursePlatformBinding {
  availableTimes: string[]
  isMultiDay: boolean
  bookingDurationMinutes: number
}

export interface SegelschuleBookingRuntimeConfig {
  timezone: string
  defaultAvailableTimes: string[]
  boats: SegelschuleBoatConfig[]
  courses: Record<string, SegelschuleCourseRuntimeConfig>
}

export interface SegelschuleSeatSelectionInput {
  boatId?: string
  boatName?: string
  seatNumbers: number[]
}

export interface SegelschuleSeatSelection {
  boatId: string
  boatName: string
  seatNumbers: number[]
}

export interface SegelschuleSurfaceBindingIdentity {
  appSlug: string
  surfaceType: string
  surfaceKey: string
}

export interface SegelschuleRuntimeConfigResolution {
  runtimeConfig: SegelschuleBookingRuntimeConfig
  source: "backend_surface_binding" | "env_fallback"
  bindingId: string | null
  identity: SegelschuleSurfaceBindingIdentity
  warnings: string[]
}

const DEFAULT_SINGLE_DAY_BOOKING_MINUTES = 180
const DEFAULT_MULTI_DAY_BOOKING_MINUTES = 480
const DEFAULT_AVAILABLE_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"]
const DEFAULT_MULTI_DAY_COURSE_IDS = new Set(["grund", "intensiv"])
const DEFAULT_SURFACE_APP_SLUG = "segelschule-altwarp"
const DEFAULT_SURFACE_TYPE = "booking"
const DEFAULT_SURFACE_KEY = "default"

const DEFAULT_COURSE_DURATION_MINUTES: Record<string, number> = {
  schnupper: DEFAULT_SINGLE_DAY_BOOKING_MINUTES,
  grund: DEFAULT_MULTI_DAY_BOOKING_MINUTES,
  intensiv: DEFAULT_MULTI_DAY_BOOKING_MINUTES,
}

const DEFAULT_BOATS: SegelschuleBoatConfig[] = [
  { id: "fraukje", name: "Fraukje", seatCount: 4 },
  { id: "rose", name: "Rose", seatCount: 4 },
]

const BINDINGS_ENV_KEYS = [
  "SEGELSCHULE_COURSE_BINDINGS",
  "SEGELSCHULE_COURSE_BINDINGS_JSON",
] as const

const CATALOG_ENV_KEYS = [
  "SEGELSCHULE_BOOKING_CATALOG",
  "SEGELSCHULE_BOOKING_CATALOG_JSON",
] as const

type PartialCourseRuntimeConfig = SegelschuleCoursePlatformBinding & {
  availableTimes?: string[]
  isMultiDay?: boolean
}

type ParsedCatalogPayload = {
  timezone?: string
  defaultAvailableTimes?: string[]
  boats?: SegelschuleBoatConfig[]
  courses?: PartialCourseRuntimeConfig[]
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  return undefined
}

function normalizeTimeSlot(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return undefined
  }
  return normalized
}

function normalizeTimeSlotArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const normalized = new Set<string>()
  for (const entry of value) {
    const timeSlot = normalizeTimeSlot(entry)
    if (timeSlot) {
      normalized.add(timeSlot)
    }
  }
  return Array.from(normalized)
}

function normalizeBoatId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
  return normalized.length > 0 ? normalized : undefined
}

function normalizeBoatConfig(raw: unknown): SegelschuleBoatConfig | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const record = raw as Record<string, unknown>
  const id = normalizeBoatId(record.id || record.boatId || record.name)
  const name = normalizeOptionalString(record.name || record.label)
  const seatCount = normalizeOptionalNumber(record.seatCount || record.capacity)
  if (!id || !name || !seatCount) {
    return null
  }
  return {
    id,
    name,
    seatCount,
  }
}

function normalizeBoats(value: unknown): SegelschuleBoatConfig[] {
  if (!Array.isArray(value)) {
    return []
  }
  const normalized = new Map<string, SegelschuleBoatConfig>()
  for (const rawBoat of value) {
    const boat = normalizeBoatConfig(rawBoat)
    if (!boat) continue
    normalized.set(boat.id, boat)
  }
  return Array.from(normalized.values())
}

function normalizeBoatsFromInventoryGroups(value: unknown): SegelschuleBoatConfig[] {
  if (!Array.isArray(value)) {
    return []
  }
  return normalizeBoats(
    value.map((group) => {
      if (!group || typeof group !== "object") {
        return null
      }
      const record = group as Record<string, unknown>
      return {
        id: record.id || record.groupId,
        name: record.label || record.name,
        seatCount: record.capacity,
      }
    }).filter(Boolean)
  )
}

function normalizeBinding(
  courseId: string,
  raw: Record<string, unknown>
): SegelschuleCoursePlatformBinding {
  return {
    courseId: courseId.trim(),
    checkoutProductId: normalizeOptionalString(raw.checkoutProductId),
    checkoutPublicUrl: normalizeOptionalString(raw.checkoutPublicUrl),
    bookingResourceId: normalizeOptionalString(raw.bookingResourceId),
    bookingDurationMinutes: normalizeOptionalNumber(raw.bookingDurationMinutes),
  }
}

function normalizeCourseRuntimeConfig(
  courseId: string,
  raw: Record<string, unknown>
): PartialCourseRuntimeConfig {
  return {
    ...normalizeBinding(courseId, raw),
    availableTimes: normalizeTimeSlotArray(raw.availableTimes),
    isMultiDay:
      typeof raw.isMultiDay === "boolean"
        ? raw.isMultiDay
        : undefined,
  }
}

function parseBindingsFromArray(raw: unknown[]): SegelschuleCoursePlatformBinding[] {
  const bindings: SegelschuleCoursePlatformBinding[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const record = entry as Record<string, unknown>
    const courseId = normalizeOptionalString(record.courseId)
    if (!courseId) continue
    bindings.push(normalizeBinding(courseId, record))
  }

  return bindings
}

function parseBindingsFromObject(
  raw: Record<string, unknown>
): SegelschuleCoursePlatformBinding[] {
  const bindings: SegelschuleCoursePlatformBinding[] = []

  for (const [courseId, value] of Object.entries(raw)) {
    const normalizedCourseId = courseId.trim()
    if (!normalizedCourseId) continue

    if (typeof value === "string") {
      const checkoutProductId = normalizeOptionalString(value)
      if (!checkoutProductId) continue
      bindings.push({
        courseId: normalizedCourseId,
        checkoutProductId,
      })
      continue
    }

    if (!value || typeof value !== "object") continue
    bindings.push(
      normalizeBinding(
        normalizedCourseId,
        value as Record<string, unknown>
      )
    )
  }

  return bindings
}

function parseBindingsFromEnv(rawJson: string): SegelschuleCoursePlatformBinding[] {
  try {
    return parseBindingsFromValue(JSON.parse(rawJson) as unknown)
  } catch {
    return []
  }
}

function parseBindingsFromValue(
  value: unknown
): SegelschuleCoursePlatformBinding[] {
  if (!value) {
    return []
  }
  if (Array.isArray(value)) {
    return parseBindingsFromArray(value)
  }
  if (typeof value === "string") {
    try {
      return parseBindingsFromValue(JSON.parse(value) as unknown)
    } catch {
      return []
    }
  }
  if (typeof value === "object") {
    return parseBindingsFromObject(value as Record<string, unknown>)
  }
  return []
}

function parseCourseConfigsFromObject(raw: Record<string, unknown>): PartialCourseRuntimeConfig[] {
  const configs: PartialCourseRuntimeConfig[] = []
  for (const [courseId, value] of Object.entries(raw)) {
    const normalizedCourseId = courseId.trim()
    if (!normalizedCourseId || !value || typeof value !== "object") {
      continue
    }
    configs.push(
      normalizeCourseRuntimeConfig(
        normalizedCourseId,
        value as Record<string, unknown>
      )
    )
  }
  return configs
}

function parseCourseConfigsFromArray(raw: unknown[]): PartialCourseRuntimeConfig[] {
  const configs: PartialCourseRuntimeConfig[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue
    }
    const record = entry as Record<string, unknown>
    const courseId = normalizeOptionalString(record.courseId || record.id)
    if (!courseId) {
      continue
    }
    configs.push(normalizeCourseRuntimeConfig(courseId, record))
  }
  return configs
}

function parseCatalogFromEnv(rawJson: string): ParsedCatalogPayload | null {
  try {
    return parseCatalogFromValue(JSON.parse(rawJson) as unknown)
  } catch {
    return null
  }
}

function parseCatalogFromValue(value: unknown): ParsedCatalogPayload | null {
  if (!value) {
    return null
  }
  if (typeof value === "string") {
    try {
      return parseCatalogFromValue(JSON.parse(value) as unknown)
    } catch {
      return null
    }
  }
  if (typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  let courses: PartialCourseRuntimeConfig[] = []
  if (Array.isArray(record.courses)) {
    courses = parseCourseConfigsFromArray(record.courses)
  } else if (record.courses && typeof record.courses === "object") {
    courses = parseCourseConfigsFromObject(
      record.courses as Record<string, unknown>
    )
  }

  const boats = normalizeBoats(record.boats)
  const inventoryGroupBoats = normalizeBoatsFromInventoryGroups(
    record.inventoryGroups
  )

  return {
    timezone: normalizeOptionalString(record.timezone),
    defaultAvailableTimes: normalizeTimeSlotArray(
      record.defaultAvailableTimes || record.timeSlots
    ),
    boats: boats.length > 0 ? boats : inventoryGroupBoats,
    courses,
  }
}

function getBindingsFromEnv(): SegelschuleCoursePlatformBinding[] {
  for (const envKey of BINDINGS_ENV_KEYS) {
    const raw = process.env[envKey]
    if (!raw || raw.trim().length === 0) continue
    const parsed = parseBindingsFromEnv(raw)
    if (parsed.length > 0) return parsed
  }
  return []
}

function getCatalogFromEnv(): ParsedCatalogPayload | null {
  for (const envKey of CATALOG_ENV_KEYS) {
    const raw = process.env[envKey]
    if (!raw || raw.trim().length === 0) continue
    const parsed = parseCatalogFromEnv(raw)
    if (parsed) return parsed
  }
  return null
}

export function getBridgeBookingTimezone(): string {
  return process.env.SEGELSCHULE_BOOKING_TIMEZONE?.trim() || "Europe/Berlin"
}

function buildRuntimeConfig(args: {
  catalog: ParsedCatalogPayload | null
  legacyBindings: SegelschuleCoursePlatformBinding[]
}): SegelschuleBookingRuntimeConfig {
  const defaultAvailableTimes =
    args.catalog?.defaultAvailableTimes && args.catalog.defaultAvailableTimes.length > 0
      ? args.catalog.defaultAvailableTimes
      : DEFAULT_AVAILABLE_TIMES

  const boats =
    args.catalog?.boats && args.catalog.boats.length > 0
      ? args.catalog.boats
      : DEFAULT_BOATS

  const legacyBindingByCourseId = new Map(
    args.legacyBindings.map((binding) => [binding.courseId, binding])
  )
  const catalogCourseById = new Map(
    (args.catalog?.courses || []).map((course) => [course.courseId, course])
  )

  const courseIds = new Set<string>([
    ...Object.keys(DEFAULT_COURSE_DURATION_MINUTES),
    ...Array.from(legacyBindingByCourseId.keys()),
    ...Array.from(catalogCourseById.keys()),
  ])

  const courses: Record<string, SegelschuleCourseRuntimeConfig> = {}
  for (const courseId of courseIds) {
    const legacyBinding = legacyBindingByCourseId.get(courseId)
    const catalogCourse = catalogCourseById.get(courseId)
    const isMultiDay =
      typeof catalogCourse?.isMultiDay === "boolean"
        ? catalogCourse.isMultiDay
        : DEFAULT_MULTI_DAY_COURSE_IDS.has(courseId)
    const bookingDurationMinutes =
      catalogCourse?.bookingDurationMinutes ||
      legacyBinding?.bookingDurationMinutes ||
      DEFAULT_COURSE_DURATION_MINUTES[courseId] ||
      (isMultiDay
        ? DEFAULT_MULTI_DAY_BOOKING_MINUTES
        : DEFAULT_SINGLE_DAY_BOOKING_MINUTES)
    const availableTimes =
      catalogCourse?.availableTimes && catalogCourse.availableTimes.length > 0
        ? catalogCourse.availableTimes
        : defaultAvailableTimes

    courses[courseId] = {
      courseId,
      checkoutProductId:
        catalogCourse?.checkoutProductId || legacyBinding?.checkoutProductId,
      checkoutPublicUrl:
        catalogCourse?.checkoutPublicUrl || legacyBinding?.checkoutPublicUrl,
      bookingResourceId:
        catalogCourse?.bookingResourceId || legacyBinding?.bookingResourceId,
      bookingDurationMinutes,
      availableTimes,
      isMultiDay,
    }
  }

  return {
    timezone: args.catalog?.timezone || getBridgeBookingTimezone(),
    defaultAvailableTimes,
    boats,
    courses,
  }
}

export function getSegelschuleBookingRuntimeConfig(): SegelschuleBookingRuntimeConfig {
  return buildRuntimeConfig({
    catalog: getCatalogFromEnv(),
    legacyBindings: getBindingsFromEnv(),
  })
}

export function getSegelschuleSurfaceBindingIdentity(): SegelschuleSurfaceBindingIdentity {
  return {
    appSlug:
      normalizeOptionalString(process.env.SEGELSCHULE_SURFACE_APP_SLUG)
      || DEFAULT_SURFACE_APP_SLUG,
    surfaceType:
      normalizeOptionalString(process.env.SEGELSCHULE_SURFACE_TYPE)
      || DEFAULT_SURFACE_TYPE,
    surfaceKey:
      normalizeOptionalString(process.env.SEGELSCHULE_SURFACE_KEY)
      || DEFAULT_SURFACE_KEY,
  }
}

export async function resolveSegelschuleRuntimeConfig(args: {
  convex: unknown
  queryInternalFn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convex: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryRef: any,
    queryArgs: Record<string, unknown>
  ) => Promise<unknown>
  generatedInternalApi: any
  organizationId: string
  identity?: Partial<SegelschuleSurfaceBindingIdentity>
}): Promise<SegelschuleRuntimeConfigResolution> {
  const fallbackRuntime = getSegelschuleBookingRuntimeConfig()
  const envIdentity = getSegelschuleSurfaceBindingIdentity()
  const identity: SegelschuleSurfaceBindingIdentity = {
    appSlug: args.identity?.appSlug || envIdentity.appSlug,
    surfaceType: args.identity?.surfaceType || envIdentity.surfaceType,
    surfaceKey: args.identity?.surfaceKey || envIdentity.surfaceKey,
  }
  const warnings: string[] = []

  try {
    const resolverRef =
      args.generatedInternalApi?.frontendSurfaceBindings
        ?.resolveBookingSurfaceBindingInternal
    if (!resolverRef) {
      warnings.push("surface_binding_backend_query_missing")
      return {
        runtimeConfig: fallbackRuntime,
        source: "env_fallback",
        bindingId: null,
        identity,
        warnings,
      }
    }

    const binding = (await args.queryInternalFn(
      args.convex,
      resolverRef,
      {
        organizationId: args.organizationId,
        appSlug: identity.appSlug,
        surfaceType: identity.surfaceType,
        surfaceKey: identity.surfaceKey,
      }
    )) as Record<string, unknown> | null

    if (!binding) {
      warnings.push("surface_binding_not_found")
      return {
        runtimeConfig: fallbackRuntime,
        source: "env_fallback",
        bindingId: null,
        identity,
        warnings,
      }
    }

    const catalog = parseCatalogFromValue(binding.runtimeConfig)
    const legacyBindings = parseBindingsFromValue(binding.legacyBindings)
    if (!catalog && legacyBindings.length === 0) {
      warnings.push("surface_binding_payload_invalid")
      return {
        runtimeConfig: fallbackRuntime,
        source: "env_fallback",
        bindingId: null,
        identity,
        warnings,
      }
    }

    return {
      runtimeConfig: buildRuntimeConfig({
        catalog,
        legacyBindings,
      }),
      source: "backend_surface_binding",
      bindingId: normalizeOptionalString(binding.bindingId) || null,
      identity,
      warnings,
    }
  } catch (error) {
    console.error("[segelschule-surface-binding] Runtime config lookup failed:", error)
    warnings.push("surface_binding_lookup_failed")
    return {
      runtimeConfig: fallbackRuntime,
      source: "env_fallback",
      bindingId: null,
      identity,
      warnings,
    }
  }
}

export function getCoursePlatformBinding(
  courseId: string
): SegelschuleCoursePlatformBinding | null {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) return null

  const runtime = getSegelschuleBookingRuntimeConfig()
  const courseConfig = runtime.courses[normalizedCourseId]
  if (!courseConfig) {
    return null
  }
  return {
    courseId: courseConfig.courseId,
    checkoutProductId: courseConfig.checkoutProductId,
    checkoutPublicUrl: courseConfig.checkoutPublicUrl,
    bookingResourceId: courseConfig.bookingResourceId,
    bookingDurationMinutes: courseConfig.bookingDurationMinutes,
  }
}

export function getCourseAvailableTimes(courseId: string): string[] {
  const runtime = getSegelschuleBookingRuntimeConfig()
  return runtime.courses[courseId]?.availableTimes || runtime.defaultAvailableTimes
}

export function resolveCourseBookingDurationMinutes(args: {
  courseId: string
  isMultiDayCourse: boolean
}): number {
  const runtime = getSegelschuleBookingRuntimeConfig()
  const configuredDuration = runtime.courses[args.courseId]?.bookingDurationMinutes
  if (
    typeof configuredDuration === "number" &&
    Number.isFinite(configuredDuration) &&
    configuredDuration > 0
  ) {
    return Math.round(configuredDuration)
  }
  return args.isMultiDayCourse
    ? DEFAULT_MULTI_DAY_BOOKING_MINUTES
    : DEFAULT_SINGLE_DAY_BOOKING_MINUTES
}

export function resolveBridgeBookingDurationMinutes(args: {
  isMultiDayCourse: boolean
  binding: SegelschuleCoursePlatformBinding | null
}): number {
  const configured = args.binding?.bookingDurationMinutes
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.round(configured)
  }
  return args.isMultiDayCourse
    ? DEFAULT_MULTI_DAY_BOOKING_MINUTES
    : DEFAULT_SINGLE_DAY_BOOKING_MINUTES
}

export function parseBookingStartTimestamp(date: string, time: string): number | null {
  const dateValue = date.trim()
  const timeValue = time.trim()
  if (!dateValue || !timeValue) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null
  }
  if (!normalizeTimeSlot(timeValue)) {
    return null
  }

  const timestamp = new Date(`${dateValue}T${timeValue}:00`).getTime()
  if (!Number.isFinite(timestamp)) return null
  return timestamp
}

function normalizeSeatNumbers(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return []
  }
  const normalized = new Set<number>()
  for (const value of values) {
    const parsed = normalizeOptionalNumber(value)
    if (parsed && parsed > 0) {
      normalized.add(parsed)
    }
  }
  return Array.from(normalized).sort((a, b) => a - b)
}

function buildBoatLookup(boats: SegelschuleBoatConfig[]) {
  const byId = new Map<string, SegelschuleBoatConfig>()
  const byName = new Map<string, SegelschuleBoatConfig>()

  for (const boat of boats) {
    byId.set(boat.id, boat)
    byName.set(boat.name.trim().toLowerCase(), boat)
  }

  return { byId, byName }
}

export function normalizeSeatSelections(args: {
  selections: SegelschuleSeatSelectionInput[]
  boats?: SegelschuleBoatConfig[]
}): { selections: SegelschuleSeatSelection[]; totalSeats: number; errors: string[] } {
  const boats = args.boats && args.boats.length > 0
    ? args.boats
    : getSegelschuleBookingRuntimeConfig().boats
  const lookup = buildBoatLookup(boats)
  const groupedSelections = new Map<string, { boatName: string; seatNumbers: Set<number> }>()
  const errors: string[] = []

  for (const rawSelection of args.selections) {
    const normalizedBoatId = normalizeBoatId(rawSelection.boatId)
    const normalizedBoatName = normalizeOptionalString(rawSelection.boatName)
      ?.toLowerCase()
      .trim()
    const boat =
      (normalizedBoatId && lookup.byId.get(normalizedBoatId)) ||
      (normalizedBoatName ? lookup.byName.get(normalizedBoatName) : undefined)

    if (!boat) {
      errors.push(
        `Unknown boat selection: ${rawSelection.boatName || rawSelection.boatId || "unknown"}`
      )
      continue
    }

    const seatNumbers = normalizeSeatNumbers(rawSelection.seatNumbers)
    if (seatNumbers.length === 0) {
      continue
    }

    if (!groupedSelections.has(boat.id)) {
      groupedSelections.set(boat.id, {
        boatName: boat.name,
        seatNumbers: new Set<number>(),
      })
    }
    const seatSet = groupedSelections.get(boat.id)!
    for (const seatNumber of seatNumbers) {
      if (seatNumber < 1 || seatNumber > boat.seatCount) {
        errors.push(`Seat ${seatNumber} is invalid for ${boat.name}`)
        continue
      }
      seatSet.seatNumbers.add(seatNumber)
    }
  }

  const selections = Array.from(groupedSelections.entries())
    .map(([boatId, selection]) => ({
      boatId,
      boatName: selection.boatName,
      seatNumbers: Array.from(selection.seatNumbers).sort((a, b) => a - b),
    }))
    .filter((selection) => selection.seatNumbers.length > 0)

  const totalSeats = selections.reduce(
    (total, selection) => total + selection.seatNumbers.length,
    0
  )

  return {
    selections,
    totalSeats,
    errors,
  }
}
