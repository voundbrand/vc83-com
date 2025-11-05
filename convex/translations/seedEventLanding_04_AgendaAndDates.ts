/**
 * SEED EVENT LANDING TRANSLATIONS - AGENDA & DATES
 *
 * Agenda section and date formatting translations
 *
 * Component: src/templates/web/event-landing/index.tsx
 * Namespace: ui.event_landing.agenda, ui.event_landing.date
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Event Landing - Agenda & Dates...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) throw new Error("System user not found");

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // Agenda section
      { key: "ui.event_landing.agenda.title", values: { en: "Event Schedule", de: "Veranstaltungsprogramm", pl: "Harmonogram wydarzenia", es: "Programa del evento", fr: "Programme de l'événement", ja: "イベントスケジュール" }},
      { key: "ui.event_landing.agenda.subtitle", values: { en: "Here's what to expect at the event", de: "Das erwartet dich bei der Veranstaltung", pl: "Oto czego możesz się spodziewać na wydarzeniu", es: "Esto es lo que puedes esperar del evento", fr: "Voici ce qui vous attend lors de l'événement", ja: "イベントで期待できること" }},
      
      // Month names (abbreviated)
      { key: "ui.event_landing.date.month.jan", values: { en: "Jan", de: "Jan", pl: "Sty", es: "Ene", fr: "Jan", ja: "1月" }},
      { key: "ui.event_landing.date.month.feb", values: { en: "Feb", de: "Feb", pl: "Lut", es: "Feb", fr: "Fév", ja: "2月" }},
      { key: "ui.event_landing.date.month.mar", values: { en: "Mar", de: "Mär", pl: "Mar", es: "Mar", fr: "Mar", ja: "3月" }},
      { key: "ui.event_landing.date.month.apr", values: { en: "Apr", de: "Apr", pl: "Kwi", es: "Abr", fr: "Avr", ja: "4月" }},
      { key: "ui.event_landing.date.month.may", values: { en: "May", de: "Mai", pl: "Maj", es: "May", fr: "Mai", ja: "5月" }},
      { key: "ui.event_landing.date.month.jun", values: { en: "Jun", de: "Jun", pl: "Cze", es: "Jun", fr: "Juin", ja: "6月" }},
      { key: "ui.event_landing.date.month.jul", values: { en: "Jul", de: "Jul", pl: "Lip", es: "Jul", fr: "Juil", ja: "7月" }},
      { key: "ui.event_landing.date.month.aug", values: { en: "Aug", de: "Aug", pl: "Sie", es: "Ago", fr: "Août", ja: "8月" }},
      { key: "ui.event_landing.date.month.sep", values: { en: "Sep", de: "Sep", pl: "Wrz", es: "Sep", fr: "Sep", ja: "9月" }},
      { key: "ui.event_landing.date.month.oct", values: { en: "Oct", de: "Okt", pl: "Paź", es: "Oct", fr: "Oct", ja: "10月" }},
      { key: "ui.event_landing.date.month.nov", values: { en: "Nov", de: "Nov", pl: "Lis", es: "Nov", fr: "Nov", ja: "11月" }},
      { key: "ui.event_landing.date.month.dec", values: { en: "Dec", de: "Dez", pl: "Gru", es: "Dic", fr: "Déc", ja: "12月" }},
      
      // Month names (full)
      { key: "ui.event_landing.date.month_full.january", values: { en: "January", de: "Januar", pl: "Styczeń", es: "Enero", fr: "Janvier", ja: "1月" }},
      { key: "ui.event_landing.date.month_full.february", values: { en: "February", de: "Februar", pl: "Luty", es: "Febrero", fr: "Février", ja: "2月" }},
      { key: "ui.event_landing.date.month_full.march", values: { en: "March", de: "März", pl: "Marzec", es: "Marzo", fr: "Mars", ja: "3月" }},
      { key: "ui.event_landing.date.month_full.april", values: { en: "April", de: "April", pl: "Kwiecień", es: "Abril", fr: "Avril", ja: "4月" }},
      { key: "ui.event_landing.date.month_full.may", values: { en: "May", de: "Mai", pl: "Maj", es: "Mayo", fr: "Mai", ja: "5月" }},
      { key: "ui.event_landing.date.month_full.june", values: { en: "June", de: "Juni", pl: "Czerwiec", es: "Junio", fr: "Juin", ja: "6月" }},
      { key: "ui.event_landing.date.month_full.july", values: { en: "July", de: "Juli", pl: "Lipiec", es: "Julio", fr: "Juillet", ja: "7月" }},
      { key: "ui.event_landing.date.month_full.august", values: { en: "August", de: "August", pl: "Sierpień", es: "Agosto", fr: "Août", ja: "8月" }},
      { key: "ui.event_landing.date.month_full.september", values: { en: "September", de: "September", pl: "Wrzesień", es: "Septiembre", fr: "Septembre", ja: "9月" }},
      { key: "ui.event_landing.date.month_full.october", values: { en: "October", de: "Oktober", pl: "Październik", es: "Octubre", fr: "Octobre", ja: "10月" }},
      { key: "ui.event_landing.date.month_full.november", values: { en: "November", de: "November", pl: "Listopad", es: "Noviembre", fr: "Novembre", ja: "11月" }},
      { key: "ui.event_landing.date.month_full.december", values: { en: "December", de: "Dezember", pl: "Grudzień", es: "Diciembre", fr: "Décembre", ja: "12月" }},
      
      // Day names (full)
      { key: "ui.event_landing.date.day_full.monday", values: { en: "Monday", de: "Montag", pl: "Poniedziałek", es: "Lunes", fr: "Lundi", ja: "月曜日" }},
      { key: "ui.event_landing.date.day_full.tuesday", values: { en: "Tuesday", de: "Dienstag", pl: "Wtorek", es: "Martes", fr: "Mardi", ja: "火曜日" }},
      { key: "ui.event_landing.date.day_full.wednesday", values: { en: "Wednesday", de: "Mittwoch", pl: "Środa", es: "Miércoles", fr: "Mercredi", ja: "水曜日" }},
      { key: "ui.event_landing.date.day_full.thursday", values: { en: "Thursday", de: "Donnerstag", pl: "Czwartek", es: "Jueves", fr: "Jeudi", ja: "木曜日" }},
      { key: "ui.event_landing.date.day_full.friday", values: { en: "Friday", de: "Freitag", pl: "Piątek", es: "Viernes", fr: "Vendredi", ja: "金曜日" }},
      { key: "ui.event_landing.date.day_full.saturday", values: { en: "Saturday", de: "Samstag", pl: "Sobota", es: "Sábado", fr: "Samedi", ja: "土曜日" }},
      { key: "ui.event_landing.date.day_full.sunday", values: { en: "Sunday", de: "Sonntag", pl: "Niedziela", es: "Domingo", fr: "Dimanche", ja: "日曜日" }},
      
      // Date format patterns
      { key: "ui.event_landing.date.format.short", values: { en: "{month} {day}, {year}", de: "{day}. {month} {year}", pl: "{day} {month} {year}", es: "{day} {month}, {year}", fr: "{day} {month} {year}", ja: "{year}年{month}{day}日" }},
      { key: "ui.event_landing.date.format.long", values: { en: "{weekday}, {month} {day}, {year}", de: "{weekday}, {day}. {month} {year}", pl: "{weekday}, {day} {month} {year}", es: "{weekday}, {day} de {month}, {year}", fr: "{weekday} {day} {month} {year}", ja: "{year}年{month}{day}日 ({weekday})" }},
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(ctx.db, systemOrg._id, allKeys);

    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];
        if (value) {
          const inserted = await insertTranslationIfNew(
            ctx.db,
            existingKeys,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "event-landing",
            "agenda-dates"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} agenda/date translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
