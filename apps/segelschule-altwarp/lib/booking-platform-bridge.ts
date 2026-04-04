import { localDateTimeToTimestamp } from "../../../src/lib/timezone-utils"

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

export interface SegelschuleBookingCatalogCourse {
  courseId: string
  aliases: string[]
  title: string
  description: string | null
  durationLabel: string | null
  durationMinutes: number
  priceInCents: number
  currency: string
  isMultiDay: boolean
  checkoutProductId: string | null
  bookingResourceId: string | null
  bookingResourceName: string | null
  bookingResourceSubtype: string | null
  fulfillmentType: string | null
  availableTimes: string[]
  checkoutPublicUrl: string | null
  warnings: string[]
}

export interface SegelschuleBookingCatalogResolution {
  runtimeResolution: SegelschuleRuntimeConfigResolution
  boats: SegelschuleBoatConfig[]
  courses: SegelschuleBookingCatalogCourse[]
}

export interface SegelschuleBookingCourseResolution
  extends SegelschuleBookingCatalogResolution {
  requestedCourseId: string
  resolvedCourseId: string | null
  course: SegelschuleBookingCatalogCourse | null
}

const DEFAULT_SINGLE_DAY_BOOKING_MINUTES = 180
const DEFAULT_MULTI_DAY_BOOKING_MINUTES = 480
const DEFAULT_AVAILABLE_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"]
const DEFAULT_MULTI_DAY_COURSE_IDS = new Set(["grund", "intensiv"])
const DEFAULT_COURSE_DISPLAY_ORDER = ["schnupper", "grund", "intensiv"]
const DEFAULT_SURFACE_APP_SLUG = "segelschule-altwarp"
const DEFAULT_SURFACE_TYPE = "booking"
const DEFAULT_SURFACE_KEY = "default"
const PRODUCT_AVAILABILITY_LINK_TYPE = "uses_availability_of"

const BOOKABLE_PRODUCT_SUBTYPES = new Set([
  "room",
  "staff",
  "equipment",
  "space",
  "vehicle",
  "accommodation",
  "appointment",
  "class",
  "treatment",
])

const DEFAULT_COURSE_DURATION_MINUTES: Record<string, number> = {
  schnupper: DEFAULT_SINGLE_DAY_BOOKING_MINUTES,
  grund: DEFAULT_MULTI_DAY_BOOKING_MINUTES,
  intensiv: DEFAULT_MULTI_DAY_BOOKING_MINUTES,
}

const DEFAULT_BOATS: SegelschuleBoatConfig[] = [
  { id: "fraukje", name: "Fraukje", seatCount: 4 },
  { id: "rose", name: "Rose", seatCount: 4 },
]

const LEGACY_FRONTEND_COURSE_ALIASES: Record<string, string[]> = {
  schnupper: ["schnupper"],
  grund: ["grund", "wochenende"],
  intensiv: ["intensiv"],
}

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

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value
  }
  if (value === "true" || value === 1 || value === "1") {
    return true
  }
  if (value === "false" || value === 0 || value === "0") {
    return false
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function normalizeLanguageTag(value: string | undefined): string {
  const normalized = normalizeOptionalString(value)?.toLowerCase() || "de"
  return normalized.split("-")[0]
}

function resolveLocalizedValue(
  value: unknown,
  language: string,
  fallback?: string | null
): string | null {
  const normalizedLanguage = normalizeLanguageTag(language)
  const directValue = normalizeOptionalString(value)
  if (directValue) {
    return directValue
  }

  const record = asRecord(value)
  if (Object.keys(record).length === 0) {
    return fallback || null
  }

  const candidates = [
    normalizedLanguage,
    normalizedLanguage.replace(/_.+$/, ""),
    normalizedLanguage === "gsw" ? "de" : null,
    "de",
    "en",
    "nl",
  ].filter((entry): entry is string => Boolean(entry))

  for (const candidate of candidates) {
    const localized = normalizeOptionalString(record[candidate])
    if (localized) {
      return localized
    }
  }

  return fallback || null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value))
    )
  )
}

function normalizeObjectId(value: unknown): string | null {
  return normalizeOptionalString(value) || null
}

function normalizeCurrency(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  return normalized ? normalized.toUpperCase() : null
}

