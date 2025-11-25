/**
 * FORMS RESPONSES TRANSLATIONS - JAPANESE
 *
 * Japanese translations for the Forms Responses tab UI
 * Namespace: ui.forms.responses
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Responses translations (JA)...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found");
    }

    const translations = [
      { key: "ui.forms.responses.select_form", value: "回答を表示するフォームを選択" },
      { key: "ui.forms.responses.no_responses", value: "フォーム回答はまだありません" },
      { key: "ui.forms.responses.no_responses_hint", value: "フォームが送信されると回答がここに表示されます" },
      { key: "ui.forms.responses.response_singular", value: "回答" },
      { key: "ui.forms.responses.response_plural", value: "回答" },
      { key: "ui.forms.responses.back_to_forms", value: "フォームに戻る" },
      { key: "ui.forms.responses.export_csv", value: "CSVエクスポート" },
      { key: "ui.forms.responses.export_csv_coming_soon", value: "CSVエクスポート機能は近日公開" },
      { key: "ui.forms.responses.search_placeholder", value: "回答を検索..." },
      { key: "ui.forms.responses.no_matches", value: "検索条件に一致する回答がありません" },
      { key: "ui.forms.responses.anonymous", value: "匿名" },
      { key: "ui.forms.responses.public", value: "公開" },
      { key: "ui.forms.responses.unknown_time", value: "不明な時刻" },
      { key: "ui.forms.responses.view", value: "表示" },
      { key: "ui.forms.responses.response_details", value: "回答詳細" },
      { key: "ui.forms.responses.submission_info", value: "送信情報" },
      { key: "ui.forms.responses.submitted", value: "送信済み" },
      { key: "ui.forms.responses.type", value: "タイプ" },
      { key: "ui.forms.responses.public_submission", value: "公開送信" },
      { key: "ui.forms.responses.authenticated", value: "認証済み" },
      { key: "ui.forms.responses.ip_address", value: "IPアドレス" },
      { key: "ui.forms.responses.form_data", value: "フォームデータ" },
      { key: "ui.forms.responses.close", value: "閉じる" },
    ];

    let created = 0;
    const existingKeys = new Set<string>(); // Not used, but required for function signature

    for (const t of translations) {
      const inserted = await insertTranslationIfNew(
        ctx.db,
        existingKeys,
        systemOrg._id,
        systemUser._id,
        t.key,
        t.value,
        "ja",
        "forms",
        "responses-tab"
      );
      if (inserted) created++;
    }

    console.log(`✅ JA translations seeded (${created} new, ${translations.length - created} existing)`);
    return { success: true, created, total: translations.length };
  },
});
