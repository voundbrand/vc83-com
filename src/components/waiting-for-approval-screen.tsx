"use client";

import { useEffect } from "react";
import { useTranslation } from "@/contexts/translation-context";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Clock3, CircleX, Lock } from "lucide-react";

interface WaitingForApprovalScreenProps {
  status: "none" | "pending" | "rejected";
  requestedAt?: number;
  rejectionReason?: string;
  userEmail: string;
}

type SupportedLocale = "en" | "de" | "pl" | "es" | "fr" | "ja";

type CopyKey =
  | "beta_access_title"
  | "pending_title"
  | "pending_subtitle"
  | "pending_card_title"
  | "pending_review_message"
  | "pending_requested_on"
  | "pending_email_notice"
  | "rejected_title"
  | "rejected_subtitle"
  | "rejected_reason_label"
  | "rejected_followup"
  | "rejected_support_intro"
  | "none_title"
  | "none_subtitle"
  | "none_card_title"
  | "none_description"
  | "sign_out";

const FALLBACK_COPY: Record<SupportedLocale, Record<CopyKey, string>> = {
  en: {
    beta_access_title: "Beta Access",
    pending_title: "Thanks for signing up!",
    pending_subtitle: "We're currently in private beta.",
    pending_card_title: "Your request is under review",
    pending_review_message: "We'll review your beta access request and get back to you within 24-48 hours.",
    pending_requested_on: "Requested on {date} at {time}",
    pending_email_notice: "We'll send you an email at {email} when your access is approved.",
    rejected_title: "Beta Access Request Declined",
    rejected_subtitle: "Unfortunately, your beta access request was not approved at this time.",
    rejected_reason_label: "Reason",
    rejected_followup: "We appreciate your interest in sevenlayers.io. Stay connected for updates on when we open more beta access.",
    rejected_support_intro: "Have questions? Contact us at",
    none_title: "Thanks for signing up!",
    none_subtitle: "We're currently in private beta.",
    none_card_title: "Beta access required",
    none_description: "Your account has been created, but beta access approval is required to use the platform.",
    sign_out: "Sign Out",
  },
  de: {
    beta_access_title: "Beta-Zugang",
    pending_title: "Danke für deine Anmeldung!",
    pending_subtitle: "Wir befinden uns derzeit in der privaten Beta.",
    pending_card_title: "Deine Anfrage wird geprüft",
    pending_review_message: "Wir prüfen deine Beta-Zugangsanforderung und melden uns innerhalb von 24-48 Stunden.",
    pending_requested_on: "Angefragt am {date} um {time}",
    pending_email_notice: "Wir senden eine E-Mail an {email}, sobald dein Zugang freigegeben ist.",
    rejected_title: "Beta-Zugangsanforderung abgelehnt",
    rejected_subtitle: "Leider wurde deine Beta-Zugangsanforderung derzeit nicht genehmigt.",
    rejected_reason_label: "Grund",
    rejected_followup: "Danke für dein Interesse an sevenlayers.io. Folge unseren Updates, wenn wir mehr Beta-Zugänge freigeben.",
    rejected_support_intro: "Fragen? Kontaktiere uns unter",
    none_title: "Danke für deine Anmeldung!",
    none_subtitle: "Wir befinden uns derzeit in der privaten Beta.",
    none_card_title: "Beta-Zugang erforderlich",
    none_description: "Dein Konto wurde erstellt, aber für die Nutzung der Plattform ist eine Beta-Freigabe erforderlich.",
    sign_out: "Abmelden",
  },
  pl: {
    beta_access_title: "Dostęp Beta",
    pending_title: "Dziękujemy za rejestrację!",
    pending_subtitle: "Obecnie jesteśmy w prywatnej becie.",
    pending_card_title: "Twój wniosek jest sprawdzany",
    pending_review_message: "Sprawdzimy Twój wniosek o dostęp beta i wrócimy z odpowiedzią w ciągu 24-48 godzin.",
    pending_requested_on: "Wysłano {date} o {time}",
    pending_email_notice: "Wyślemy e-mail na adres {email}, gdy Twój dostęp zostanie zatwierdzony.",
    rejected_title: "Wniosek o dostęp beta odrzucony",
    rejected_subtitle: "Niestety Twój wniosek o dostęp beta nie został teraz zatwierdzony.",
    rejected_reason_label: "Powód",
    rejected_followup: "Dziękujemy za zainteresowanie sevenlayers.io. Śledź aktualizacje, gdy otworzymy więcej miejsc beta.",
    rejected_support_intro: "Masz pytania? Napisz do nas:",
    none_title: "Dziękujemy za rejestrację!",
    none_subtitle: "Obecnie jesteśmy w prywatnej becie.",
    none_card_title: "Wymagany dostęp beta",
    none_description: "Twoje konto zostało utworzone, ale korzystanie z platformy wymaga zatwierdzenia dostępu beta.",
    sign_out: "Wyloguj się",
  },
  es: {
    beta_access_title: "Acceso Beta",
    pending_title: "¡Gracias por registrarte!",
    pending_subtitle: "Actualmente estamos en beta privada.",
    pending_card_title: "Tu solicitud está en revisión",
    pending_review_message: "Revisaremos tu solicitud de acceso beta y te responderemos en un plazo de 24-48 horas.",
    pending_requested_on: "Solicitado el {date} a las {time}",
    pending_email_notice: "Te enviaremos un correo a {email} cuando tu acceso sea aprobado.",
    rejected_title: "Solicitud de acceso beta rechazada",
    rejected_subtitle: "Lamentablemente, tu solicitud de acceso beta no fue aprobada en este momento.",
    rejected_reason_label: "Motivo",
    rejected_followup: "Agradecemos tu interés en sevenlayers.io. Sigue nuestras novedades cuando abramos más acceso beta.",
    rejected_support_intro: "¿Tienes preguntas? Contáctanos en",
    none_title: "¡Gracias por registrarte!",
    none_subtitle: "Actualmente estamos en beta privada.",
    none_card_title: "Se requiere acceso beta",
    none_description: "Tu cuenta fue creada, pero necesitas aprobación de acceso beta para usar la plataforma.",
    sign_out: "Cerrar sesión",
  },
  fr: {
    beta_access_title: "Accès Beta",
    pending_title: "Merci pour votre inscription!",
    pending_subtitle: "Nous sommes actuellement en bêta privée.",
    pending_card_title: "Votre demande est en cours d'examen",
    pending_review_message: "Nous examinerons votre demande d'accès bêta et reviendrons vers vous sous 24-48 heures.",
    pending_requested_on: "Demande envoyée le {date} à {time}",
    pending_email_notice: "Nous vous enverrons un e-mail à {email} lorsque votre accès sera approuvé.",
    rejected_title: "Demande d'accès bêta refusée",
    rejected_subtitle: "Malheureusement, votre demande d'accès bêta n'a pas été approuvée pour le moment.",
    rejected_reason_label: "Raison",
    rejected_followup: "Merci pour votre intérêt pour sevenlayers.io. Restez informé de nos ouvertures bêta.",
    rejected_support_intro: "Des questions? Contactez-nous à",
    none_title: "Merci pour votre inscription!",
    none_subtitle: "Nous sommes actuellement en bêta privée.",
    none_card_title: "Accès bêta requis",
    none_description: "Votre compte a été créé, mais l'accès bêta est requis pour utiliser la plateforme.",
    sign_out: "Se déconnecter",
  },
  ja: {
    beta_access_title: "ベータアクセス",
    pending_title: "ご登録ありがとうございます！",
    pending_subtitle: "現在プライベートベータ期間中です。",
    pending_card_title: "申請を審査中です",
    pending_review_message: "ベータアクセス申請を確認し、24-48時間以内にご連絡します。",
    pending_requested_on: "{date} {time} に申請",
    pending_email_notice: "アクセスが承認されると、{email} にメールを送信します。",
    rejected_title: "ベータアクセス申請は却下されました",
    rejected_subtitle: "申し訳ありませんが、今回ベータアクセス申請は承認されませんでした。",
    rejected_reason_label: "理由",
    rejected_followup: "sevenlayers.io にご関心をお寄せいただきありがとうございます。今後のベータ公開情報をご確認ください。",
    rejected_support_intro: "ご質問は",
    none_title: "ご登録ありがとうございます！",
    none_subtitle: "現在プライベートベータ期間中です。",
    none_card_title: "ベータアクセスが必要です",
    none_description: "アカウントは作成されましたが、プラットフォーム利用にはベータアクセス承認が必要です。",
    sign_out: "サインアウト",
  },
};