function normalizePriceInCents(value: unknown): number | null {
  const normalized = normalizeOptionalNumber(value)
  if (typeof normalized === "number" && Number.isFinite(normalized) && normalized >= 0) {
    return normalized
  }
  return null
}

function resolveDurationMinutesFromProduct(
  product: Record<string, unknown> | null | undefined
): number | null {
  const productRecord = product ? asRecord(product) : {}
  const customProperties = asRecord(productRecord.customProperties)
  const bookableConfig = asRecord(customProperties.bookableConfig)

  return (
    normalizeOptionalNumber(customProperties.bookingDurationMinutes)
    || normalizeOptionalNumber(bookableConfig.bookingDurationMinutes)
    || normalizeOptionalNumber(customProperties.courseDurationMinutes)
    || normalizeOptionalNumber(bookableConfig.courseDurationMinutes)
    || normalizeOptionalNumber(customProperties.minDuration)
    || normalizeOptionalNumber(bookableConfig.minDuration)
    || null
  )
}

function resolveCatalogContent(
  product: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!product) {
    return {}
  }

  const customProperties = asRecord(product.customProperties)
  return asRecord(
    customProperties.catalogContent
    || customProperties.courseCatalog
    || customProperties.surfaceCatalog
  )
}

function resolveCourseAliases(args: {
  courseId: string
  product: Record<string, unknown> | null | undefined
  resource: Record<string, unknown> | null | undefined
}): string[] {
  const productCatalogContent = resolveCatalogContent(args.product)
  const resourceCatalogContent = resolveCatalogContent(args.resource)
  const aliases = [
    ...normalizeStringArray(
      productCatalogContent.aliases || productCatalogContent.legacyCourseIds
    ),
    ...normalizeStringArray(
      resourceCatalogContent.aliases || resourceCatalogContent.legacyCourseIds
    ),
  ]

  return dedupeStrings([
    args.courseId,
    ...(LEGACY_FRONTEND_COURSE_ALIASES[args.courseId] || []),
    ...aliases,
  ])
}

function resolveCourseTitle(args: {
  language: string
  courseId: string
  product: Record<string, unknown> | null | undefined
  resource: Record<string, unknown> | null | undefined
}): string {
  const productCatalog = resolveCatalogContent(args.product)
  const resourceCatalog = resolveCatalogContent(args.resource)

  return (
    resolveLocalizedValue(productCatalog.title, args.language)
    || resolveLocalizedValue(productCatalog.displayName, args.language)
    || resolveLocalizedValue(resourceCatalog.title, args.language)
    || resolveLocalizedValue(resourceCatalog.displayName, args.language)
    || normalizeOptionalString(args.product?.name)
    || normalizeOptionalString(args.resource?.name)
    || args.courseId
  )
}

function resolveCourseDescription(args: {
  language: string
  product: Record<string, unknown> | null | undefined
  resource: Record<string, unknown> | null | undefined
}): string | null {
  const productCatalog = resolveCatalogContent(args.product)
  const resourceCatalog = resolveCatalogContent(args.resource)
  const productProps = args.product ? asRecord(args.product.customProperties) : {}
  const resourceProps = args.resource ? asRecord(args.resource.customProperties) : {}

  return (
    resolveLocalizedValue(productCatalog.description, args.language)
    || resolveLocalizedValue(resourceCatalog.description, args.language)
    || normalizeOptionalString(args.product?.description)
    || normalizeOptionalString(productProps.description)
    || normalizeOptionalString(args.resource?.description)
    || normalizeOptionalString(resourceProps.description)
    || null
  )
}

function resolveCourseDurationLabel(args: {
  language: string
  product: Record<string, unknown> | null | undefined
  resource: Record<string, unknown> | null | undefined
}): string | null {
  const productCatalog = resolveCatalogContent(args.product)
  const resourceCatalog = resolveCatalogContent(args.resource)

  return (
    resolveLocalizedValue(productCatalog.durationLabel, args.language)
    || resolveLocalizedValue(productCatalog.duration, args.language)
    || resolveLocalizedValue(resourceCatalog.durationLabel, args.language)
    || resolveLocalizedValue(resourceCatalog.duration, args.language)
    || null
  )
}

