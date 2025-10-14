/**
 * SEED NOTIFICATIONS TRANSLATIONS
 *
 * Seeds translations for:
 * - Notification system
 * - Notification types (success, error, warning, info)
 * - Action buttons
 *
 * Run: npx convex run translations/seedNotifications:seed
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Notifications translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // === BUTTONS ===
      {
        key: "ui.notification.button.dismiss",
        values: {
          en: "Dismiss",
          de: "Schließen",
          pl: "Zamknij",
          es: "Descartar",
          fr: "Fermer",
          ja: "閉じる",
        }
      },
      {
        key: "ui.notification.button.undo",
        values: {
          en: "Undo",
          de: "Rückgängig",
          pl: "Cofnij",
          es: "Deshacer",
          fr: "Annuler",
          ja: "元に戻す",
        }
      },
      {
        key: "ui.notification.button.view",
        values: {
          en: "View",
          de: "Ansehen",
          pl: "Zobacz",
          es: "Ver",
          fr: "Voir",
          ja: "表示",
        }
      },
      {
        key: "ui.notification.button.retry",
        values: {
          en: "Retry",
          de: "Erneut versuchen",
          pl: "Ponów",
          es: "Reintentar",
          fr: "Réessayer",
          ja: "再試行",
        }
      },

      // === STATUS TYPES ===
      {
        key: "ui.notification.type.success",
        values: {
          en: "Success",
          de: "Erfolg",
          pl: "Sukces",
          es: "Éxito",
          fr: "Succès",
          ja: "成功",
        }
      },
      {
        key: "ui.notification.type.error",
        values: {
          en: "Error",
          de: "Fehler",
          pl: "Błąd",
          es: "Error",
          fr: "Erreur",
          ja: "エラー",
        }
      },
      {
        key: "ui.notification.type.warning",
        values: {
          en: "Warning",
          de: "Warnung",
          pl: "Ostrzeżenie",
          es: "Advertencia",
          fr: "Avertissement",
          ja: "警告",
        }
      },
      {
        key: "ui.notification.type.info",
        values: {
          en: "Info",
          de: "Info",
          pl: "Informacja",
          es: "Información",
          fr: "Info",
          ja: "情報",
        }
      },

      // === COMMON MESSAGES ===
      {
        key: "ui.notification.saved",
        values: {
          en: "Saved successfully",
          de: "Erfolgreich gespeichert",
          pl: "Zapisano pomyślnie",
          es: "Guardado exitosamente",
          fr: "Enregistré avec succès",
          ja: "正常に保存されました",
        }
      },
      {
        key: "ui.notification.deleted",
        values: {
          en: "Deleted successfully",
          de: "Erfolgreich gelöscht",
          pl: "Usunięto pomyślnie",
          es: "Eliminado exitosamente",
          fr: "Supprimé avec succès",
          ja: "正常に削除されました",
        }
      },
      {
        key: "ui.notification.updated",
        values: {
          en: "Updated successfully",
          de: "Erfolgreich aktualisiert",
          pl: "Zaktualizowano pomyślnie",
          es: "Actualizado exitosamente",
          fr: "Mis à jour avec succès",
          ja: "正常に更新されました",
        }
      },
      {
        key: "ui.notification.created",
        values: {
          en: "Created successfully",
          de: "Erfolgreich erstellt",
          pl: "Utworzono pomyślnie",
          es: "Creado exitosamente",
          fr: "Créé avec succès",
          ja: "正常に作成されました",
        }
      },
      {
        key: "ui.notification.error_generic",
        values: {
          en: "Something went wrong. Please try again.",
          de: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
          pl: "Coś poszło nie tak. Spróbuj ponownie.",
          es: "Algo salió mal. Por favor, inténtalo de nuevo.",
          fr: "Une erreur s'est produite. Veuillez réessayer.",
          ja: "問題が発生しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.notification.copied",
        values: {
          en: "Copied to clipboard",
          de: "In Zwischenablage kopiert",
          pl: "Skopiowano do schowka",
          es: "Copiado al portapapeles",
          fr: "Copié dans le presse-papiers",
          ja: "クリップボードにコピーしました",
        }
      },
    ];

    // Collect all translation keys we want to insert
    const keysToCheck = new Set<string>();
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        keysToCheck.add(`${trans.key}:${locale.code}`);
      }
    }

    // Load ONLY translations that match our keys (much more efficient!)
    const existingKeys = new Set<string>();
    for (const trans of translations) {
      // Check each unique key
      const results = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", systemOrg._id)
           .eq("type", "translation")
        )
        .filter(q => q.eq(q.field("name"), trans.key))
        .collect();

      for (const result of results) {
        existingKeys.add(`${result.name}:${result.locale}`);
      }
    }

    // Seed translations
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const lookupKey = `${trans.key}:${locale.code}`;

          // Check if translation already exists using our Set
          if (!existingKeys.has(lookupKey)) {
            await ctx.db.insert("objects", {
              organizationId: systemOrg._id,
              type: "translation",
              subtype: "ui",
              name: trans.key,
              value: value,
              locale: locale.code,
              status: "approved",
              customProperties: {
                category: "notifications",
                component: "retro-notification",
              },
              createdBy: systemUser._id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Notifications translations`);
    return { success: true, count };
  }
});
