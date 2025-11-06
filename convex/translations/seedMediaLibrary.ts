/**
 * SEED MEDIA LIBRARY WINDOW TRANSLATIONS
 *
 * Seeds translations for the Media Library app
 * Run: npx convex run translations/seedMediaLibrary:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Media Library translations...");

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

    const translations = [
      // === TAB LABELS ===
      {
        key: "ui.media_library.tab.library",
        values: {
          en: "Library",
          de: "Bibliothek",
          pl: "Biblioteka",
          es: "Biblioteca",
          fr: "Bibliothèque",
          ja: "ライブラリ",
        },
      },
      {
        key: "ui.media_library.tab.upload",
        values: {
          en: "Upload",
          de: "Hochladen",
          pl: "Przesyłanie",
          es: "Subir",
          fr: "Télécharger",
          ja: "アップロード",
        },
      },
      {
        key: "ui.media_library.tab.settings",
        values: {
          en: "Settings",
          de: "Einstellungen",
          pl: "Ustawienia",
          es: "Configuración",
          fr: "Paramètres",
          ja: "設定",
        },
      },

      // === LIBRARY TAB ===
      {
        key: "ui.media_library.library.loading",
        values: {
          en: "Loading media...",
          de: "Medien werden geladen...",
          pl: "Ładowanie multimediów...",
          es: "Cargando medios...",
          fr: "Chargement des médias...",
          ja: "メディアを読み込んでいます...",
        },
      },
      {
        key: "ui.media_library.library.empty_title",
        values: {
          en: "No media files yet",
          de: "Noch keine Mediendateien",
          pl: "Brak plików multimedialnych",
          es: "No hay archivos de medios",
          fr: "Aucun fichier média",
          ja: "メディアファイルがありません",
        },
      },
      {
        key: "ui.media_library.library.empty_description",
        values: {
          en: "Upload your first image to get started",
          de: "Laden Sie Ihr erstes Bild hoch, um zu beginnen",
          pl: "Prześlij swój pierwszy obraz, aby rozpocząć",
          es: "Sube tu primera imagen para comenzar",
          fr: "Téléchargez votre première image pour commencer",
          ja: "最初の画像をアップロードして開始",
        },
      },
      {
        key: "ui.media_library.library.delete_confirm",
        values: {
          en: "Are you sure you want to delete this media file?",
          de: "Möchten Sie diese Mediendatei wirklich löschen?",
          pl: "Czy na pewno chcesz usunąć ten plik multimedialny?",
          es: "¿Estás seguro de que deseas eliminar este archivo multimedia?",
          fr: "Êtes-vous sûr de vouloir supprimer ce fichier multimédia ?",
          ja: "このメディアファイルを削除してもよろしいですか？",
        },
      },

      // === UPLOAD TAB ===
      {
        key: "ui.media_library.upload.drop_title",
        values: {
          en: "Drop your image here",
          de: "Bild hier ablegen",
          pl: "Upuść obraz tutaj",
          es: "Suelta tu imagen aquí",
          fr: "Déposez votre image ici",
          ja: "ここに画像をドロップ",
        },
      },
      {
        key: "ui.media_library.upload.drop_subtitle",
        values: {
          en: "or click to browse your files",
          de: "oder klicken Sie, um Ihre Dateien zu durchsuchen",
          pl: "lub kliknij, aby przeglądać pliki",
          es: "o haz clic para explorar tus archivos",
          fr: "ou cliquez pour parcourir vos fichiers",
          ja: "またはクリックしてファイルを参照",
        },
      },
      {
        key: "ui.media_library.upload.choose_file",
        values: {
          en: "Choose File",
          de: "Datei auswählen",
          pl: "Wybierz plik",
          es: "Elegir archivo",
          fr: "Choisir un fichier",
          ja: "ファイルを選択",
        },
      },
      {
        key: "ui.media_library.upload.max_file_size",
        values: {
          en: "Maximum file size varies by plan",
          de: "Die maximale Dateigröße variiert je nach Plan",
          pl: "Maksymalny rozmiar pliku zależy od planu",
          es: "El tamaño máximo del archivo varía según el plan",
          fr: "La taille maximale du fichier varie selon le forfait",
          ja: "最大ファイルサイズはプランによって異なります",
        },
      },
      {
        key: "ui.media_library.upload.uploading",
        values: {
          en: "Uploading...",
          de: "Wird hochgeladen...",
          pl: "Przesyłanie...",
          es: "Subiendo...",
          fr: "Téléchargement...",
          ja: "アップロード中...",
        },
      },

      // === SETTINGS TAB ===
      {
        key: "ui.media_library.settings.loading",
        values: {
          en: "Loading...",
          de: "Lädt...",
          pl: "Ładowanie...",
          es: "Cargando...",
          fr: "Chargement...",
          ja: "読み込み中...",
        },
      },
      {
        key: "ui.media_library.settings.storage_usage",
        values: {
          en: "Storage Usage",
          de: "Speichernutzung",
          pl: "Wykorzystanie pamięci",
          es: "Uso de almacenamiento",
          fr: "Utilisation du stockage",
          ja: "ストレージ使用量",
        },
      },
      {
        key: "ui.media_library.settings.used",
        values: {
          en: "used",
          de: "verwendet",
          pl: "używane",
          es: "usado",
          fr: "utilisé",
          ja: "使用済み",
        },
      },
      {
        key: "ui.media_library.settings.total",
        values: {
          en: "total",
          de: "gesamt",
          pl: "łącznie",
          es: "total",
          fr: "total",
          ja: "合計",
        },
      },
      {
        key: "ui.media_library.settings.files",
        values: {
          en: "Files",
          de: "Dateien",
          pl: "Pliki",
          es: "Archivos",
          fr: "Fichiers",
          ja: "ファイル",
        },
      },
      {
        key: "ui.media_library.settings.used_percentage",
        values: {
          en: "Used",
          de: "Verwendet",
          pl: "Używane",
          es: "Usado",
          fr: "Utilisé",
          ja: "使用済み",
        },
      },
      {
        key: "ui.media_library.settings.your_plan",
        values: {
          en: "Your Plan",
          de: "Ihr Plan",
          pl: "Twój plan",
          es: "Tu plan",
          fr: "Votre forfait",
          ja: "あなたのプラン",
        },
      },
      {
        key: "ui.media_library.settings.storage_quota",
        values: {
          en: "Storage Quota",
          de: "Speicherkontingent",
          pl: "Przydział pamięci",
          es: "Cuota de almacenamiento",
          fr: "Quota de stockage",
          ja: "ストレージ割り当て",
        },
      },

      // === ERROR MESSAGES ===
      {
        key: "ui.media_library.error.not_authenticated",
        values: {
          en: "Not authenticated",
          de: "Nicht authentifiziert",
          pl: "Nie uwierzytelniony",
          es: "No autenticado",
          fr: "Non authentifié",
          ja: "認証されていません",
        },
      },
      {
        key: "ui.media_library.error.no_organization",
        values: {
          en: "No organization selected",
          de: "Keine Organisation ausgewählt",
          pl: "Nie wybrano organizacji",
          es: "No se seleccionó ninguna organización",
          fr: "Aucune organisation sélectionnée",
          ja: "組織が選択されていません",
        },
      },
      {
        key: "ui.media_library.error.delete_failed",
        values: {
          en: "Failed to delete media",
          de: "Medien konnten nicht gelöscht werden",
          pl: "Nie udało się usunąć multimediów",
          es: "Error al eliminar los medios",
          fr: "Échec de la suppression du média",
          ja: "メディアの削除に失敗しました",
        },
      },
      {
        key: "ui.media_library.error.upload_failed",
        values: {
          en: "Upload failed. Please try again.",
          de: "Upload fehlgeschlagen. Bitte versuchen Sie es erneut.",
          pl: "Przesyłanie nie powiodło się. Spróbuj ponownie.",
          es: "Error en la carga. Inténtalo de nuevo.",
          fr: "Échec du téléchargement. Veuillez réessayer.",
          ja: "アップロードに失敗しました。もう一度お試しください。",
        },
      },
      {
        key: "ui.media_library.error.image_only",
        values: {
          en: "Please upload an image file",
          de: "Bitte laden Sie eine Bilddatei hoch",
          pl: "Prześlij plik obrazu",
          es: "Por favor, sube un archivo de imagen",
          fr: "Veuillez télécharger un fichier image",
          ja: "画像ファイルをアップロードしてください",
        },
      },

      // === SUCCESS MESSAGES ===
      {
        key: "ui.media_library.success.upload",
        values: {
          en: "Upload successful!",
          de: "Upload erfolgreich!",
          pl: "Przesyłanie powiodło się!",
          es: "¡Carga exitosa!",
          fr: "Téléchargement réussi !",
          ja: "アップロードに成功しました！",
        },
      },
    ];

    console.log(`📝 Upserting ${translations.length} translation keys...`);

    // Upsert translations (insert new, update existing)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const trans of translations) {
      for (const [locale, value] of Object.entries(trans.values)) {
        if (typeof value === "string") {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale,
            "media_library",
            "media-library-window"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Media Library translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