function resolveCourseFulfillmentType(args: {
  product: Record<string, unknown> | null | undefined
  resource: Record<string, unknown> | null | undefined
}): string | null {
  for (const candidate of [args.product, args.resource]) {
    const customProperties = candidate ? asRecord(candidate.customProperties) : {}
    const fulfillmentType = normalizeOptionalString(customProperties.fulfillmentType)
    if (fulfillmentType) {
      return fulfillmentType
    }

    if (normalizeOptionalString(candidate?.subtype) === "ticket") {
      return "ticket"
    }
  }

  return null
}

type SegelschuleCatalogObjectRecord = {
  _id: string
  organizationId?: string
  name?: string
  description?: string
  type?: string
  subtype?: string | null
  status?: string | null
  customProperties?: Record<string, unknown>
}

type SegelschuleCatalogObjectLinkRecord = {
  _id?: string
  fromObjectId?: string
  toObjectId?: string
  linkType?: string
  properties?: Record<string, unknown>
}

type SegelschuleDiscoveredCourseBinding = {
  courseId: string
  checkoutProductId: string | null
  bookingResourceId: string | null
}

function isActiveCatalogObject(
  record: SegelschuleCatalogObjectRecord | null | undefined
): record is SegelschuleCatalogObjectRecord {
  return Boolean(record && record.type === "product" && record.status !== "archived")
}

function isCommercialCourseProduct(
  record: SegelschuleCatalogObjectRecord | null | undefined
): record is SegelschuleCatalogObjectRecord {
  if (!isActiveCatalogObject(record)) {
    return false
  }

  const subtype = normalizeOptionalString(record.subtype)
  if (subtype && BOOKABLE_PRODUCT_SUBTYPES.has(subtype)) {
    return false
  }

  const customProperties = asRecord(record.customProperties)
  return (
    subtype === "ticket"
    || normalizeOptionalString(customProperties.fulfillmentType) === "ticket"
  )
}

function resolveCourseMarker(args: {
  record: SegelschuleCatalogObjectRecord | null | undefined
  appSlug: string
}): string | null {
  if (!args.record) {
    return null
  }

  const customProperties = asRecord(args.record.customProperties)
  const explicitCourseId = normalizeOptionalString(customProperties.segelschuleCourseId)
  if (explicitCourseId) {
    return explicitCourseId
  }

  const legacyCourseId = normalizeOptionalString(customProperties.courseId)
  if (!legacyCourseId) {
    return null
  }

  const bookingSurface = normalizeOptionalString(
    customProperties.bookingSurface
    || customProperties.appSlug
    || customProperties.surfaceAppSlug
  )
  if (bookingSurface && bookingSurface !== args.appSlug) {
    return null
  }

  const bookingType = normalizeOptionalString(customProperties.bookingType)
  if (
    bookingSurface === args.appSlug
    || bookingType === "class_enrollment"
    || normalizeOptionalString(customProperties.fulfillmentType) === "ticket"
    || Object.keys(resolveCatalogContent(args.record)).length > 0
  ) {
    return legacyCourseId
  }

  return null
}

function isSegelschuleScopedRecord(args: {
  record: SegelschuleCatalogObjectRecord | null | undefined
  appSlug: string
}): boolean {
  if (!args.record) {
    return false
  }

  const customProperties = asRecord(args.record.customProperties)
  const bookingSurface = normalizeOptionalString(
    customProperties.bookingSurface
    || customProperties.appSlug
    || customProperties.surfaceAppSlug
  )
  if (bookingSurface) {
    return bookingSurface === args.appSlug
  }

  return Boolean(resolveCourseMarker(args))
}

function resolvePriceInCentsFromRecord(
  record: SegelschuleCatalogObjectRecord | null | undefined
): number | null {
  if (!record) {
    return null
  }

  const customProperties = asRecord(record.customProperties)
  return (
    normalizePriceInCents(customProperties.priceInCents)
    || normalizePriceInCents(customProperties.pricePerUnit)
    || normalizePriceInCents(customProperties.price)
    || normalizePriceInCents(customProperties.basePrice)
    || null
  )
}

