/**
 * I18N Helper for AI Assistant
 *
 * Provides translation utilities for AI-generated messages
 */

export type SupportedLanguage = "en" | "de" | "pl" | "es" | "fr" | "ja";

/**
 * Get feature request notification message in the user's language
 */
export function getFeatureRequestMessage(toolName: string, language: SupportedLanguage = "en"): string {
  const messages: Record<SupportedLanguage, string> = {
    en: `💡 Great idea! We've noticed you're trying to use "${toolName}" and we're actively working on adding this feature to our platform. We'll notify you when it's ready! In the meantime, let me show you how to do this manually.`,
    de: `💡 Tolle Idee! Wir haben bemerkt, dass Sie versuchen, "${toolName}" zu verwenden, und arbeiten aktiv daran, diese Funktion zu unserer Plattform hinzuzufügen. Wir werden Sie benachrichtigen, wenn sie fertig ist! In der Zwischenzeit zeige ich Ihnen, wie Sie dies manuell tun können.`,
    pl: `💡 Świetny pomysł! Zauważyliśmy, że próbujesz użyć "${toolName}" i aktywnie pracujemy nad dodaniem tej funkcji do naszej platformy. Powiadomimy Cię, gdy będzie gotowa! W międzyczasie pokażę Ci, jak zrobić to ręcznie.`,
    es: `💡 ¡Gran idea! Hemos notado que estás intentando usar "${toolName}" y estamos trabajando activamente para agregar esta función a nuestra plataforma. ¡Te notificaremos cuando esté lista! Mientras tanto, déjame mostrarte cómo hacer esto manualmente.`,
    fr: `💡 Excellente idée ! Nous avons remarqué que vous essayez d'utiliser "${toolName}" et nous travaillons activement à l'ajout de cette fonctionnalité à notre plateforme. Nous vous préviendrons quand elle sera prête ! En attendant, laissez-moi vous montrer comment faire cela manuellement.`,
    ja: `💡 素晴らしいアイデアです！"${toolName}"を使用しようとしていることに気付きました。現在、この機能をプラットフォームに追加するために積極的に取り組んでいます。準備ができたらお知らせします！それまでの間、手動で行う方法をご紹介します。`,
  };

  return messages[language] || messages.en;
}

/**
 * Detect user's preferred language from organization settings
 * Falls back to English if not detected
 */
export function detectUserLanguage(organizationSettings?: any): SupportedLanguage {
  const lang = organizationSettings?.defaultLanguage || "en";
  const supportedLanguages: SupportedLanguage[] = ["en", "de", "pl", "es", "fr", "ja"];

  if (supportedLanguages.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }

  return "en"; // Default to English
}
