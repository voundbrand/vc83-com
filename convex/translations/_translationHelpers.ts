/**
 * TRANSLATION SEEDING HELPERS
 *
 * Efficient duplicate checking for translation seeds
 * Avoids hitting Convex's 32k document read limit by checking individually
 */

import { Id } from "../_generated/dataModel";
import { DatabaseReader, DatabaseWriter } from "../_generated/server";

/**
 * This function is NO LONGER USED - kept for backwards compatibility
 * Use insertTranslationIfNew directly which checks individually
 */
 
export async function getExistingTranslationKeys(
  _db: DatabaseReader,
  _systemOrgId: Id<"organizations">,
  _translationKeys: string[]
): Promise<Set<string>> {
  // Return empty set - checking is done individually now
  return new Set<string>();
}

/**
 * Insert translation if it doesn't exist
 * Checks individually to avoid reading too many documents
 * Returns true if inserted, false if skipped
 */
export async function insertTranslationIfNew(
  db: DatabaseWriter,
  _existingKeys: Set<string>, // Ignored - kept for backwards compatibility
  systemOrgId: Id<"organizations">,
  systemUserId: Id<"users">,
  key: string,
  value: string,
  locale: string,
  category: string,
  component?: string
): Promise<boolean> {
  // Check if this specific translation exists using the highly-selective index
  // This index includes organizationId, type, locale, AND name - perfect for exact match
  const existing = await db
    .query("objects")
    .withIndex("by_org_type_locale_name", (q) =>
      q
        .eq("organizationId", systemOrgId)
        .eq("type", "translation")
        .eq("locale", locale)
        .eq("name", key)
    )
    .first();

  if (existing) {
    return false; // Already exists
  }

  const customProperties: Record<string, string> = { category };
  if (component) {
    customProperties.component = component;
  }

  await db.insert("objects", {
    organizationId: systemOrgId,
    type: "translation",
    subtype: "ui",
    name: key,
    value: value,
    locale: locale,
    status: "approved",
    customProperties,
    createdBy: systemUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return true; // Inserted
}

/**
 * Upsert translation - UPDATE if exists, INSERT if new
 * Use this when you want to update existing translations (e.g., fixing typos or changing wording)
 * Returns: { inserted: boolean, updated: boolean }
 */
export async function upsertTranslation(
  db: DatabaseWriter,
  systemOrgId: Id<"organizations">,
  systemUserId: Id<"users">,
  key: string,
  value: string,
  locale: string,
  category: string,
  component?: string
): Promise<{ inserted: boolean; updated: boolean }> {
  // Check if this specific translation exists
  const existing = await db
    .query("objects")
    .withIndex("by_org_type_locale_name", (q) =>
      q
        .eq("organizationId", systemOrgId)
        .eq("type", "translation")
        .eq("locale", locale)
        .eq("name", key)
    )
    .first();

  if (existing) {
    // Update existing translation
    await db.patch(existing._id, {
      value: value,
      updatedAt: Date.now(),
    });
    return { inserted: false, updated: true };
  }

  // Insert new translation
  const customProperties: Record<string, string> = { category };
  if (component) {
    customProperties.component = component;
  }

  await db.insert("objects", {
    organizationId: systemOrgId,
    type: "translation",
    subtype: "ui",
    name: key,
    value: value,
    locale: locale,
    status: "approved",
    customProperties,
    createdBy: systemUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { inserted: true, updated: false };
}