async function fetchCatalogObject(args: {
  convex: unknown
  queryInternalFn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convex: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryRef: any,
    queryArgs: Record<string, unknown>
  ) => Promise<unknown>
  generatedInternalApi: any
  objectId: string | null
}): Promise<SegelschuleCatalogObjectRecord | null> {
  if (!args.objectId) {
    return null
  }

  const routerQueryRef =
    args.generatedInternalApi?.channels?.router?.getObjectByIdInternal

  if (!routerQueryRef) {
    return null
  }

  const record = (await args.queryInternalFn(
    args.convex,
    routerQueryRef,
    { objectId: args.objectId }
  )) as SegelschuleCatalogObjectRecord | null

  return record && record.type === "product" ? record : null
}

async function fetchLinksFromObject(args: {
  convex: unknown
  queryInternalFn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convex: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryRef: any,
    queryArgs: Record<string, unknown>
  ) => Promise<unknown>
  generatedInternalApi: any
  objectId: string
  linkType?: string
}): Promise<SegelschuleCatalogObjectLinkRecord[]> {
  const linksQueryRef = args.generatedInternalApi?.objectLinksInternal?.getLinksFromObject
  if (!linksQueryRef) {
    return []
  }

  const links = (await args.queryInternalFn(
    args.convex,
    linksQueryRef,
    {
      fromObjectId: args.objectId,
      ...(args.linkType ? { linkType: args.linkType } : {}),
    }
  )) as SegelschuleCatalogObjectLinkRecord[] | null

  return Array.isArray(links) ? links : []
}

async function resolveAvailabilityResourceIdForProduct(args: {
  convex: unknown
  queryInternalFn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convex: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryRef: any,
    queryArgs: Record<string, unknown>
  ) => Promise<unknown>
  generatedInternalApi: any
  product: SegelschuleCatalogObjectRecord
}): Promise<string | null> {
  const customProperties = asRecord(args.product.customProperties)
  const shadowResourceId = normalizeObjectId(customProperties.availabilityResourceId)
  if (shadowResourceId) {
    return shadowResourceId
  }

  const explicitLinks = await fetchLinksFromObject({
    convex: args.convex,
    queryInternalFn: args.queryInternalFn,
    generatedInternalApi: args.generatedInternalApi,
    objectId: args.product._id,
    linkType: PRODUCT_AVAILABILITY_LINK_TYPE,
  })
  const explicitResourceId = normalizeObjectId(explicitLinks[0]?.toObjectId)
  if (explicitResourceId) {
    return explicitResourceId
  }

  return null
}

function selectDiscoveredBookingResource(
  entries: Array<{
    product: SegelschuleCatalogObjectRecord
    directCourseId: string | null
    availabilityResourceId: string | null
  }>
): string | null {
  const candidateIds = dedupeStrings(
    entries.map((entry) => entry.availabilityResourceId)
  )
  if (candidateIds.length === 0) {
    return null
  }

  return [...candidateIds].sort((left, right) => {
    return left.localeCompare(right)
  })[0] || null
}

function selectDiscoveredCheckoutProduct(args: {
  entries: Array<{
    product: SegelschuleCatalogObjectRecord
    directCourseId: string | null
    availabilityResourceId: string | null
  }>
  bookingResourceId: string | null
}): string | null {
  const sortedEntries = [...args.entries].sort((left, right) => {
    const leftSeparate = left.product._id !== args.bookingResourceId ? 0 : 1
    const rightSeparate = right.product._id !== args.bookingResourceId ? 0 : 1
    if (leftSeparate !== rightSeparate) {
      return leftSeparate - rightSeparate
    }

    const leftHasDirectCourseId = left.directCourseId ? 0 : 1
    const rightHasDirectCourseId = right.directCourseId ? 0 : 1
    if (leftHasDirectCourseId !== rightHasDirectCourseId) {
      return leftHasDirectCourseId - rightHasDirectCourseId
    }

    const leftHasPrice = resolvePriceInCentsFromRecord(left.product) ? 0 : 1
    const rightHasPrice = resolvePriceInCentsFromRecord(right.product) ? 0 : 1
    if (leftHasPrice !== rightHasPrice) {
      return leftHasPrice - rightHasPrice
    }

    return left.product._id.localeCompare(right.product._id)
  })

  return sortedEntries[0]?.product._id || args.bookingResourceId || null
}

