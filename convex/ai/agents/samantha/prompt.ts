import type { SamanthaRuntimeContract } from "./runtimeModule";
export type SamanthaPromptLanguage = "en" | "de";

export function buildSamanthaRuntimeContext(
  contract: SamanthaRuntimeContract | null | undefined
): string | null {
  if (!contract) {
    return null;
  }
  return [
    "--- SAMANTHA RUNTIME CONTRACT ---",
    JSON.stringify(contract),
    "--- END SAMANTHA RUNTIME CONTRACT ---",
  ].join("\n");
}

function normalizeSamanthaToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const SAMANTHA_FILE_FORMAT_PROMISE_PATTERN = /\b(?:pdf|docx)\b/i;

function isSamanthaFailClosedRefusalContent(content: string): boolean {
  const normalized = content.toLowerCase();
  return normalized.includes(
    "i can’t confirm completion in this turn because no verifiable tool execution was observed",
  )
    || normalized.includes(
      "i couldn't confirm completion in this turn because no verifiable tool execution was observed",
    )
    || normalized.includes(
      "i can’t confirm audit email delivery yet because the delivery tool did not execute in this turn",
    )
    || normalized.includes(
      "i couldn't verify audit email delivery in this turn even though your request was recognized",
    )
    || normalized.includes(
      "ich kann den abschluss in diesem schritt nicht bestaetigen, weil keine verifizierbare tool-ausfuehrung beobachtet wurde",
    )
    || normalized.includes(
      "ich kann die audit-e-mail-zustellung noch nicht bestaetigen, weil das zustellungs-tool in diesem schritt nicht ausgefuehrt wurde",
    )
    || normalized.includes(
      "ich konnte die audit-e-mail-zustellung in diesem schritt nicht verifizieren",
    );
}

function isSamanthaMissingFieldRecoveryContent(content: string): boolean {
  const normalized = normalizeSamanthaToken(content);
  return normalized.includes("i captured these details so far")
    || normalized.includes("to send your audit results email i still need")
    || normalized.includes("ich habe bisher folgende angaben erfasst")
    || normalized.includes("fur den versand der audit ergebnisse per e mail brauche ich nur noch");
}

export function countTrailingSamanthaFailClosedAssistantMessages(
  sessionHistory: Array<{ role: string; content: string }>,
): number {
  let count = 0;
  for (let index = sessionHistory.length - 1; index >= 0; index -= 1) {
    const message = sessionHistory[index];
    if (message.role !== "assistant") {
      continue;
    }
    if (!isSamanthaFailClosedRefusalContent(message.content || "")) {
      break;
    }
    count += 1;
  }
  return count;
}

export function countTrailingSamanthaMissingFieldRecoveryMessages(
  sessionHistory: Array<{ role: string; content: string }>,
): number {
  let count = 0;
  for (let index = sessionHistory.length - 1; index >= 0; index -= 1) {
    const message = sessionHistory[index];
    if (message.role !== "assistant") {
      continue;
    }
    if (!isSamanthaMissingFieldRecoveryContent(message.content || "")) {
      break;
    }
    count += 1;
  }
  return count;
}

export function buildSamanthaAuditDeliverableVerificationFallbackMessage(
  language: SamanthaPromptLanguage,
): string {
  if (language === "de") {
    return "Ich konnte die Audit-E-Mail-Zustellung in diesem Schritt nicht verifizieren, obwohl die Anfrage erkannt wurde. Bitte antworten Sie mit \"erneut zustellen\", dann fuehre ich die Zustellung direkt erneut aus. Alternativ schreibe ich sofort ein manuelles Follow-up an das Team fuer die direkte Zusendung.";
  }
  return "I couldn’t verify audit email delivery in this turn even though your request was recognized. Reply with \"retry delivery\" and I’ll rerun it immediately, or I can trigger a manual team follow-up for direct send now.";
}

export function buildSamanthaAuditDeliverableGracefulDegradationMessage(
  language: SamanthaPromptLanguage,
): string {
  if (language === "de") {
    return "Die automatische Audit-E-Mail-Zustellung bleibt aktuell blockiert. Ich sende den Plan jetzt direkt im Chat weiter und markiere ein manuelles Follow-up, damit das Team die finale Zusammenfassung und persoenliche Rueckmeldung innerhalb von 24 Stunden zustellt.";
  }
  return "Automatic audit email delivery is still blocked. I am sharing the implementation plan in chat now and flagging a manual follow-up so the team sends the final summary and personal follow-up within 24 hours.";
}

export function sanitizeSamanthaEmailOnlyAssistantContent(args: {
  assistantContent: string;
  language: SamanthaPromptLanguage;
}): {
  assistantContent: string;
  rewritten: boolean;
  blocked: boolean;
} {
  if (!SAMANTHA_FILE_FORMAT_PROMISE_PATTERN.test(args.assistantContent)) {
    return {
      assistantContent: args.assistantContent,
      rewritten: false,
      blocked: false,
    };
  }

  const emailDeliveryPhrase =
    args.language === "de" ? "per E-Mail" : "by email";
  const genericDeliveryLabel =
    args.language === "de" ? "E-Mail-Zustellung" : "email delivery";
  let rewritten = args.assistantContent
    .replace(
      /\b(?:als|as)\s+(?:eine?\s+|an?\s+)?(?:pdf|docx)(?:-datei|-file)?\b/gi,
      emailDeliveryPhrase,
    )
    .replace(/\b(?:pdf|docx)(?:-datei|-file)?\b/gi, genericDeliveryLabel);

  if (SAMANTHA_FILE_FORMAT_PROMISE_PATTERN.test(rewritten)) {
    return {
      assistantContent:
        args.language === "de"
          ? "Ich sende die Audit-Ergebnisse ausschliesslich per E-Mail. Bitte bestaetigen Sie bei Bedarf nur Ihre Kontaktdaten."
          : "I send audit results by email only. If needed, please confirm your contact details.",
      rewritten: true,
      blocked: true,
    };
  }

  return {
    assistantContent: rewritten,
    rewritten: rewritten !== args.assistantContent,
    blocked: false,
  };
}
