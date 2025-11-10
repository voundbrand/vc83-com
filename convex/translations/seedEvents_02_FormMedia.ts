/**
 * EVENTS TRANSLATIONS - FORM MEDIA
 *
 * Media & Gallery section translations:
 * - Videos
 * - Images
 * - Media library integration
 *
 * Namespace: ui.events.form
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

interface Translation {
  locale: string;
  key: string;
  value: string;
}

const translations: Translation[] = [
  // ===== ENGLISH =====
  // Event Form - Media Section
  { locale: "en", key: "ui.events.form.media", value: "Media & Gallery" },
  { locale: "en", key: "ui.events.form.images_video", value: "Images & Video" },
  { locale: "en", key: "ui.events.form.media_items_selected", value: "{count} media item{plural} selected ({images} {imagePlural}, {videos} {videoPlural})" },
  { locale: "en", key: "ui.events.form.no_media_selected", value: "No media selected" },
  { locale: "en", key: "ui.events.form.select_media_library", value: "Select from your Media Library or upload new files" },
  { locale: "en", key: "ui.events.form.primary", value: "Primary" },
  { locale: "en", key: "ui.events.form.video_url", value: "Video URL" },
  { locale: "en", key: "ui.events.form.video_url_placeholder", value: "Paste YouTube or Vimeo URL" },
  { locale: "en", key: "ui.events.form.video_provider", value: "Provider" },
  { locale: "en", key: "ui.events.form.video_loop", value: "Loop video" },
  { locale: "en", key: "ui.events.form.video_autostart", value: "Autostart video" },
  { locale: "en", key: "ui.events.form.add_video", value: "Add Video" },
  { locale: "en", key: "ui.events.form.remove_video", value: "Remove" },
  { locale: "en", key: "ui.events.form.show_video_first", value: "Show video first" },
  { locale: "en", key: "ui.events.form.save_media", value: "Save Media" },
  { locale: "en", key: "ui.events.form.browse_library", value: "📁 Select from Media Library" },
  { locale: "en", key: "ui.events.form.browse_library_help", value: "Opens Media Library window to browse and upload images" },
  { locale: "en", key: "ui.events.form.add_video_section", value: "📹 Add Video" },
  { locale: "en", key: "ui.events.form.video_supported", value: "Supported: YouTube (youtube.com, youtu.be) and Vimeo (vimeo.com)" },
  { locale: "en", key: "ui.events.form.video_error_required", value: "Please enter a video URL" },
  { locale: "en", key: "ui.events.form.video_error_invalid", value: "Invalid video URL. Please use a YouTube or Vimeo URL." },
  { locale: "en", key: "ui.events.form.loop_on", value: "🔁 Loop: ON" },
  { locale: "en", key: "ui.events.form.loop_off", value: "🔁 Loop: OFF" },
  { locale: "en", key: "ui.events.form.auto_on", value: "▶️ Auto: ON" },
  { locale: "en", key: "ui.events.form.auto_off", value: "▶️ Auto: OFF" },
  { locale: "en", key: "ui.events.form.image", value: "image" },
  { locale: "en", key: "ui.events.form.images", value: "images" },
  { locale: "en", key: "ui.events.form.video", value: "video" },
  { locale: "en", key: "ui.events.form.videos", value: "videos" },

  // ===== GERMAN =====
  // Event Form - Media Section
  { locale: "de", key: "ui.events.form.media", value: "Medien & Galerie" },
  { locale: "de", key: "ui.events.form.images_video", value: "Bilder & Video" },
  { locale: "de", key: "ui.events.form.media_items_selected", value: "{count} Medienelement{plural} ausgewählt ({images} {imagePlural}, {videos} {videoPlural})" },
  { locale: "de", key: "ui.events.form.no_media_selected", value: "Keine Medien ausgewählt" },
  { locale: "de", key: "ui.events.form.select_media_library", value: "Wählen Sie aus Ihrer Medienbibliothek aus oder laden Sie neue Dateien hoch" },
  { locale: "de", key: "ui.events.form.primary", value: "Primär" },
  { locale: "de", key: "ui.events.form.video_url", value: "Video-URL" },
  { locale: "de", key: "ui.events.form.video_url_placeholder", value: "YouTube- oder Vimeo-URL einfügen" },
  { locale: "de", key: "ui.events.form.video_provider", value: "Anbieter" },
  { locale: "de", key: "ui.events.form.video_loop", value: "Video wiederholen" },
  { locale: "de", key: "ui.events.form.video_autostart", value: "Video automatisch starten" },
  { locale: "de", key: "ui.events.form.add_video", value: "Video hinzufügen" },
  { locale: "de", key: "ui.events.form.remove_video", value: "Entfernen" },
  { locale: "de", key: "ui.events.form.show_video_first", value: "Video zuerst anzeigen" },
  { locale: "de", key: "ui.events.form.save_media", value: "Medien speichern" },
  { locale: "de", key: "ui.events.form.browse_library", value: "📁 Aus Medienbibliothek auswählen" },
  { locale: "de", key: "ui.events.form.browse_library_help", value: "Öffnet das Medienbibliothek-Fenster zum Durchsuchen und Hochladen von Bildern" },
  { locale: "de", key: "ui.events.form.add_video_section", value: "📹 Video hinzufügen" },
  { locale: "de", key: "ui.events.form.video_supported", value: "Unterstützt: YouTube (youtube.com, youtu.be) und Vimeo (vimeo.com)" },
  { locale: "de", key: "ui.events.form.video_error_required", value: "Bitte geben Sie eine Video-URL ein" },
  { locale: "de", key: "ui.events.form.video_error_invalid", value: "Ungültige Video-URL. Bitte verwenden Sie eine YouTube- oder Vimeo-URL." },
  { locale: "de", key: "ui.events.form.loop_on", value: "🔁 Wiederholen: EIN" },
  { locale: "de", key: "ui.events.form.loop_off", value: "🔁 Wiederholen: AUS" },
  { locale: "de", key: "ui.events.form.auto_on", value: "▶️ Auto: EIN" },
  { locale: "de", key: "ui.events.form.auto_off", value: "▶️ Auto: AUS" },
  { locale: "de", key: "ui.events.form.image", value: "Bild" },
  { locale: "de", key: "ui.events.form.images", value: "Bilder" },
  { locale: "de", key: "ui.events.form.video", value: "Video" },
  { locale: "de", key: "ui.events.form.videos", value: "Videos" },

  // ===== SPANISH =====
  // Event Form - Media Section
  { locale: "es", key: "ui.events.form.media", value: "Medios y Galería" },
  { locale: "es", key: "ui.events.form.images_video", value: "Imágenes y Video" },
  { locale: "es", key: "ui.events.form.media_items_selected", value: "{count} elemento{plural} de medios seleccionado{plural} ({images} {imagePlural}, {videos} {videoPlural})" },
  { locale: "es", key: "ui.events.form.no_media_selected", value: "No hay medios seleccionados" },
  { locale: "es", key: "ui.events.form.select_media_library", value: "Selecciona de tu Biblioteca de Medios o sube nuevos archivos" },
  { locale: "es", key: "ui.events.form.primary", value: "Principal" },
  { locale: "es", key: "ui.events.form.video_url", value: "URL del video" },
  { locale: "es", key: "ui.events.form.video_url_placeholder", value: "Pega la URL de YouTube o Vimeo" },
  { locale: "es", key: "ui.events.form.video_provider", value: "Proveedor" },
  { locale: "es", key: "ui.events.form.video_loop", value: "Repetir video" },
  { locale: "es", key: "ui.events.form.video_autostart", value: "Iniciar video automáticamente" },
  { locale: "es", key: "ui.events.form.add_video", value: "Agregar video" },
  { locale: "es", key: "ui.events.form.remove_video", value: "Eliminar" },
  { locale: "es", key: "ui.events.form.show_video_first", value: "Mostrar video primero" },
  { locale: "es", key: "ui.events.form.save_media", value: "Guardar medios" },
  { locale: "es", key: "ui.events.form.browse_library", value: "📁 Seleccionar de la Biblioteca de Medios" },
  { locale: "es", key: "ui.events.form.browse_library_help", value: "Abre la ventana de Biblioteca de Medios para explorar y subir imágenes" },
  { locale: "es", key: "ui.events.form.add_video_section", value: "📹 Agregar video" },
  { locale: "es", key: "ui.events.form.video_supported", value: "Soportado: YouTube (youtube.com, youtu.be) y Vimeo (vimeo.com)" },
  { locale: "es", key: "ui.events.form.video_error_required", value: "Por favor ingresa una URL de video" },
  { locale: "es", key: "ui.events.form.video_error_invalid", value: "URL de video inválida. Por favor usa una URL de YouTube o Vimeo." },
  { locale: "es", key: "ui.events.form.loop_on", value: "🔁 Repetir: ACTIVO" },
  { locale: "es", key: "ui.events.form.loop_off", value: "🔁 Repetir: INACTIVO" },
  { locale: "es", key: "ui.events.form.auto_on", value: "▶️ Auto: ACTIVO" },
  { locale: "es", key: "ui.events.form.auto_off", value: "▶️ Auto: INACTIVO" },
  { locale: "es", key: "ui.events.form.image", value: "imagen" },
  { locale: "es", key: "ui.events.form.images", value: "imágenes" },
  { locale: "es", key: "ui.events.form.video", value: "video" },
  { locale: "es", key: "ui.events.form.videos", value: "videos" },

  // ===== FRENCH =====
  // Event Form - Media Section
  { locale: "fr", key: "ui.events.form.media", value: "Médias et Galerie" },
  { locale: "fr", key: "ui.events.form.images_video", value: "Images et Vidéo" },
  { locale: "fr", key: "ui.events.form.media_items_selected", value: "{count} élément{plural} média sélectionné{plural} ({images} {imagePlural}, {videos} {videoPlural})" },
  { locale: "fr", key: "ui.events.form.no_media_selected", value: "Aucun média sélectionné" },
  { locale: "fr", key: "ui.events.form.select_media_library", value: "Sélectionnez depuis votre Bibliothèque Média ou téléchargez de nouveaux fichiers" },
  { locale: "fr", key: "ui.events.form.primary", value: "Principal" },
  { locale: "fr", key: "ui.events.form.video_url", value: "URL de la vidéo" },
  { locale: "fr", key: "ui.events.form.video_url_placeholder", value: "Collez l'URL YouTube ou Vimeo" },
  { locale: "fr", key: "ui.events.form.video_provider", value: "Fournisseur" },
  { locale: "fr", key: "ui.events.form.video_loop", value: "Lire en boucle" },
  { locale: "fr", key: "ui.events.form.video_autostart", value: "Démarrage automatique" },
  { locale: "fr", key: "ui.events.form.add_video", value: "Ajouter une vidéo" },
  { locale: "fr", key: "ui.events.form.remove_video", value: "Supprimer" },
  { locale: "fr", key: "ui.events.form.show_video_first", value: "Afficher la vidéo en premier" },
  { locale: "fr", key: "ui.events.form.save_media", value: "Enregistrer les médias" },
  { locale: "fr", key: "ui.events.form.browse_library", value: "📁 Sélectionner depuis la Bibliothèque Média" },
  { locale: "fr", key: "ui.events.form.browse_library_help", value: "Ouvre la fenêtre Bibliothèque Média pour parcourir et télécharger des images" },
  { locale: "fr", key: "ui.events.form.add_video_section", value: "📹 Ajouter une vidéo" },
  { locale: "fr", key: "ui.events.form.video_supported", value: "Supporté : YouTube (youtube.com, youtu.be) et Vimeo (vimeo.com)" },
  { locale: "fr", key: "ui.events.form.video_error_required", value: "Veuillez saisir une URL de vidéo" },
  { locale: "fr", key: "ui.events.form.video_error_invalid", value: "URL de vidéo invalide. Veuillez utiliser une URL YouTube ou Vimeo." },
  { locale: "fr", key: "ui.events.form.loop_on", value: "🔁 Boucle : ACTIVÉE" },
  { locale: "fr", key: "ui.events.form.loop_off", value: "🔁 Boucle : DÉSACTIVÉE" },
  { locale: "fr", key: "ui.events.form.auto_on", value: "▶️ Auto : ACTIVÉ" },
  { locale: "fr", key: "ui.events.form.auto_off", value: "▶️ Auto : DÉSACTIVÉ" },
  { locale: "fr", key: "ui.events.form.image", value: "image" },
  { locale: "fr", key: "ui.events.form.images", value: "images" },
  { locale: "fr", key: "ui.events.form.video", value: "vidéo" },
  { locale: "fr", key: "ui.events.form.videos", value: "vidéos" },

  // ===== JAPANESE =====
  // Event Form - Media Section
  { locale: "ja", key: "ui.events.form.media", value: "メディアとギャラリー" },
  { locale: "ja", key: "ui.events.form.images_video", value: "画像と動画" },
  { locale: "ja", key: "ui.events.form.media_items_selected", value: "{count}個のメディアアイテムを選択中（画像{images}個、動画{videos}個）" },
  { locale: "ja", key: "ui.events.form.no_media_selected", value: "メディアが選択されていません" },
  { locale: "ja", key: "ui.events.form.select_media_library", value: "メディアライブラリから選択するか、新しいファイルをアップロード" },
  { locale: "ja", key: "ui.events.form.primary", value: "メイン" },
  { locale: "ja", key: "ui.events.form.video_url", value: "動画URL" },
  { locale: "ja", key: "ui.events.form.video_url_placeholder", value: "YouTubeまたはVimeoのURLを貼り付け" },
  { locale: "ja", key: "ui.events.form.video_provider", value: "プロバイダー" },
  { locale: "ja", key: "ui.events.form.video_loop", value: "動画をループ再生" },
  { locale: "ja", key: "ui.events.form.video_autostart", value: "動画を自動再生" },
  { locale: "ja", key: "ui.events.form.add_video", value: "動画を追加" },
  { locale: "ja", key: "ui.events.form.remove_video", value: "削除" },
  { locale: "ja", key: "ui.events.form.show_video_first", value: "動画を最初に表示" },
  { locale: "ja", key: "ui.events.form.save_media", value: "メディアを保存" },
  { locale: "ja", key: "ui.events.form.browse_library", value: "📁 メディアライブラリから選択" },
  { locale: "ja", key: "ui.events.form.browse_library_help", value: "メディアライブラリウィンドウを開いて画像を閲覧・アップロード" },
  { locale: "ja", key: "ui.events.form.add_video_section", value: "📹 動画を追加" },
  { locale: "ja", key: "ui.events.form.video_supported", value: "対応：YouTube（youtube.com、youtu.be）とVimeo（vimeo.com）" },
  { locale: "ja", key: "ui.events.form.video_error_required", value: "動画のURLを入力してください" },
  { locale: "ja", key: "ui.events.form.video_error_invalid", value: "無効な動画URLです。YouTubeまたはVimeoのURLを使用してください。" },
  { locale: "ja", key: "ui.events.form.loop_on", value: "🔁 ループ：オン" },
  { locale: "ja", key: "ui.events.form.loop_off", value: "🔁 ループ：オフ" },
  { locale: "ja", key: "ui.events.form.auto_on", value: "▶️ 自動再生：オン" },
  { locale: "ja", key: "ui.events.form.auto_off", value: "▶️ 自動再生：オフ" },
  { locale: "ja", key: "ui.events.form.image", value: "画像" },
  { locale: "ja", key: "ui.events.form.images", value: "画像" },
  { locale: "ja", key: "ui.events.form.video", value: "動画" },
  { locale: "ja", key: "ui.events.form.videos", value: "動画" },

  // ===== POLISH =====
  // Event Form - Media Section
  { locale: "pl", key: "ui.events.form.media", value: "Media i Galeria" },
  { locale: "pl", key: "ui.events.form.images_video", value: "Obrazy i Wideo" },
  { locale: "pl", key: "ui.events.form.media_items_selected", value: "{count} element{plural} mediów wybran{plural} ({images} {imagePlural}, {videos} {videoPlural})" },
  { locale: "pl", key: "ui.events.form.no_media_selected", value: "Nie wybrano mediów" },
  { locale: "pl", key: "ui.events.form.select_media_library", value: "Wybierz z Biblioteki Mediów lub prześlij nowe pliki" },
  { locale: "pl", key: "ui.events.form.primary", value: "Główny" },
  { locale: "pl", key: "ui.events.form.video_url", value: "URL wideo" },
  { locale: "pl", key: "ui.events.form.video_url_placeholder", value: "Wklej URL z YouTube lub Vimeo" },
  { locale: "pl", key: "ui.events.form.video_provider", value: "Dostawca" },
  { locale: "pl", key: "ui.events.form.video_loop", value: "Zapętl wideo" },
  { locale: "pl", key: "ui.events.form.video_autostart", value: "Automatyczne uruchomienie" },
  { locale: "pl", key: "ui.events.form.add_video", value: "Dodaj wideo" },
  { locale: "pl", key: "ui.events.form.remove_video", value: "Usuń" },
  { locale: "pl", key: "ui.events.form.show_video_first", value: "Pokaż wideo jako pierwsze" },
  { locale: "pl", key: "ui.events.form.save_media", value: "Zapisz media" },
  { locale: "pl", key: "ui.events.form.browse_library", value: "📁 Wybierz z Biblioteki Mediów" },
  { locale: "pl", key: "ui.events.form.browse_library_help", value: "Otwiera okno Biblioteki Mediów do przeglądania i przesyłania obrazów" },
  { locale: "pl", key: "ui.events.form.add_video_section", value: "📹 Dodaj wideo" },
  { locale: "pl", key: "ui.events.form.video_supported", value: "Obsługiwane: YouTube (youtube.com, youtu.be) i Vimeo (vimeo.com)" },
  { locale: "pl", key: "ui.events.form.video_error_required", value: "Proszę wprowadzić URL wideo" },
  { locale: "pl", key: "ui.events.form.video_error_invalid", value: "Nieprawidłowy URL wideo. Proszę użyć URL z YouTube lub Vimeo." },
  { locale: "pl", key: "ui.events.form.loop_on", value: "🔁 Pętla: WŁĄCZONA" },
  { locale: "pl", key: "ui.events.form.loop_off", value: "🔁 Pętla: WYŁĄCZONA" },
  { locale: "pl", key: "ui.events.form.auto_on", value: "▶️ Auto: WŁĄCZONE" },
  { locale: "pl", key: "ui.events.form.auto_off", value: "▶️ Auto: WYŁĄCZONE" },
  { locale: "pl", key: "ui.events.form.image", value: "obraz" },
  { locale: "pl", key: "ui.events.form.images", value: "obrazy" },
  { locale: "pl", key: "ui.events.form.video", value: "wideo" },
  { locale: "pl", key: "ui.events.form.videos", value: "wideo" },
];

/**
 * Seed events form media translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_02_FormMedia:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Form Media Translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of translations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        translation.locale,
        "events",
        "events-window"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded Events Form Media translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