async function discoverSegelschuleCourseBindings(args: {
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
  appSlug: string
}): Promise<{
  courses: SegelschuleDiscoveredCourseBinding[]
  warnings: string[]
}> {
  const warnings: string[] = []
  const listProductsQueryRef =
    args.generatedInternalApi?.channels?.router?.listObjectsByOrgTypeInternal
  if (!listProductsQueryRef) {
    warnings.push("backend_catalog_list_query_missing")
    return { courses: [], warnings }
  }

  try {
    const orgProducts = (await args.queryInternalFn(
      args.convex,
      listProductsQueryRef,
      {
        organizationId: args.organizationId,
        type: "product",
      }
    )) as SegelschuleCatalogObjectRecord[] | null

    const activeProducts = (orgProducts || []).filter(isActiveCatalogObject)
    const productById = new Map(activeProducts.map((product) => [product._id, product]))
    const resolvedEntries = await Promise.all(
      activeProducts
        .filter(isCommercialCourseProduct)
        .map(async (product) => {
        const availabilityResourceId = await resolveAvailabilityResourceIdForProduct({
          convex: args.convex,
          queryInternalFn: args.queryInternalFn,
          generatedInternalApi: args.generatedInternalApi,
          product,
        })
        const availabilityResource =
          (availabilityResourceId && productById.get(availabilityResourceId))
          || (availabilityResourceId
            ? await fetchCatalogObject({
                convex: args.convex,
                queryInternalFn: args.queryInternalFn,
                generatedInternalApi: args.generatedInternalApi,
                objectId: availabilityResourceId,
              })
            : null)

        const directCourseId = resolveCourseMarker({
          record: product,
          appSlug: args.appSlug,
        })
        const resourceCourseId = resolveCourseMarker({
          record: availabilityResource,
          appSlug: args.appSlug,
        })
        const isScoped =
          isSegelschuleScopedRecord({
            record: product,
            appSlug: args.appSlug,
          })
          || isSegelschuleScopedRecord({
            record: availabilityResource,
            appSlug: args.appSlug,
          })
          || Boolean(directCourseId)
          || Boolean(resourceCourseId)
        const hasLinkedAvailabilityResource = Boolean(
          availabilityResourceId && availabilityResource
        )

        return {
          product,
          directCourseId,
          availabilityResourceId,
          hasLinkedAvailabilityResource,
          resolvedCourseId: directCourseId || resourceCourseId,
          isScoped,
        }
        })
    )

    const courseEntries = new Map<
      string,
      Array<{
        product: SegelschuleCatalogObjectRecord
        directCourseId: string | null
        availabilityResourceId: string | null
      }>
    >()

    for (const entry of resolvedEntries) {
      if (
        !entry.isScoped
        || !entry.resolvedCourseId
        || !entry.hasLinkedAvailabilityResource
      ) {
        continue
      }

      const entries = courseEntries.get(entry.resolvedCourseId) || []
      entries.push({
        product: entry.product,
        directCourseId: entry.directCourseId,
        availabilityResourceId: entry.availabilityResourceId,
      })
      courseEntries.set(entry.resolvedCourseId, entries)
    }

    const courses = Array.from(courseEntries.entries())
      .map(([courseId, entries]) => {
        const bookingResourceId = selectDiscoveredBookingResource(entries)
        return {
          courseId,
          bookingResourceId,
          checkoutProductId: selectDiscoveredCheckoutProduct({
            entries,
            bookingResourceId,
          }),
        }
      })
      .sort((left, right) => {
        const leftIndex = DEFAULT_COURSE_DISPLAY_ORDER.indexOf(left.courseId)
        const rightIndex = DEFAULT_COURSE_DISPLAY_ORDER.indexOf(right.courseId)
        if (leftIndex >= 0 || rightIndex >= 0) {
          if (leftIndex < 0) return 1
          if (rightIndex < 0) return -1
          if (leftIndex !== rightIndex) return leftIndex - rightIndex
        }
        return left.courseId.localeCompare(right.courseId)
      })

    if (courses.length === 0) {
      warnings.push("backend_catalog_empty")
    }

    return { courses, warnings }
  } catch (error) {
    console.error("[segelschule-catalog] Backend discovery failed:", error)
    warnings.push("backend_catalog_discovery_failed")
    return {
      courses: [],
      warnings,
    }
  }
}

