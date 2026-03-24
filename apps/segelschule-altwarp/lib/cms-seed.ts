import type { CmsTransport } from "@cms"
import { SUPPORTED_LANGUAGES, translations, type Language } from "./translations"

type LocaleContent = (typeof translations)[Language]

interface CmsSeedField {
  page: string
  section: string
  key: string
  getValue: (localeContent: LocaleContent) => unknown
}

export interface CmsSeedResult {
  created: number
  skipped: number
  failed: number
}

type SeedPathSegment = string | number

export const CMS_TRANSLATION_SEED_VERSION = "segelschule-home-v2"

function readPath(value: unknown, path: SeedPathSegment[]): unknown {
  let current: unknown = value
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
        return undefined
      }
      current = current[segment]
      continue
    }

    if (!current || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function fieldFromPath(
  page: string,
  section: string,
  key: string,
  path: SeedPathSegment[]
): CmsSeedField {
  return {
    page,
    section,
    key,
    getValue: (localeContent) => readPath(localeContent, path),
  }
}

const CMS_SEED_FIELDS: CmsSeedField[] = [
  fieldFromPath("home", "nav", "about", ["nav", "about"]),
  fieldFromPath("home", "nav", "courses", ["nav", "courses"]),
  fieldFromPath("home", "nav", "pricing", ["nav", "pricing"]),
  fieldFromPath("home", "nav", "team", ["nav", "team"]),
  fieldFromPath("home", "nav", "gallery", ["nav", "gallery"]),
  fieldFromPath("home", "nav", "contact", ["nav", "contact"]),
  fieldFromPath("home", "nav", "booking", ["nav", "booking"]),

  fieldFromPath("home", "hero", "eyebrow", ["hero", "scriptText"]),
  fieldFromPath("home", "hero", "title", ["hero", "title"]),
  fieldFromPath("home", "hero", "subtitle", ["hero", "subtitle"]),
  fieldFromPath("home", "hero", "description", ["hero", "description"]),
  fieldFromPath("home", "hero", "cta", ["hero", "cta"]),

  fieldFromPath("home", "about", "title", ["about", "title"]),
  fieldFromPath("home", "about", "text", ["about", "text"]),

  fieldFromPath("home", "plattboden", "title", ["plattboden", "title"]),
  fieldFromPath("home", "plattboden", "text", ["plattboden", "text"]),
  fieldFromPath("home", "plattboden", "subtitle", ["plattboden", "subtitle"]),

  fieldFromPath("home", "process", "title", ["process", "title"]),
  fieldFromPath("home", "process", "subtitle", ["process", "subtitle"]),
  fieldFromPath("home", "process", "step_1_title", ["process", "steps", 0, "title"]),
  fieldFromPath("home", "process", "step_1_description", ["process", "steps", 0, "description"]),
  fieldFromPath("home", "process", "step_2_title", ["process", "steps", 1, "title"]),
  fieldFromPath("home", "process", "step_2_description", ["process", "steps", 1, "description"]),
  fieldFromPath("home", "process", "step_3_title", ["process", "steps", 2, "title"]),
  fieldFromPath("home", "process", "step_3_description", ["process", "steps", 2, "description"]),

  fieldFromPath("home", "courses", "title", ["courses", "title"]),
  fieldFromPath("home", "courses", "subtitle", ["courses", "subtitle"]),
  fieldFromPath("home", "courses", "button", ["courses", "button"]),

  fieldFromPath("home", "courses", "schnupper_title", ["courses", "schnupper", "title"]),
  fieldFromPath("home", "courses", "schnupper_duration", ["courses", "schnupper", "duration"]),
  fieldFromPath("home", "courses", "schnupper_price", ["courses", "schnupper", "price"]),
  fieldFromPath("home", "courses", "schnupper_description", ["courses", "schnupper", "description"]),
  fieldFromPath("home", "courses", "schnupper_feature_1", ["courses", "schnupper", "features", 0]),
  fieldFromPath("home", "courses", "schnupper_feature_2", ["courses", "schnupper", "features", 1]),
  fieldFromPath("home", "courses", "schnupper_feature_3", ["courses", "schnupper", "features", 2]),
  fieldFromPath("home", "courses", "schnupper_feature_4", ["courses", "schnupper", "features", 3]),

  fieldFromPath("home", "courses", "wochenende_title", ["courses", "grund", "title"]),
  fieldFromPath("home", "courses", "wochenende_duration", ["courses", "grund", "duration"]),
  fieldFromPath("home", "courses", "wochenende_price", ["courses", "grund", "price"]),
  fieldFromPath("home", "courses", "wochenende_description", ["courses", "grund", "description"]),
  fieldFromPath("home", "courses", "wochenende_feature_1", ["courses", "grund", "features", 0]),
  fieldFromPath("home", "courses", "wochenende_feature_2", ["courses", "grund", "features", 1]),
  fieldFromPath("home", "courses", "wochenende_feature_3", ["courses", "grund", "features", 2]),
  fieldFromPath("home", "courses", "wochenende_feature_4", ["courses", "grund", "features", 3]),

  fieldFromPath("home", "courses", "intensiv_title", ["courses", "intensiv", "title"]),
  fieldFromPath("home", "courses", "intensiv_duration", ["courses", "intensiv", "duration"]),
  fieldFromPath("home", "courses", "intensiv_price", ["courses", "intensiv", "price"]),
  fieldFromPath("home", "courses", "intensiv_description", ["courses", "intensiv", "description"]),
  fieldFromPath("home", "courses", "intensiv_feature_1", ["courses", "intensiv", "features", 0]),
  fieldFromPath("home", "courses", "intensiv_feature_2", ["courses", "intensiv", "features", 1]),
  fieldFromPath("home", "courses", "intensiv_feature_3", ["courses", "intensiv", "features", 2]),
  fieldFromPath("home", "courses", "intensiv_feature_4", ["courses", "intensiv", "features", 3]),

  fieldFromPath("home", "courses", "praxis_title", ["courses", "praxis", "title"]),
  fieldFromPath("home", "courses", "praxis_duration", ["courses", "praxis", "duration"]),
  fieldFromPath("home", "courses", "praxis_price", ["courses", "praxis", "price"]),
  fieldFromPath("home", "courses", "praxis_description", ["courses", "praxis", "description"]),
  fieldFromPath("home", "courses", "praxis_feature_1", ["courses", "praxis", "features", 0]),
  fieldFromPath("home", "courses", "praxis_feature_2", ["courses", "praxis", "features", 1]),
  fieldFromPath("home", "courses", "praxis_feature_3", ["courses", "praxis", "features", 2]),
  fieldFromPath("home", "courses", "praxis_feature_4", ["courses", "praxis", "features", 3]),

  fieldFromPath("home", "smallGroups", "title", ["smallGroups", "title"]),
  fieldFromPath("home", "smallGroups", "text", ["smallGroups", "text"]),

  fieldFromPath("home", "revier", "title", ["revier", "title"]),
  fieldFromPath("home", "revier", "text", ["revier", "text"]),

  fieldFromPath("home", "leisure", "title", ["leisure", "title"]),
  fieldFromPath("home", "leisure", "text", ["leisure", "text"]),
  fieldFromPath("home", "leisure", "button", ["leisure", "button"]),

  fieldFromPath("home", "testimonials", "scriptText", ["testimonials", "scriptText"]),
  fieldFromPath("home", "testimonials", "title", ["testimonials", "title"]),
  fieldFromPath("home", "testimonials", "review_1_name", ["testimonials", "reviews", 0, "name"]),
  fieldFromPath("home", "testimonials", "review_1_text", ["testimonials", "reviews", 0, "text"]),
  fieldFromPath("home", "testimonials", "review_2_name", ["testimonials", "reviews", 1, "name"]),
  fieldFromPath("home", "testimonials", "review_2_text", ["testimonials", "reviews", 1, "text"]),
  fieldFromPath("home", "testimonials", "review_3_name", ["testimonials", "reviews", 2, "name"]),
  fieldFromPath("home", "testimonials", "review_3_text", ["testimonials", "reviews", 2, "text"]),

  fieldFromPath("home", "gallery", "title", ["gallery", "title"]),
  fieldFromPath("home", "gallery", "subtitle", ["gallery", "subtitle"]),

  fieldFromPath("home", "team", "title", ["team", "title"]),
  fieldFromPath("home", "team", "subtitle", ["team", "subtitle"]),
  fieldFromPath("home", "team", "member_1_name", ["team", "members", 0, "name"]),
  fieldFromPath("home", "team", "member_1_role", ["team", "members", 0, "role"]),
  fieldFromPath("home", "team", "member_1_bio", ["team", "members", 0, "bio"]),
  fieldFromPath("home", "team", "member_2_name", ["team", "members", 1, "name"]),
  fieldFromPath("home", "team", "member_2_role", ["team", "members", 1, "role"]),
  fieldFromPath("home", "team", "member_2_bio", ["team", "members", 1, "bio"]),
  fieldFromPath("home", "team", "member_3_name", ["team", "members", 2, "name"]),
  fieldFromPath("home", "team", "member_3_role", ["team", "members", 2, "role"]),
  fieldFromPath("home", "team", "member_3_bio", ["team", "members", 2, "bio"]),

  fieldFromPath("home", "faq", "title", ["faq", "title"]),
  fieldFromPath("home", "faq", "subtitle", ["faq", "subtitle"]),
  fieldFromPath("home", "faq", "item_1_question", ["faq", "items", 0, "question"]),
  fieldFromPath("home", "faq", "item_1_answer", ["faq", "items", 0, "answer"]),
  fieldFromPath("home", "faq", "item_2_question", ["faq", "items", 1, "question"]),
  fieldFromPath("home", "faq", "item_2_answer", ["faq", "items", 1, "answer"]),
  fieldFromPath("home", "faq", "item_3_question", ["faq", "items", 2, "question"]),
  fieldFromPath("home", "faq", "item_3_answer", ["faq", "items", 2, "answer"]),
  fieldFromPath("home", "faq", "item_4_question", ["faq", "items", 3, "question"]),
  fieldFromPath("home", "faq", "item_4_answer", ["faq", "items", 3, "answer"]),
  fieldFromPath("home", "faq", "item_5_question", ["faq", "items", 4, "question"]),
  fieldFromPath("home", "faq", "item_5_answer", ["faq", "items", 4, "answer"]),

  fieldFromPath("home", "cta", "title", ["cta", "title"]),
  fieldFromPath("home", "cta", "description", ["cta", "description"]),
  fieldFromPath("home", "cta", "button", ["cta", "button"]),

  fieldFromPath("home", "footer", "location", ["footer", "location"]),
  fieldFromPath("home", "footer", "address", ["footer", "address"]),
  fieldFromPath("home", "footer", "phone", ["footer", "phone"]),
  fieldFromPath("home", "footer", "email", ["footer", "email"]),
  fieldFromPath("home", "footer", "social", ["footer", "social"]),
  fieldFromPath("home", "footer", "navigation", ["footer", "navigation"]),
  fieldFromPath("home", "footer", "navCourses", ["footer", "navCourses"]),
  fieldFromPath("home", "footer", "navTeam", ["footer", "navTeam"]),
  fieldFromPath("home", "footer", "navGallery", ["footer", "navGallery"]),
  fieldFromPath("home", "footer", "navContact", ["footer", "navContact"]),
  fieldFromPath("home", "footer", "copyright", ["footer", "copyright"]),
]

function normalizeSeedValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  return value.trim().length > 0 ? value : null
}