const SUPPORT_EMAIL = "support@sevenlayers.io";

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale in FALLBACK_COPY;
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;

  return Object.entries(params).reduce((value, [key, replacement]) => {
    return value.replaceAll(`{${key}}`, replacement);
  }, template);
}

export function WaitingForApprovalScreen({
  status,
  requestedAt,
  rejectionReason,
  userEmail,
}: WaitingForApprovalScreenProps) {
  const { signOut } = useAuth();
  const { locale } = useTranslation();
  const { t } = useNamespaceTranslations("ui.login");

  useEffect(() => {
    const root = document.documentElement;
    const previousMode = root.getAttribute("data-reading-mode");
    const hadDarkClass = root.classList.contains("dark");

    root.setAttribute("data-reading-mode", "dark");
    root.classList.add("dark");

    return () => {
      if (previousMode) {
        root.setAttribute("data-reading-mode", previousMode);
      } else {
        root.removeAttribute("data-reading-mode");
      }
      root.classList.toggle("dark", hadDarkClass);
    };
  }, []);

  const resolvedLocale: SupportedLocale = isSupportedLocale(locale) ? locale : "en";
  const copy = FALLBACK_COPY[resolvedLocale];

  const tr = (
    key: string,
    fallbackKey: CopyKey,
    params?: Record<string, string>,
  ): string => {
    const translated = t(key, params);
    if (translated !== key) {
      return translated;
    }
    return interpolate(copy[fallbackKey], params);
  };

  const handleSignOut = () => {
    signOut();
  };

  const requestedDate = requestedAt ? new Date(requestedAt) : null;
  const formattedRequestedDate = requestedDate
    ? new Intl.DateTimeFormat(resolvedLocale, { dateStyle: "medium" }).format(requestedDate)
    : "";
  const formattedRequestedTime = requestedDate
    ? new Intl.DateTimeFormat(resolvedLocale, { timeStyle: "short" }).format(requestedDate)
    : "";

  return (
    <div className="relative min-h-screen w-screen overflow-hidden flex items-center justify-center p-4 sm:p-8">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--info) 24%, transparent) 0%, transparent 42%),
            radial-gradient(circle at 82% 88%, color-mix(in srgb, var(--warning) 18%, transparent) 0%, transparent 36%),
            var(--background)
          `,
        }}
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border desktop-shell-border desktop-shell-surface-elevated"
        style={{ boxShadow: "var(--window-shell-shadow)" }}
      >
        <div className="flex items-center gap-2 border-b desktop-shell-border-soft px-5 py-3" style={{ background: "var(--shell-titlebar-gradient)" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--info)" }} />
          <span className="font-pixel text-xs sm:text-sm desktop-shell-text">
            {tr("ui.login.beta_access.title", "beta_access_title")}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          {status === "pending" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: "var(--info)", background: "var(--shell-surface)" }}>
                  <Clock3 className="h-6 w-6" style={{ color: "var(--info)" }} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold desktop-shell-text mb-2">
                    {tr("ui.login.beta_access.pending.title", "pending_title")}
                  </h1>
                  <p className="desktop-shell-text-muted">
                    {tr("ui.login.beta_access.pending.subtitle", "pending_subtitle")}
                  </p>
                </div>
              </div>

              <div className="desktop-shell-note rounded-xl border p-6" style={{ background: "var(--info-bg)", borderColor: "var(--info)" }}>
                <h2 className="font-semibold text-lg desktop-shell-text mb-3">
                  {tr("ui.login.beta_access.pending.card_title", "pending_card_title")}
                </h2>
                <p className="desktop-shell-text mb-4">
                  {tr("ui.login.beta_access.pending.review_message", "pending_review_message")}
                </p>
                {requestedDate && (
                  <p className="text-sm desktop-shell-text-muted mb-2">
                    {tr("ui.login.beta_access.pending.requested_on", "pending_requested_on", {
                      date: formattedRequestedDate,
                      time: formattedRequestedTime,
                    })}
                  </p>
                )}
                <p className="text-sm desktop-shell-text-muted">
                  {tr("ui.login.beta_access.pending.email_notice", "pending_email_notice", { email: userEmail })}
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="beveled-button min-w-44 px-8 py-3"
                >
                  <span className="font-pixel text-xs">
                    {tr("ui.login.button_sign_out", "sign_out")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {status === "rejected" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: "var(--error)", background: "var(--shell-surface)" }}>
                  <CircleX className="h-6 w-6" style={{ color: "var(--error)" }} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold desktop-shell-text mb-2">
                    {tr("ui.login.beta_access.rejected.title", "rejected_title")}
                  </h1>
                  <p className="desktop-shell-text-muted">
                    {tr("ui.login.beta_access.rejected.subtitle", "rejected_subtitle")}
                  </p>
                </div>
              </div>

              {rejectionReason && (
                <div className="desktop-shell-note rounded-xl border p-6" style={{ background: "var(--error-bg)", borderColor: "var(--error)" }}>
                  <h2 className="font-semibold text-lg desktop-shell-text mb-2">
                    {tr("ui.login.beta_access.rejected.reason_label", "rejected_reason_label")}:
                  </h2>
                  <p className="desktop-shell-text">{rejectionReason}</p>
                </div>
              )}

              <div className="desktop-shell-note rounded-xl border p-6" style={{ background: "var(--shell-surface)", borderColor: "var(--shell-border-soft)" }}>
                <p className="desktop-shell-text mb-4">
                  {tr("ui.login.beta_access.rejected.followup", "rejected_followup")}
                </p>
                <p className="text-sm desktop-shell-text-muted">
                  {tr("ui.login.beta_access.rejected.support_intro", "rejected_support_intro")}{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--info)" }}>
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="beveled-button min-w-44 px-8 py-3"
                >
                  <span className="font-pixel text-xs">
                    {tr("ui.login.button_sign_out", "sign_out")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {status === "none" && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: "var(--info)", background: "var(--shell-surface)" }}>
                  <Lock className="h-6 w-6" style={{ color: "var(--info)" }} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold desktop-shell-text mb-2">
                    {tr("ui.login.beta_access.none.title", "none_title")}
                  </h1>
                  <p className="desktop-shell-text-muted">
                    {tr("ui.login.beta_access.none.subtitle", "none_subtitle")}
                  </p>
                </div>
              </div>

              <div className="desktop-shell-note rounded-xl border p-6" style={{ background: "var(--info-bg)", borderColor: "var(--info)" }}>
                <h2 className="font-semibold text-lg desktop-shell-text mb-3">
                  {tr("ui.login.beta_access.none.card_title", "none_card_title")}
                </h2>
                <p className="desktop-shell-text mb-4">
                  {tr("ui.login.beta_access.none.description", "none_description")}
                </p>
                <p className="text-sm desktop-shell-text-muted">
                  {tr("ui.login.beta_access.pending.email_notice", "pending_email_notice", { email: userEmail })}
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="beveled-button min-w-44 px-8 py-3"
                >
                  <span className="font-pixel text-xs">
                    {tr("ui.login.button_sign_out", "sign_out")}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
