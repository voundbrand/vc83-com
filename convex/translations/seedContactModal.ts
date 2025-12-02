/**
 * SEED CONTACT MODAL TRANSLATIONS
 *
 * Seeds translations for the Enterprise Contact Sales Modal
 *
 * Run: npx convex run translations/seedContactModal:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Contact Modal translations...");

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
      // === WINDOW TITLE ===
      {
        key: "ui.contact_modal.title_suffix",
        values: {
          en: "Contact Sales",
          de: "Vertrieb kontaktieren",
          pl: "Skontaktuj się ze sprzedażą",
          es: "Contactar Ventas",
          fr: "Contacter les ventes",
          ja: "営業に連絡",
        }
      },

      // === PROFILE INFO ===
      {
        key: "ui.contact_modal.founder_title",
        values: {
          en: "Founder & CEO, l4yercak3",
          de: "Gründer & CEO, l4yercak3",
          pl: "Założyciel i CEO, l4yercak3",
          es: "Fundador y CEO, l4yercak3",
          fr: "Fondateur et PDG, l4yercak3",
          ja: "創業者兼CEO、l4yercak3",
        }
      },
      {
        key: "ui.contact_modal.schedule_call",
        values: {
          en: "Schedule a Call",
          de: "Termin vereinbaren",
          pl: "Umów rozmowę",
          es: "Programar una llamada",
          fr: "Planifier un appel",
          ja: "通話をスケジュール",
        }
      },

      // === PERSONAL MESSAGE ===
      {
        key: "ui.contact_modal.message_label",
        values: {
          en: "Personal Message:",
          de: "Persönliche Nachricht:",
          pl: "Osobista wiadomość:",
          es: "Mensaje personal:",
          fr: "Message personnel:",
          ja: "個人メッセージ:",
        }
      },
      {
        key: "ui.contact_modal.message_greeting",
        values: {
          en: "Hey there! 👋",
          de: "Hallo! 👋",
          pl: "Cześć! 👋",
          es: "¡Hola! 👋",
          fr: "Salut! 👋",
          ja: "こんにちは！ 👋",
        }
      },
      {
        key: "ui.contact_modal.message_thanks",
        values: {
          en: "Thanks for your interest in our {tierName} plan. This is our enterprise-grade solution, and I'd love to chat with you personally to make sure it's the perfect fit for your needs.",
          de: "Vielen Dank für Ihr Interesse an unserem {tierName}-Plan. Dies ist unsere Unternehmenslösung, und ich würde mich freuen, persönlich mit Ihnen zu sprechen, um sicherzustellen, dass sie perfekt zu Ihren Bedürfnissen passt.",
          pl: "Dziękujemy za zainteresowanie naszym planem {tierName}. To nasze rozwiązanie dla przedsiębiorstw, i chciałbym porozmawiać z Tobą osobiście, aby upewnić się, że idealnie pasuje do Twoich potrzeb.",
          es: "Gracias por tu interés en nuestro plan {tierName}. Esta es nuestra solución de nivel empresarial y me encantaría charlar contigo personalmente para asegurarme de que sea perfecta para tus necesidades.",
          fr: "Merci de votre intérêt pour notre plan {tierName}. C'est notre solution de niveau entreprise, et j'aimerais discuter avec vous personnellement pour m'assurer qu'elle convient parfaitement à vos besoins.",
          ja: "{tierName}プランへの関心をお寄せいただきありがとうございます。これは当社のエンタープライズグレードのソリューションです。お客様のニーズに完璧に適合するよう、個人的にお話しさせていただきたいと思います。",
        }
      },
      {
        key: "ui.contact_modal.message_thanks_general",
        values: {
          en: "Thanks for your interest in our enterprise solutions. I'd love to chat with you personally to make sure we find the perfect fit for your needs.",
          de: "Vielen Dank für Ihr Interesse an unseren Unternehmenslösungen. Ich würde mich freuen, persönlich mit Ihnen zu sprechen, um sicherzustellen, dass wir die perfekte Lösung für Ihre Bedürfnisse finden.",
          pl: "Dziękujemy za zainteresowanie naszymi rozwiązaniami dla przedsiębiorstw. Chciałbym porozmawiać z Tobą osobiście, aby upewnić się, że znajdziemy idealne rozwiązanie dla Twoich potrzeb.",
          es: "Gracias por tu interés en nuestras soluciones empresariales. Me encantaría charlar contigo personalmente para asegurarme de que encontremos la solución perfecta para tus necesidades.",
          fr: "Merci de votre intérêt pour nos solutions d'entreprise. J'aimerais discuter avec vous personnellement pour m'assurer que nous trouvons la solution parfaite pour vos besoins.",
          ja: "当社のエンタープライズソリューションへの関心をお寄せいただきありがとうございます。お客様のニーズに完璧に適合する解決策を見つけるため、個人的にお話しさせていただきたいと思います。",
        }
      },
      {
        key: "ui.contact_modal.message_contact_simple",
        values: {
          en: "Feel free to reach out directly via email, phone, or grab a time on my calendar. Or just fill out the form and I'll get back to you within 24 hours.",
          de: "Sie können mich gerne direkt per E-Mail, Telefon oder über meinen Kalender kontaktieren. Oder füllen Sie einfach das Formular aus und ich melde mich innerhalb von 24 Stunden bei Ihnen.",
          pl: "Możesz skontaktować się bezpośrednio przez e-mail, telefon lub wybrać termin w moim kalendarzu. Lub po prostu wypełnij formularz, a odezwę się w ciągu 24 godzin.",
          es: "Siéntete libre de contactar directamente por correo, teléfono o reservar una hora en mi calendario. O simplemente completa el formulario y te responderé en 24 horas.",
          fr: "N'hésitez pas à me contacter directement par e-mail, téléphone ou à réserver un créneau sur mon calendrier. Ou remplissez simplement le formulaire et je vous répondrai dans les 24 heures.",
          ja: "メール、電話、またはカレンダーから直接ご連絡ください。または、フォームにご記入いただければ、24時間以内にご連絡いたします。",
        }
      },
      {
        key: "ui.contact_modal.message_privacy",
        values: {
          en: "Private LLM hosting means your data never leaves your infrastructure. We'll set up everything for you - from the initial deployment to ongoing support.",
          de: "Private LLM-Hosting bedeutet, dass Ihre Daten niemals Ihre Infrastruktur verlassen. Wir richten alles für Sie ein - von der Erstbereitstellung bis zum laufenden Support.",
          pl: "Prywatny hosting LLM oznacza, że Twoje dane nigdy nie opuszczają Twojej infrastruktury. Wszystko skonfigurujemy dla Ciebie - od wstępnego wdrożenia po bieżące wsparcie.",
          es: "El alojamiento privado de LLM significa que tus datos nunca salen de tu infraestructura. Configuraremos todo para ti, desde la implementación inicial hasta el soporte continuo.",
          fr: "L'hébergement LLM privé signifie que vos données ne quittent jamais votre infrastructure. Nous configurerons tout pour vous - du déploiement initial au support continu.",
          ja: "プライベートLLMホスティングは、データがインフラストラクチャから外に出ることがないことを意味します。初期デプロイメントから継続的なサポートまで、すべてをセットアップいたします。",
        }
      },
      {
        key: "ui.contact_modal.message_contact",
        values: {
          en: "Feel free to reach out directly via {email}, {phone}, or {calendar}. Or just fill out the form and I'll get back to you within 24 hours.",
          de: "Sie können mich gerne direkt per {email}, {phone} oder {calendar} erreichen. Oder füllen Sie einfach das Formular aus und ich melde mich innerhalb von 24 Stunden bei Ihnen.",
          pl: "Możesz skontaktować się bezpośrednio przez {email}, {phone} lub {calendar}. Lub po prostu wypełnij formularz, a odezwę się w ciągu 24 godzin.",
          es: "Siéntete libre de contactar directamente por {email}, {phone} o {calendar}. O simplemente completa el formulario y te responderé en 24 horas.",
          fr: "N'hésitez pas à me contacter directement par {email}, {phone} ou {calendar}. Ou remplissez simplement le formulaire et je vous répondrai dans les 24 heures.",
          ja: "{email}、{phone}、または{calendar}から直接ご連絡ください。または、フォームにご記入いただければ、24時間以内にご連絡いたします。",
        }
      },
      {
        key: "ui.contact_modal.message_looking_forward",
        values: {
          en: "Looking forward to connecting! 🚀",
          de: "Ich freue mich auf den Kontakt! 🚀",
          pl: "Nie mogę się doczekać kontaktu! 🚀",
          es: "¡Espero poder conectar! 🚀",
          fr: "Au plaisir de vous contacter! 🚀",
          ja: "ご連絡をお待ちしております！ 🚀",
        }
      },

      // === FORM SECTION ===
      {
        key: "ui.contact_modal.form_title",
        values: {
          en: "Get in Touch",
          de: "Kontaktieren Sie uns",
          pl: "Skontaktuj się",
          es: "Ponte en contacto",
          fr: "Entrer en contact",
          ja: "お問い合わせ",
        }
      },
      {
        key: "ui.contact_modal.form_name",
        values: {
          en: "Your Name",
          de: "Ihr Name",
          pl: "Twoje imię",
          es: "Tu nombre",
          fr: "Votre nom",
          ja: "お名前",
        }
      },
      {
        key: "ui.contact_modal.form_company",
        values: {
          en: "Company Name",
          de: "Firmenname",
          pl: "Nazwa firmy",
          es: "Nombre de la empresa",
          fr: "Nom de l'entreprise",
          ja: "会社名",
        }
      },
      {
        key: "ui.contact_modal.form_email",
        values: {
          en: "Email Address",
          de: "E-Mail-Adresse",
          pl: "Adres e-mail",
          es: "Dirección de correo",
          fr: "Adresse e-mail",
          ja: "メールアドレス",
        }
      },
      {
        key: "ui.contact_modal.form_phone",
        values: {
          en: "Phone Number",
          de: "Telefonnummer",
          pl: "Numer telefonu",
          es: "Número de teléfono",
          fr: "Numéro de téléphone",
          ja: "電話番号",
        }
      },
      {
        key: "ui.contact_modal.form_message",
        values: {
          en: "Tell us about your needs",
          de: "Erzählen Sie uns von Ihren Anforderungen",
          pl: "Opowiedz nam o swoich potrzebach",
          es: "Cuéntanos sobre tus necesidades",
          fr: "Parlez-nous de vos besoins",
          ja: "ニーズについて教えてください",
        }
      },
      {
        key: "ui.contact_modal.form_placeholder_name",
        values: {
          en: "John Doe",
          de: "Max Mustermann",
          pl: "Jan Kowalski",
          es: "Juan Pérez",
          fr: "Jean Dupont",
          ja: "山田太郎",
        }
      },
      {
        key: "ui.contact_modal.form_placeholder_company",
        values: {
          en: "Acme Corp",
          de: "Musterfirma GmbH",
          pl: "Firma Sp. z o.o.",
          es: "Empresa S.A.",
          fr: "Entreprise SARL",
          ja: "株式会社サンプル",
        }
      },
      {
        key: "ui.contact_modal.form_placeholder_email",
        values: {
          en: "john@acme.com",
          de: "max@musterfirma.de",
          pl: "jan@firma.pl",
          es: "juan@empresa.com",
          fr: "jean@entreprise.fr",
          ja: "taro@sample.co.jp",
        }
      },
      {
        key: "ui.contact_modal.form_placeholder_phone",
        values: {
          en: "+49 123 456 7890 (optional)",
          de: "+49 123 456 7890 (optional)",
          pl: "+48 123 456 789 (opcjonalnie)",
          es: "+34 123 456 789 (opcional)",
          fr: "+33 1 23 45 67 89 (optionnel)",
          ja: "+81 90 1234 5678（任意）",
        }
      },
      {
        key: "ui.contact_modal.form_placeholder_message",
        values: {
          en: "What are your expected usage levels? Do you have specific compliance requirements? Any other details that would help us prepare for our call...",
          de: "Welche Nutzungsmengen erwarten Sie? Haben Sie spezielle Compliance-Anforderungen? Weitere Details, die uns bei der Vorbereitung unseres Gesprächs helfen würden...",
          pl: "Jakie są oczekiwane poziomy użycia? Czy masz konkretne wymagania dotyczące zgodności? Inne szczegóły, które pomogłyby nam przygotować się do rozmowy...",
          es: "¿Cuáles son tus niveles de uso esperados? ¿Tienes requisitos de cumplimiento específicos? Cualquier otro detalle que nos ayude a prepararnos para nuestra llamada...",
          fr: "Quels sont vos niveaux d'utilisation attendus ? Avez-vous des exigences de conformité spécifiques ? Tout autre détail qui nous aiderait à préparer notre appel...",
          ja: "予想される使用量はどの程度ですか？特定のコンプライアンス要件はありますか？お電話の準備に役立つその他の詳細はありますか...",
        }
      },
      {
        key: "ui.contact_modal.button_send",
        values: {
          en: "Send Message",
          de: "Nachricht senden",
          pl: "Wyślij wiadomość",
          es: "Enviar mensaje",
          fr: "Envoyer le message",
          ja: "メッセージを送信",
        }
      },
      {
        key: "ui.contact_modal.button_sending",
        values: {
          en: "Sending...",
          de: "Wird gesendet...",
          pl: "Wysyłanie...",
          es: "Enviando...",
          fr: "Envoi en cours...",
          ja: "送信中...",
        }
      },
      {
        key: "ui.contact_modal.response_time",
        values: {
          en: "We'll get back to you within 24 hours",
          de: "Wir melden uns innerhalb von 24 Stunden bei Ihnen",
          pl: "Odpowiemy w ciągu 24 godzin",
          es: "Te responderemos en 24 horas",
          fr: "Nous vous répondrons dans les 24 heures",
          ja: "24時間以内にご連絡いたします",
        }
      },

      // === SUCCESS STATE ===
      {
        key: "ui.contact_modal.success_title",
        values: {
          en: "Message Sent!",
          de: "Nachricht gesendet!",
          pl: "Wiadomość wysłana!",
          es: "¡Mensaje enviado!",
          fr: "Message envoyé!",
          ja: "メッセージが送信されました！",
        }
      },
      {
        key: "ui.contact_modal.success_message",
        values: {
          en: "Thanks for reaching out! I'll get back to you within 24 hours.",
          de: "Vielen Dank für Ihre Nachricht! Ich melde mich innerhalb von 24 Stunden bei Ihnen.",
          pl: "Dziękujemy za kontakt! Odpowiem w ciągu 24 godzin.",
          es: "¡Gracias por contactar! Te responderé en 24 horas.",
          fr: "Merci de nous avoir contactés! Je vous répondrai dans les 24 heures.",
          ja: "ご連絡ありがとうございます！24時間以内にご連絡いたします。",
        }
      },
      {
        key: "ui.contact_modal.success_email",
        values: {
          en: "Check your email for a confirmation.",
          de: "Überprüfen Sie Ihre E-Mail auf eine Bestätigung.",
          pl: "Sprawdź swoją pocztę w poszukiwaniu potwierdzenia.",
          es: "Revisa tu correo para ver la confirmación.",
          fr: "Vérifiez votre e-mail pour une confirmation.",
          ja: "確認メールをご確認ください。",
        }
      },

      // === TIER FEATURES ===
      {
        key: "ui.contact_modal.feature_self_hosted",
        values: {
          en: "✓ Self-hosted infrastructure",
          de: "✓ Selbst gehostete Infrastruktur",
          pl: "✓ Infrastruktura samodzielnie hostowana",
          es: "✓ Infraestructura autohospedada",
          fr: "✓ Infrastructure auto-hébergée",
          ja: "✓ セルフホストインフラストラクチャ",
        }
      },
      {
        key: "ui.contact_modal.feature_sovereignty",
        values: {
          en: "✓ Complete data sovereignty",
          de: "✓ Vollständige Datenhoheit",
          pl: "✓ Pełna suwerenność danych",
          es: "✓ Soberanía completa de datos",
          fr: "✓ Souveraineté complète des données",
          ja: "✓ 完全なデータ主権",
        }
      },
      {
        key: "ui.contact_modal.feature_zero_retention",
        values: {
          en: "✓ Zero data retention guaranteed",
          de: "✓ Garantiert keine Datenspeicherung",
          pl: "✓ Gwarantowane zerowe przechowywanie danych",
          es: "✓ Retención de datos cero garantizada",
          fr: "✓ Rétention de données zéro garantie",
          ja: "✓ データ保持ゼロを保証",
        }
      },
      {
        key: "ui.contact_modal.feature_support",
        values: {
          en: "✓ Dedicated technical support",
          de: "✓ Dedizierter technischer Support",
          pl: "✓ Dedykowane wsparcie techniczne",
          es: "✓ Soporte técnico dedicado",
          fr: "✓ Support technique dédié",
          ja: "✓ 専用技術サポート",
        }
      },
      {
        key: "ui.contact_modal.feature_tuning",
        values: {
          en: "✓ Custom model fine-tuning",
          de: "✓ Individuelle Modellanpassung",
          pl: "✓ Dostosowanie modelu niestandardowego",
          es: "✓ Ajuste de modelo personalizado",
          fr: "✓ Réglage de modèle personnalisé",
          ja: "✓ カスタムモデルファインチューニング",
        }
      },
      {
        key: "ui.contact_modal.feature_sla",
        values: {
          en: "✓ SLA guarantees",
          de: "✓ SLA-Garantien",
          pl: "✓ Gwarancje SLA",
          es: "✓ Garantías de SLA",
          fr: "✓ Garanties SLA",
          ja: "✓ SLA保証",
        }
      },
    ];

    // Get existing keys first (returns empty set but kept for compatibility)
    const existingKeys = new Set<string>();

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert translations for each locale
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];

        const inserted = await insertTranslationIfNew(
          ctx.db,
          existingKeys,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "ui", // category
          "contact_modal" // component
        );

        if (inserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`✅ Contact Modal translations seeded successfully!`);
    console.log(`   - Inserted: ${insertedCount} new translations`);
    console.log(`   - Skipped: ${skippedCount} existing translations`);

    return {
      success: true,
      totalTranslations: translations.length * supportedLocales.length,
      inserted: insertedCount,
      skipped: skippedCount,
    };
  },
});
