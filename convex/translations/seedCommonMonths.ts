/**
 * COMMON MONTH NAME TRANSLATIONS
 *
 * Translations for month names used in date formatting throughout the app.
 * Used by invoice PDF generation, email templates, etc.
 *
 * Follows the translation system architecture from TRANSLATION_SYSTEM.md
 */

import { mutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export default mutation(async ({ db }) => {
  // Get system organization
  const systemOrg = await db
    .query("organizations")
    .filter((q) => q.eq(q.field("slug"), "system"))
    .first();

  if (!systemOrg) {
    throw new Error("System organization not found");
  }

  // Get or create a system user for createdBy field
  let systemUser = await db
    .query("users")
    .filter((q) => q.eq(q.field("defaultOrgId"), systemOrg._id))
    .first();

  // If no user exists in system org, use the first available user
  if (!systemUser) {
    systemUser = await db.query("users").first();
  }

  if (!systemUser) {
    throw new Error("No users found in database - please create at least one user first");
  }

  const existingKeys = new Set<string>();
  const category = "common";
  let insertedCount = 0;

  // ============================================================================
  // ENGLISH MONTH NAMES
  // ============================================================================

  const englishMonths = [
    { key: "common.months.january", value: "January" },
    { key: "common.months.february", value: "February" },
    { key: "common.months.march", value: "March" },
    { key: "common.months.april", value: "April" },
    { key: "common.months.may", value: "May" },
    { key: "common.months.june", value: "June" },
    { key: "common.months.july", value: "July" },
    { key: "common.months.august", value: "August" },
    { key: "common.months.september", value: "September" },
    { key: "common.months.october", value: "October" },
    { key: "common.months.november", value: "November" },
    { key: "common.months.december", value: "December" },
  ];

  for (const t of englishMonths) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "en",
      category
    );
    if (inserted) insertedCount++;
  }

  // ============================================================================
  // GERMAN MONTH NAMES
  // ============================================================================

  const germanMonths = [
    { key: "common.months.january", value: "Januar" },
    { key: "common.months.february", value: "Februar" },
    { key: "common.months.march", value: "März" },
    { key: "common.months.april", value: "April" },
    { key: "common.months.may", value: "Mai" },
    { key: "common.months.june", value: "Juni" },
    { key: "common.months.july", value: "Juli" },
    { key: "common.months.august", value: "August" },
    { key: "common.months.september", value: "September" },
    { key: "common.months.october", value: "Oktober" },
    { key: "common.months.november", value: "November" },
    { key: "common.months.december", value: "Dezember" },
  ];

  for (const t of germanMonths) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "de",
      category
    );
    if (inserted) insertedCount++;
  }

  // ============================================================================
  // FRENCH MONTH NAMES
  // ============================================================================

  const frenchMonths = [
    { key: "common.months.january", value: "janvier" },
    { key: "common.months.february", value: "février" },
    { key: "common.months.march", value: "mars" },
    { key: "common.months.april", value: "avril" },
    { key: "common.months.may", value: "mai" },
    { key: "common.months.june", value: "juin" },
    { key: "common.months.july", value: "juillet" },
    { key: "common.months.august", value: "août" },
    { key: "common.months.september", value: "septembre" },
    { key: "common.months.october", value: "octobre" },
    { key: "common.months.november", value: "novembre" },
    { key: "common.months.december", value: "décembre" },
  ];

  for (const t of frenchMonths) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "fr",
      category
    );
    if (inserted) insertedCount++;
  }

  // ============================================================================
  // SPANISH MONTH NAMES
  // ============================================================================

  const spanishMonths = [
    { key: "common.months.january", value: "enero" },
    { key: "common.months.february", value: "febrero" },
    { key: "common.months.march", value: "marzo" },
    { key: "common.months.april", value: "abril" },
    { key: "common.months.may", value: "mayo" },
    { key: "common.months.june", value: "junio" },
    { key: "common.months.july", value: "julio" },
    { key: "common.months.august", value: "agosto" },
    { key: "common.months.september", value: "septiembre" },
    { key: "common.months.october", value: "octubre" },
    { key: "common.months.november", value: "noviembre" },
    { key: "common.months.december", value: "diciembre" },
  ];

  for (const t of spanishMonths) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "es",
      category
    );
    if (inserted) insertedCount++;
  }

  // ============================================================================
  // POLISH MONTH NAMES
  // ============================================================================

  const polishMonths = [
    { key: "common.months.january", value: "styczeń" },
    { key: "common.months.february", value: "luty" },
    { key: "common.months.march", value: "marzec" },
    { key: "common.months.april", value: "kwiecień" },
    { key: "common.months.may", value: "maj" },
    { key: "common.months.june", value: "czerwiec" },
    { key: "common.months.july", value: "lipiec" },
    { key: "common.months.august", value: "sierpień" },
    { key: "common.months.september", value: "wrzesień" },
    { key: "common.months.october", value: "październik" },
    { key: "common.months.november", value: "listopad" },
    { key: "common.months.december", value: "grudzień" },
  ];

  for (const t of polishMonths) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "pl",
      category
    );
    if (inserted) insertedCount++;
  }

  // ============================================================================
  // JAPANESE MONTH NAMES
  // ============================================================================

  const japaneseMonths = [
    { key: "common.months.january", value: "1月" },
    { key: "common.months.february", value: "2月" },
    { key: "common.months.march", value: "3月" },
    { key: "common.months.april", value: "4月" },
    { key: "common.months.may", value: "5月" },
    { key: "common.months.june", value: "6月" },
    { key: "common.months.july", value: "7月" },
    { key: "common.months.august", value: "8月" },
    { key: "common.months.september", value: "9月" },
    { key: "common.months.october", value: "10月" },
    { key: "common.months.november", value: "11月" },
    { key: "common.months.december", value: "12月" },
  ];

  for (const t of japaneseMonths) {
    const inserted = await insertTranslationIfNew(
      db,
      existingKeys,
      systemOrg._id,
      systemUser._id,
      t.key,
      t.value,
      "ja",
      category
    );
    if (inserted) insertedCount++;
  }

  console.log(`✅ Seeded ${insertedCount} common month translations`);
  return { insertedCount };
});
