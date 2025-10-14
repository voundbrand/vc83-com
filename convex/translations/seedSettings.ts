/**
 * SEED SETTINGS WINDOW TRANSLATIONS
 *
 * Seeds translations for:
 * - Settings/Desktop Settings window
 * - Appearance tab (themes, window styles)
 * - Wallpaper tab
 * - Region tab (language, timezone, date/time format)
 * - Admin tab
 *
 * Run: npx convex run translations/seedSettings:seed
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Settings Window translations...");

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
      // === MAIN WINDOW ===
      {
        key: "ui.settings.title",
        values: {
          en: "Desktop Settings",
          de: "Desktop-Einstellungen",
          pl: "Ustawienia pulpitu",
          es: "Configuración de escritorio",
          fr: "Paramètres du bureau",
          ja: "デスクトップ設定",
        }
      },
      {
        key: "ui.settings.subtitle",
        values: {
          en: "Customize the look of your workspace",
          de: "Passe das Aussehen deines Arbeitsbereichs an",
          pl: "Dostosuj wygląd swojego obszaru roboczego",
          es: "Personaliza el aspecto de tu espacio de trabajo",
          fr: "Personnalisez l'apparence de votre espace de travail",
          ja: "ワークスペースの外観をカスタマイズ",
        }
      },

      // === TABS ===
      {
        key: "ui.settings.tab.appearance",
        values: {
          en: "Appearance",
          de: "Aussehen",
          pl: "Wygląd",
          es: "Apariencia",
          fr: "Apparence",
          ja: "外観",
        }
      },
      {
        key: "ui.settings.tab.wallpaper",
        values: {
          en: "Wallpaper",
          de: "Hintergrundbild",
          pl: "Tapeta",
          es: "Fondo de pantalla",
          fr: "Fond d'écran",
          ja: "壁紙",
        }
      },
      {
        key: "ui.settings.tab.region",
        values: {
          en: "Region",
          de: "Region",
          pl: "Region",
          es: "Región",
          fr: "Région",
          ja: "地域",
        }
      },
      {
        key: "ui.settings.tab.admin",
        values: {
          en: "Admin",
          de: "Admin",
          pl: "Administrator",
          es: "Administrador",
          fr: "Administrateur",
          ja: "管理者",
        }
      },

      // === APPEARANCE TAB ===
      {
        key: "ui.settings.appearance.window_style",
        values: {
          en: "Window Style",
          de: "Fensterstil",
          pl: "Styl okna",
          es: "Estilo de ventana",
          fr: "Style de fenêtre",
          ja: "ウィンドウスタイル",
        }
      },
      {
        key: "ui.settings.appearance.windows95_title",
        values: {
          en: "Classic Windows 95",
          de: "Klassisches Windows 95",
          pl: "Klasyczny Windows 95",
          es: "Windows 95 clásico",
          fr: "Windows 95 classique",
          ja: "クラシック Windows 95",
        }
      },
      {
        key: "ui.settings.appearance.windows95_description",
        values: {
          en: "Sharp edges and classic styling",
          de: "Scharfe Kanten und klassisches Styling",
          pl: "Ostre krawędzie i klasyczny styl",
          es: "Bordes nítidos y estilo clásico",
          fr: "Bords nets et style classique",
          ja: "シャープなエッジとクラシックなスタイリング",
        }
      },
      {
        key: "ui.settings.appearance.macos_title",
        values: {
          en: "Mac OS X Style",
          de: "Mac OS X-Stil",
          pl: "Styl Mac OS X",
          es: "Estilo Mac OS X",
          fr: "Style Mac OS X",
          ja: "Mac OS X スタイル",
        }
      },
      {
        key: "ui.settings.appearance.macos_description",
        values: {
          en: "Rounded edges and smooth design",
          de: "Abgerundete Kanten und glattes Design",
          pl: "Zaokrąglone krawędzie i gładki design",
          es: "Bordes redondeados y diseño suave",
          fr: "Bords arrondis et design lisse",
          ja: "丸いエッジと滑らかなデザイン",
        }
      },
      {
        key: "ui.settings.appearance.color_scheme",
        values: {
          en: "Color Scheme",
          de: "Farbschema",
          pl: "Schemat kolorów",
          es: "Esquema de color",
          fr: "Schéma de couleurs",
          ja: "カラースキーム",
        }
      },
      {
        key: "ui.settings.appearance.coming_soon",
        values: {
          en: "Coming Soon",
          de: "Demnächst",
          pl: "Wkrótce",
          es: "Próximamente",
          fr: "Bientôt disponible",
          ja: "近日公開",
        }
      },
      {
        key: "ui.settings.appearance.preview",
        values: {
          en: "Preview",
          de: "Vorschau",
          pl: "Podgląd",
          es: "Vista previa",
          fr: "Aperçu",
          ja: "プレビュー",
        }
      },
      {
        key: "ui.settings.appearance.preview_window",
        values: {
          en: "Example Window",
          de: "Beispielfenster",
          pl: "Przykładowe okno",
          es: "Ventana de ejemplo",
          fr: "Fenêtre d'exemple",
          ja: "サンプルウィンドウ",
        }
      },
      {
        key: "ui.settings.appearance.preview_text",
        values: {
          en: "This is how your desktop will look with the selected theme.",
          de: "So wird dein Desktop mit dem ausgewählten Design aussehen.",
          pl: "Tak będzie wyglądał twój pulpit z wybranym motywem.",
          es: "Así se verá tu escritorio con el tema seleccionado.",
          fr: "Voici à quoi ressemblera votre bureau avec le thème sélectionné.",
          ja: "選択したテーマでデスクトップはこのように表示されます。",
        }
      },

      // === WALLPAPER TAB ===
      {
        key: "ui.settings.wallpaper.desktop_background",
        values: {
          en: "Desktop Background",
          de: "Desktop-Hintergrund",
          pl: "Tło pulpitu",
          es: "Fondo de escritorio",
          fr: "Arrière-plan du bureau",
          ja: "デスクトップの背景",
        }
      },

      // === REGION TAB ===
      {
        key: "ui.settings.region.language",
        values: {
          en: "Language",
          de: "Sprache",
          pl: "Język",
          es: "Idioma",
          fr: "Langue",
          ja: "言語",
        }
      },
      {
        key: "ui.settings.region.timezone",
        values: {
          en: "Timezone",
          de: "Zeitzone",
          pl: "Strefa czasowa",
          es: "Zona horaria",
          fr: "Fuseau horaire",
          ja: "タイムゾーン",
        }
      },
      {
        key: "ui.settings.region.datetime_format",
        values: {
          en: "Date & Time Format",
          de: "Datums- und Zeitformat",
          pl: "Format daty i czasu",
          es: "Formato de fecha y hora",
          fr: "Format de date et heure",
          ja: "日付と時刻の形式",
        }
      },

      // === LANGUAGE NAMES (in current UI language) ===
      {
        key: "ui.settings.region.lang_english",
        values: {
          en: "English",
          de: "Englisch",
          pl: "Angielski",
          es: "Inglés",
          fr: "Anglais",
          ja: "英語",
        }
      },
      {
        key: "ui.settings.region.lang_german",
        values: {
          en: "German",
          de: "Deutsch",
          pl: "Niemiecki",
          es: "Alemán",
          fr: "Allemand",
          ja: "ドイツ語",
        }
      },
      {
        key: "ui.settings.region.lang_polish",
        values: {
          en: "Polish",
          de: "Polnisch",
          pl: "Polski",
          es: "Polaco",
          fr: "Polonais",
          ja: "ポーランド語",
        }
      },
      {
        key: "ui.settings.region.lang_spanish",
        values: {
          en: "Spanish",
          de: "Spanisch",
          pl: "Hiszpański",
          es: "Español",
          fr: "Espagnol",
          ja: "スペイン語",
        }
      },
      {
        key: "ui.settings.region.lang_french",
        values: {
          en: "French",
          de: "Französisch",
          pl: "Francuski",
          es: "Francés",
          fr: "Français",
          ja: "フランス語",
        }
      },
      {
        key: "ui.settings.region.lang_japanese",
        values: {
          en: "Japanese",
          de: "Japanisch",
          pl: "Japoński",
          es: "Japonés",
          fr: "Japonais",
          ja: "日本語",
        }
      },

      // === ADMIN TAB ===
      {
        key: "ui.settings.admin.title",
        values: {
          en: "Super Admin Tools",
          de: "Super Admin Tools",
          pl: "Narzędzia super administratora",
          es: "Herramientas de super administrador",
          fr: "Outils Super Administrateur",
          ja: "スーパー管理者ツール",
        }
      },
      {
        key: "ui.settings.admin.ontology_title",
        values: {
          en: "Ontology Management",
          de: "Ontologie-Verwaltung",
          pl: "Zarządzanie ontologią",
          es: "Gestión de ontología",
          fr: "Gestion de l'ontologie",
          ja: "オントロジー管理",
        }
      },
      {
        key: "ui.settings.admin.ontology_description",
        values: {
          en: "Manage objects, links, types and configurations",
          de: "Verwalte Objekte, Links, Typen und Konfigurationen",
          pl: "Zarządzaj obiektami, linkami, typami i konfiguracjami",
          es: "Gestionar objetos, enlaces, tipos y configuraciones",
          fr: "Gérer les objets, liens, types et configurations",
          ja: "オブジェクト、リンク、タイプ、設定を管理",
        }
      },
      {
        key: "ui.settings.admin.user_management_title",
        values: {
          en: "User Management",
          de: "Benutzerverwaltung",
          pl: "Zarządzanie użytkownikami",
          es: "Gestión de usuarios",
          fr: "Gestion des utilisateurs",
          ja: "ユーザー管理",
        }
      },
      {
        key: "ui.settings.admin.system_analytics_title",
        values: {
          en: "System Analytics",
          de: "Systemanalyse",
          pl: "Analityka systemu",
          es: "Análisis del sistema",
          fr: "Analyse du système",
          ja: "システム分析",
        }
      },

      // === BUTTONS ===
      {
        key: "ui.settings.button.reset",
        values: {
          en: "Reset",
          de: "Zurücksetzen",
          pl: "Resetuj",
          es: "Restablecer",
          fr: "Réinitialiser",
          ja: "リセット",
        }
      },
      {
        key: "ui.settings.button.apply",
        values: {
          en: "Apply",
          de: "Anwenden",
          pl: "Zastosuj",
          es: "Aplicar",
          fr: "Appliquer",
          ja: "適用",
        }
      },
    ];

    // Load ALL existing translations once (optimized!)
    const existingTranslations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    // Create lookup set for fast duplicate checking
    const existingKeys = new Set(
      existingTranslations.map(t => `${t.name}:${t.locale}`)
    );

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
                category: "settings",
                component: "settings-window",
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

    console.log(`✅ Seeded ${count} Settings Window translations`);
    return { success: true, count };
  }
});