function hasExactLocaleRecord(
  record: { recordId: string | null; locale: string | null },
  locale: string
): boolean {
  return Boolean(record.recordId && record.locale === locale)
}

export function getCmsSeedStorageKey(host: string): string {
  return `segelschule-cms-seed:${host}:${CMS_TRANSLATION_SEED_VERSION}`
}

export async function seedCmsTextFromTranslations(
  transport: CmsTransport
): Promise<CmsSeedResult> {
  let created = 0
  let skipped = 0
  let failed = 0

  for (const locale of SUPPORTED_LANGUAGES) {
    const localeContent = translations[locale]

    for (const field of CMS_SEED_FIELDS) {
      const seedValue = normalizeSeedValue(field.getValue(localeContent))
      if (!seedValue) {
        skipped += 1
        continue
      }

      try {
        const existing = await transport.getContent({
          page: field.page,
          section: field.section,
          key: field.key,
          locale,
          defaultLocale: locale,
        })

        if (hasExactLocaleRecord(existing, locale)) {
          skipped += 1
          continue
        }

        await transport.saveContent({
          page: field.page,
          section: field.section,
          key: field.key,
          locale,
          subtype: "text",
          value: seedValue,
        })
        created += 1
      } catch (error) {
        failed += 1
        console.warn("[CMS Seed] Failed to seed field", {
          locale,
          page: field.page,
          section: field.section,
          key: field.key,
          error,
        })
      }
    }
  }

  return { created, skipped, failed }
}
