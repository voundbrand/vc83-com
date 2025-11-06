/**
 * PRODUCTS TRANSLATION SEED DATA - JAPANESE (ja)
 *
 * Japanese translations for Product UI text.
 * Run with: npx convex run translations/seedProductTranslations_ja:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const japaneseTranslations = [
  // PRODUCTS WINDOW - MAIN HEADER
  { key: "ui.products.header.title", value: "製品" },
  { key: "ui.products.header.description", value: "製品カタログを管理 - チケット、商品、デジタル製品" },
  { key: "ui.products.button.createProduct", value: "製品を作成" },
  { key: "ui.products.button.backToList", value: "リストに戻る" },
  { key: "ui.products.loading", value: "製品を読み込み中..." },
  { key: "ui.products.error.login", value: "製品にアクセスするにはログインしてください" },
  { key: "ui.products.error.noOrg", value: "組織が選択されていません" },
  { key: "ui.products.error.noOrgDescription", value: "製品を管理するには組織を選択してください" },

  // PRODUCTS LIST
  { key: "ui.products.list.empty", value: "製品がありません。「製品を作成」をクリックして開始してください。" },
  { key: "ui.products.list.filter.allTypes", value: "すべてのタイプ" },
  { key: "ui.products.list.filter.tickets", value: "チケット" },
  { key: "ui.products.list.filter.physical", value: "物理的" },
  { key: "ui.products.list.filter.digital", value: "デジタル" },
  { key: "ui.products.list.filter.allStatuses", value: "すべてのステータス" },
  { key: "ui.products.list.status.draft", value: "下書き" },
  { key: "ui.products.list.status.active", value: "アクティブ" },
  { key: "ui.products.list.status.soldOut", value: "完売" },
  { key: "ui.products.list.status.archived", value: "アーカイブ済み" },
  { key: "ui.products.list.label.price", value: "価格：" },
  { key: "ui.products.list.label.stock", value: "在庫：" },
  { key: "ui.products.list.label.sold", value: "販売済み：" },
  { key: "ui.products.list.button.edit", value: "編集" },
  { key: "ui.products.list.button.delete", value: "削除" },
  { key: "ui.products.list.button.publish", value: "公開" },

  // PRODUCT FORM
  { key: "ui.products.form.title.create", value: "新しい製品を作成" },
  { key: "ui.products.form.title.edit", value: "製品を編集" },
  { key: "ui.products.form.basicInfo", value: "基本情報" },
  { key: "ui.products.form.name.label", value: "製品名" },
  { key: "ui.products.form.name.placeholder", value: "例：VIPチケット、Tシャツ、デジタルコース" },
  { key: "ui.products.form.type.label", value: "製品タイプ" },
  { key: "ui.products.form.type.ticket", value: "チケット（イベント入場）" },
  { key: "ui.products.form.type.physical", value: "物理的（商品、グッズ）" },
  { key: "ui.products.form.type.digital", value: "デジタル（ダウンロード、ライセンス）" },
  { key: "ui.products.form.description.label", value: "説明" },
  { key: "ui.products.form.description.placeholder", value: "製品を説明..." },

  // PRICING
  { key: "ui.products.form.pricing", value: "価格と在庫" },
  { key: "ui.products.form.price.label", value: "価格" },
  { key: "ui.products.form.price.placeholder", value: "0.00" },
  { key: "ui.products.form.currency.label", value: "通貨" },
  { key: "ui.products.form.taxRate.label", value: "税率（％）" },
  { key: "ui.products.form.taxRate.placeholder", value: "0" },
  { key: "ui.products.form.inventory.label", value: "利用可能な在庫" },
  { key: "ui.products.form.inventory.placeholder", value: "0" },
  { key: "ui.products.form.inventory.unlimited", value: "無制限の在庫" },

  // TICKET SPECIFIC
  { key: "ui.products.form.ticketSettings", value: "チケット設定" },
  { key: "ui.products.form.ticket.eventId.label", value: "イベント" },
  { key: "ui.products.form.ticket.eventId.placeholder", value: "イベントを選択（任意）" },
  { key: "ui.products.form.ticket.validFrom.label", value: "有効期間開始" },
  { key: "ui.products.form.ticket.validUntil.label", value: "有効期間終了" },
  { key: "ui.products.form.ticket.seatInfo.label", value: "座席情報" },
  { key: "ui.products.form.ticket.seatInfo.placeholder", value: "例：セクションA、5列、12番" },

  // DIGITAL SPECIFIC
  { key: "ui.products.form.digitalSettings", value: "デジタル製品設定" },
  { key: "ui.products.form.digital.downloadUrl.label", value: "ダウンロードURL" },
  { key: "ui.products.form.digital.downloadUrl.placeholder", value: "https://..." },
  { key: "ui.products.form.digital.fileSize.label", value: "ファイルサイズ（MB）" },
  { key: "ui.products.form.digital.fileSize.placeholder", value: "0" },
  { key: "ui.products.form.digital.licenseKey.label", value: "ライセンスキー（任意）" },
  { key: "ui.products.form.digital.licenseKey.placeholder", value: "XXXX-XXXX-XXXX-XXXX" },

  // ADD-ONS
  { key: "ui.products.form.addons", value: "アドオン" },
  { key: "ui.products.form.addons.description", value: "購入時に顧客が追加できる追加製品を作成します。" },
  { key: "ui.products.form.addons.button.manage", value: "アドオンを管理" },
  { key: "ui.products.form.addons.count", value: "アドオン" },

  // STATUS & PUBLISHING
  { key: "ui.products.form.status", value: "ステータスと公開" },
  { key: "ui.products.form.status.label", value: "製品ステータス" },
  { key: "ui.products.form.status.description", value: "製品の表示を制御" },
  { key: "ui.products.form.featured.label", value: "注目の製品" },
  { key: "ui.products.form.featured.description", value: "この製品を注目セクションに表示" },

  // INVOICING
  { key: "ui.products.form.invoicing", value: "請求書設定" },
  { key: "ui.products.form.invoicing.description", value: "この製品がStripe請求書にどのように表示されるかを設定" },
  { key: "ui.products.form.invoicing.button.configure", value: "請求書を設定" },

  // ACTIONS
  { key: "ui.products.button.save", value: "保存" },
  { key: "ui.products.button.cancel", value: "キャンセル" },
  { key: "ui.products.button.update", value: "更新" },
  { key: "ui.products.button.create", value: "作成" },
  { key: "ui.products.saving", value: "保存中..." },
  { key: "ui.products.required", value: "*" },

  // CHECKOUT
  { key: "ui.products.checkout.title", value: "カート" },
  { key: "ui.products.checkout.empty", value: "カートは空です" },
  { key: "ui.products.checkout.item", value: "商品" },
  { key: "ui.products.checkout.quantity", value: "数量" },
  { key: "ui.products.checkout.price", value: "価格" },
  { key: "ui.products.checkout.subtotal", value: "小計" },
  { key: "ui.products.checkout.tax", value: "税" },
  { key: "ui.products.checkout.tax.included", value: "含む" },
  { key: "ui.products.checkout.tax.added", value: "追加" },
  { key: "ui.products.checkout.total", value: "合計" },
  { key: "ui.products.checkout.button.proceed", value: "チェックアウトへ進む" },
  { key: "ui.products.checkout.footer.secure", value: "Stripeによる安全な決済" },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Japanese (ja) Product translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found.");
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of japaneseTranslations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        "ja", // Japanese locale
        "products"
      );
      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(
      `✅ Japanese product translations seeded: ${insertedCount} inserted, ${updatedCount} updated`
    );

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: japaneseTranslations.length,
      locale: "ja",
    };
  },
});