async function resolveCatalogCourse(args: {
  convex: unknown
  queryInternalFn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convex: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryRef: any,
    queryArgs: Record<string, unknown>
  ) => Promise<unknown>
  generatedInternalApi: any
  language: string
  courseId: string
  defaultAvailableTimes: string[]
  discoveredCheckoutProductId: string | null
  discoveredBookingResourceId: string | null
  runtimeCourseConfig?: SegelschuleCourseRuntimeConfig | null
}): Promise<SegelschuleBookingCatalogCourse> {
  const warnings: string[] = []
  const configuredCheckoutProductId = normalizeObjectId(
    args.runtimeCourseConfig?.checkoutProductId
  )
  const configuredBookingResourceId = normalizeObjectId(
    args.runtimeCourseConfig?.bookingResourceId
  )

  let checkoutProductId =
    args.discoveredCheckoutProductId
    || configuredCheckoutProductId
    || args.discoveredBookingResourceId
    || configuredBookingResourceId
    || null
  if (
    configuredCheckoutProductId
    && args.discoveredCheckoutProductId
    && configuredCheckoutProductId !== args.discoveredCheckoutProductId
  ) {
    warnings.push("runtime_checkout_product_mismatch_with_backend")
  }
  if (!configuredCheckoutProductId && configuredBookingResourceId) {
    warnings.push("checkout_product_defaulted_to_booking_resource")
  }

  const checkoutProduct = await fetchCatalogObject({
    convex: args.convex,
    queryInternalFn: args.queryInternalFn,
    generatedInternalApi: args.generatedInternalApi,
    objectId: checkoutProductId,
  })
  if (checkoutProductId && !checkoutProduct) {
    warnings.push("checkout_product_missing")
  }

  const checkoutProductProps = asRecord(checkoutProduct?.customProperties)
  const linkedAvailabilityResourceId =
    normalizeObjectId(checkoutProductProps.availabilityResourceId)
  const bookingResourceId =
    args.discoveredBookingResourceId
    || linkedAvailabilityResourceId
    || configuredBookingResourceId
    || checkoutProductId
    || null
  if (
    configuredBookingResourceId
    && args.discoveredBookingResourceId
    && configuredBookingResourceId !== args.discoveredBookingResourceId
  ) {
    warnings.push("runtime_booking_resource_mismatch_with_backend")
  }
  if (
    bookingResourceId
    && linkedAvailabilityResourceId
    && bookingResourceId !== linkedAvailabilityResourceId
  ) {
    warnings.push("runtime_booking_resource_mismatch_with_product")
  }

  const bookingResource =
    bookingResourceId && bookingResourceId === checkoutProductId
      ? checkoutProduct
      : await fetchCatalogObject({
          convex: args.convex,
          queryInternalFn: args.queryInternalFn,
          generatedInternalApi: args.generatedInternalApi,
          objectId: bookingResourceId,
        })
  if (bookingResourceId && !bookingResource) {
    warnings.push("booking_resource_missing")
  }

  const priceInCents =
    resolvePriceInCentsFromRecord(checkoutProduct)
    || 0
  if (priceInCents <= 0) {
    warnings.push("course_price_missing")
  }

  const currency =
    normalizeCurrency(checkoutProductProps.currency)
    || normalizeCurrency(asRecord(bookingResource?.customProperties).currency)
    || "EUR"

  const durationMinutes =
    resolveDurationMinutesFromProduct(checkoutProduct)
    || resolveDurationMinutesFromProduct(bookingResource)
    || args.runtimeCourseConfig?.bookingDurationMinutes
    || DEFAULT_COURSE_DURATION_MINUTES[args.courseId]
    || DEFAULT_SINGLE_DAY_BOOKING_MINUTES

  const isMultiDay =
    normalizeBoolean(checkoutProductProps.isMultiDay)
    ?? normalizeBoolean(asRecord(bookingResource?.customProperties).isMultiDay)
    ?? args.runtimeCourseConfig?.isMultiDay
    ?? DEFAULT_MULTI_DAY_COURSE_IDS.has(args.courseId)

  const title = resolveCourseTitle({
    language: args.language,
    courseId: args.courseId,
    product: checkoutProduct,
    resource: bookingResource,
  })
  const description = resolveCourseDescription({
    language: args.language,
    product: checkoutProduct,
    resource: bookingResource,
  })
  const durationLabel = resolveCourseDurationLabel({
    language: args.language,
    product: checkoutProduct,
    resource: bookingResource,
  })

  return {
    courseId: args.courseId,
    aliases: resolveCourseAliases({
      courseId: args.courseId,
      product: checkoutProduct,
      resource: bookingResource,
    }),
    title,
    description,
    durationLabel,
    durationMinutes,
    priceInCents,
    currency,
    isMultiDay,
    checkoutProductId,
    bookingResourceId,
    bookingResourceName: normalizeOptionalString(bookingResource?.name) || null,
    bookingResourceSubtype:
      normalizeOptionalString(bookingResource?.subtype) || null,
    fulfillmentType: resolveCourseFulfillmentType({
      product: checkoutProduct,
      resource: bookingResource,
    }),
    availableTimes:
      args.runtimeCourseConfig?.availableTimes
      && args.runtimeCourseConfig.availableTimes.length > 0
        ? args.runtimeCourseConfig.availableTimes
        : args.defaultAvailableTimes,
    checkoutPublicUrl: normalizeObjectId(args.runtimeCourseConfig?.checkoutPublicUrl),
    warnings,
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

export async function resolveSegelschuleBookingCatalog(args: {
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
  language?: string
}): Promise<SegelschuleBookingCatalogResolution> {
  const initialRuntimeResolution = await resolveSegelschuleRuntimeConfig({
    convex: args.convex,
    queryInternalFn: args.queryInternalFn,
    generatedInternalApi: args.generatedInternalApi,
    organizationId: args.organizationId,
    identity: args.identity,
  })

  const language = args.language || "de"
  const discoveredCatalog = await discoverSegelschuleCourseBindings({
    convex: args.convex,
    queryInternalFn: args.queryInternalFn,
    generatedInternalApi: args.generatedInternalApi,
    organizationId: args.organizationId,
    appSlug: initialRuntimeResolution.identity.appSlug,
  })
  const runtimeResolution = {
    ...initialRuntimeResolution,
    warnings: [
      ...initialRuntimeResolution.warnings,
      ...discoveredCatalog.warnings,
    ],
  }

  const runtimeCourseConfigs = runtimeResolution.runtimeConfig.courses
  const discoveredCourses = discoveredCatalog.courses
  const courses = await Promise.all(
    discoveredCourses.map((courseBinding) =>
      resolveCatalogCourse({
        convex: args.convex,
        queryInternalFn: args.queryInternalFn,
        generatedInternalApi: args.generatedInternalApi,
        language,
        courseId: courseBinding.courseId,
        defaultAvailableTimes: runtimeResolution.runtimeConfig.defaultAvailableTimes,
        discoveredCheckoutProductId: courseBinding.checkoutProductId,
        discoveredBookingResourceId: courseBinding.bookingResourceId,
        runtimeCourseConfig: runtimeCourseConfigs[courseBinding.courseId] || null,
      })
    )
  )

  return {
    runtimeResolution,
    boats: runtimeResolution.runtimeConfig.boats,
    courses,
  }
}

export async function resolveSegelschuleBookingCourse(args: {
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
  courseId: string
  identity?: Partial<SegelschuleSurfaceBindingIdentity>
  language?: string
}): Promise<SegelschuleBookingCourseResolution> {
  const normalizedRequestedCourseId = args.courseId.trim()
  const catalogResolution = await resolveSegelschuleBookingCatalog({
    convex: args.convex,
    queryInternalFn: args.queryInternalFn,
    generatedInternalApi: args.generatedInternalApi,
    organizationId: args.organizationId,
    identity: args.identity,
    language: args.language,
  })

  const course =
    catalogResolution.courses.find(
      (candidate) =>
        candidate.courseId === normalizedRequestedCourseId
        || candidate.aliases.includes(normalizedRequestedCourseId)
    )
    || null

  return {
    ...catalogResolution,
    requestedCourseId: normalizedRequestedCourseId,
    resolvedCourseId: course?.courseId || null,
    course,
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

export function parseBookingStartTimestamp(
  date: string,
  time: string,
  timezone = "Europe/Berlin"
): number | null {
  const dateValue = date.trim()
  const timeValue = time.trim()
  if (!dateValue || !timeValue) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null
  }
  if (!normalizeTimeSlot(timeValue)) {
    return null
  }

  const timestamp = localDateTimeToTimestamp(dateValue, timeValue, timezone)
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
