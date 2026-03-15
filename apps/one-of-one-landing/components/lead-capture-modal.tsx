"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, Phone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackLandingEvent } from "@/lib/analytics"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeadCaptureAgent = {
  agentKey: string
  name: string
  personaName: string
}

export type LeadCaptureModalLabels = {
  title: string
  subtitle: string
  firstNameLabel: string
  lastNameLabel: string
  languageLabel: string
  languageEn: string
  languageDe: string
  phoneLabel: string
  phonePlaceholder: string
  phoneHint: string
  emailLabel: string
  emailPlaceholder: string
  submitLabel: string
  submittingLabel: string
  bookDemoLabel: string
  bookDemoSeparator: string
  privacyNote: string
  otpTitle: string
  otpBody: string
  otpPlaceholder: string
  otpVerify: string
  otpVerifying: string
  otpResend: string
  otpResendIn: string
  otpDifferentNumber: string
  otpInvalid: string
  otpExpired: string
  callingTitle: string
  callingBody: string
  callingConfirmation: string
  closeLabel: string
  errorLabel: string
  rateLimitedLabel: string
}

type ModalState = "form" | "otp" | "calling"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s().-]/g, "")
}

const FLAG_EN = "\uD83C\uDDFA\uD83C\uDDF8"
const FLAG_DE = "\uD83C\uDDE9\uD83C\uDDEA"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadCaptureModal({
  agent,
  labels,
  language,
  founderDemoUrl,
  isOpen,
  onClose,
  otpActive = true,
}: {
  agent: LeadCaptureAgent | null
  labels: LeadCaptureModalLabels
  language: "en" | "de"
  founderDemoUrl: string
  isOpen: boolean
  onClose: () => void
  otpActive?: boolean
}) {
  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "de">(language)
  const [phoneInput, setPhoneInput] = useState("")
  const [emailInput, setEmailInput] = useState("")

  // OTP fields
  const [otpCode, setOtpCode] = useState("")
  const [phoneMasked, setPhoneMasked] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  // State machine
  const [modalState, setModalState] = useState<ModalState>("form")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync language preference when parent language changes
  useEffect(() => {
    setSelectedLanguage(language)
  }, [language])

  // Body scroll lock + escape key
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Reset state when modal opens/closes or agent changes
  useEffect(() => {
    if (!isOpen) {
      return
    }
    setFirstName("")
    setLastName("")
    setPhoneInput("")
    setEmailInput("")
    setOtpCode("")
    setPhoneMasked("")
    setModalState("form")
    setIsSubmitting(false)
    setErrorMessage(null)
    setResendCooldown(0)
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
      cooldownRef.current = null
    }
  }, [isOpen, agent?.agentKey])

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current)
      }
    }
  }, [])

  // Start resend cooldown timer
  const startResendCooldown = useCallback(() => {
    setResendCooldown(30)
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
    }
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current)
            cooldownRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  if (!isOpen || !agent) {
    return null
  }

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phoneInput.trim().length > 0 &&
    emailInput.trim().length > 0

  // -------------------------------------------------------------------------
  // Step 1: Submit form → request SMS code
  // -------------------------------------------------------------------------
  const handleRequestCode = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/lead-capture/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: emailInput.trim(),
          phone: phoneInput.trim(),
          language: selectedLanguage,
          requestedAgentKey: agent.agentKey,
          requestedAgentName: agent.name,
          requestedPersonaName: agent.personaName,
        }),
      })

      const payload = (await response.json()) as {
        ok?: boolean
        phoneMasked?: string
        otpSkipped?: boolean
        error?: string
      }

      if (!response.ok) {
        if (payload.error === "rate_limited") {
          throw new Error(labels.rateLimitedLabel)
        }
        throw new Error(payload.error || labels.errorLabel)
      }

      // When OTP is not active, skip straight to verify (no code needed)
      if (payload.otpSkipped) {
        trackLandingEvent({
          eventName: "onboarding.funnel.activation",
          metadata: {
            ctaId: "lead_capture_direct_call",
            ctaGroup: "lead_capture",
            ctaPlacement: "lead_capture_modal",
            requestedAgentKey: agent.agentKey,
            requestedPersonaName: agent.personaName,
            flowStep: "direct_call_initiated",
          },
        })

        const verifyResponse = await fetch("/api/lead-capture/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: emailInput.trim(),
            phone: phoneInput.trim(),
            language: selectedLanguage,
            requestedAgentKey: agent.agentKey,
            requestedAgentName: agent.name,
            requestedPersonaName: agent.personaName,
            landingPath:
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/",
          }),
        })

        const verifyPayload = (await verifyResponse.json()) as {
          ok?: boolean
          error?: string
        }

        if (!verifyResponse.ok) {
          if (verifyPayload.error === "rate_limited") {
            throw new Error(labels.rateLimitedLabel)
          }
          throw new Error(verifyPayload.error || labels.errorLabel)
        }

        setModalState("calling")
        return
      }

      trackLandingEvent({
        eventName: "onboarding.funnel.activation",
        metadata: {
          ctaId: "lead_capture_request_code",
          ctaGroup: "lead_capture",
          ctaPlacement: "lead_capture_modal",
          requestedAgentKey: agent.agentKey,
          requestedPersonaName: agent.personaName,
          flowStep: "code_requested",
        },
      })

      setPhoneMasked(payload.phoneMasked || "***")
      setModalState("otp")
      startResendCooldown()
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : labels.errorLabel
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Verify OTP → create lead + trigger call
  // -------------------------------------------------------------------------
  const handleVerify = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/lead-capture/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: emailInput.trim(),
          phone: phoneInput.trim(),
          code: otpCode.trim(),
          language: selectedLanguage,
          requestedAgentKey: agent.agentKey,
          requestedAgentName: agent.name,
          requestedPersonaName: agent.personaName,
          landingPath:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/",
        }),
      })

      const payload = (await response.json()) as {
        ok?: boolean
        error?: string
      }

      if (!response.ok) {
        if (payload.error === "rate_limited") {
          throw new Error(labels.rateLimitedLabel)
        }
        if (payload.error === "invalid_code") {
          throw new Error(labels.otpInvalid)
        }
        throw new Error(payload.error || labels.errorLabel)
      }

      trackLandingEvent({
        eventName: "onboarding.funnel.activation",
        metadata: {
          ctaId: "lead_capture_verified",
          ctaGroup: "lead_capture",
          ctaPlacement: "lead_capture_modal",
          requestedAgentKey: agent.agentKey,
          requestedPersonaName: agent.personaName,
          flowStep: "verified_calling",
        },
      })

      setModalState("calling")
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : labels.errorLabel
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Resend code
  // -------------------------------------------------------------------------
  const handleResendCode = async () => {
    if (resendCooldown > 0) {
      return
    }
    setErrorMessage(null)

    try {
      const response = await fetch("/api/lead-capture/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: emailInput.trim(),
          phone: phoneInput.trim(),
          language: selectedLanguage,
          requestedAgentKey: agent.agentKey,
          requestedAgentName: agent.name,
          requestedPersonaName: agent.personaName,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        if (payload.error === "rate_limited") {
          setErrorMessage(labels.rateLimitedLabel)
          return
        }
      }

      setOtpCode("")
      startResendCooldown()
    } catch {
      setErrorMessage(labels.errorLabel)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="demo-call-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="demo-call-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-capture-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="demo-call-modal-close"
          onClick={onClose}
          aria-label={labels.closeLabel}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ----------------------------------------------------------------- */}
        {/* STATE: FORM                                                        */}
        {/* ----------------------------------------------------------------- */}
        {modalState === "form" && (
          <>
            <p className="demo-call-modal-kicker">{agent.name}</p>
            <h3
              id="lead-capture-title"
              className="text-xl md:text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {labels.title}
            </h3>
            <p
              className="mt-2 text-sm md:text-base leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {labels.subtitle}
            </p>

            <div className="mt-6 space-y-4">
              {/* First name */}
              <div>
                <label className="lead-capture-label" htmlFor="lc-first-name">
                  {labels.firstNameLabel}
                </label>
                <input
                  id="lc-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="chat-input mt-1 w-full px-4 py-3 text-sm"
                  style={{ minHeight: "44px" }}
                />
              </div>

              {/* Last name */}
              <div>
                <label className="lead-capture-label" htmlFor="lc-last-name">
                  {labels.lastNameLabel}
                </label>
                <input
                  id="lc-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="chat-input mt-1 w-full px-4 py-3 text-sm"
                  style={{ minHeight: "44px" }}
                />
              </div>

              {/* Language toggle */}
              <div>
                <label className="lead-capture-label">
                  {labels.languageLabel}
                </label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    className={`lead-capture-lang-btn ${selectedLanguage === "en" ? "lead-capture-lang-btn-active" : ""}`}
                    onClick={() => setSelectedLanguage("en")}
                  >
                    <span>{FLAG_EN}</span> {labels.languageEn}
                  </button>
                  <button
                    type="button"
                    className={`lead-capture-lang-btn ${selectedLanguage === "de" ? "lead-capture-lang-btn-active" : ""}`}
                    onClick={() => setSelectedLanguage("de")}
                  >
                    <span>{FLAG_DE}</span> {labels.languageDe}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="lead-capture-label" htmlFor="lc-phone">
                  {labels.phoneLabel}
                </label>
                <input
                  id="lc-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(normalizePhoneInput(e.target.value))}
                  placeholder={labels.phonePlaceholder}
                  className="chat-input mt-1 w-full px-4 py-3 text-sm"
                  style={{ minHeight: "44px" }}
                />
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {labels.phoneHint}
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="lead-capture-label" htmlFor="lc-email">
                  {labels.emailLabel}
                </label>
                <input
                  id="lc-email"
                  type="email"
                  autoComplete="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={labels.emailPlaceholder}
                  className="chat-input mt-1 w-full px-4 py-3 text-sm"
                  style={{ minHeight: "44px" }}
                />
              </div>
            </div>

            {/* Privacy note */}
            <p
              className="mt-4 text-xs leading-relaxed"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {labels.privacyNote}
            </p>

            {errorMessage && (
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: "var(--color-error)" }}
              >
                {errorMessage}
              </p>
            )}

            {/* CTAs */}
            <div className="mt-6">
              <Button
                type="button"
                className="btn-accent h-12 px-6 w-full gap-2 text-base font-semibold"
                onClick={() => void handleRequestCode()}
                disabled={isSubmitting || !isFormValid}
              >
                <Phone className="w-4 h-4" />
                {isSubmitting ? labels.submittingLabel : labels.submitLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {labels.bookDemoSeparator}
                </span>
                <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
              </div>

              <Button
                type="button"
                className="btn-primary h-11 px-6 w-full mt-3"
                asChild
              >
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackLandingEvent({
                      eventName: "onboarding.funnel.activation",
                      metadata: {
                        ctaId: "lead_capture_book_demo",
                        ctaGroup: "lead_capture",
                        ctaPlacement: "lead_capture_modal",
                        ctaIntent: "founder_demo",
                        destination: founderDemoUrl,
                      },
                    })
                  }
                >
                  {labels.bookDemoLabel}
                </a>
              </Button>
            </div>
          </>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STATE: OTP VERIFICATION                                            */}
        {/* ----------------------------------------------------------------- */}
        {modalState === "otp" && (
          <>
            <h3
              id="lead-capture-title"
              className="text-xl md:text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {labels.otpTitle}
            </h3>
            <p
              className="mt-3 text-sm md:text-base leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {labels.otpBody}{" "}
              <strong style={{ color: "var(--color-text)" }}>{phoneMasked}</strong>
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={labels.otpPlaceholder}
              className="chat-input mt-6 w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.3em]"
              style={{ minHeight: "56px", letterSpacing: "0.3em" }}
            />

            {errorMessage && (
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: "var(--color-error)" }}
              >
                {errorMessage}
              </p>
            )}

            <div className="mt-6">
              <Button
                type="button"
                className="btn-accent h-12 px-6 w-full gap-2 text-base font-semibold"
                onClick={() => void handleVerify()}
                disabled={isSubmitting || otpCode.length < 4}
              >
                <Phone className="w-4 h-4" />
                {isSubmitting ? labels.otpVerifying : labels.otpVerify}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="text-sm underline"
                style={{
                  color:
                    resendCooldown > 0
                      ? "var(--color-text-tertiary)"
                      : "var(--color-accent)",
                  cursor: resendCooldown > 0 ? "default" : "pointer",
                }}
                onClick={() => void handleResendCode()}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `${labels.otpResendIn} ${resendCooldown}s`
                  : labels.otpResend}
              </button>

              <button
                type="button"
                className="text-sm underline"
                style={{ color: "var(--color-text-secondary)" }}
                onClick={() => {
                  setModalState("form")
                  setOtpCode("")
                  setErrorMessage(null)
                }}
              >
                {labels.otpDifferentNumber}
              </button>
            </div>
          </>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STATE: CALLING                                                     */}
        {/* ----------------------------------------------------------------- */}
        {modalState === "calling" && (
          <>
            <div className="flex justify-center mb-6">
              <div className="lead-capture-calling-icon">
                <Phone className="w-8 h-8" />
              </div>
            </div>

            <h3
              id="lead-capture-title"
              className="text-xl md:text-2xl font-bold text-center"
              style={{ color: "var(--color-text)" }}
            >
              {labels.callingTitle}
            </h3>
            <p
              className="mt-3 text-sm md:text-base leading-relaxed text-center"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {labels.callingBody}{" "}
              <strong style={{ color: "var(--color-text)" }}>
                {agent.personaName}
              </strong>.
            </p>
            <p
              className="mt-2 text-sm text-center"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {labels.callingConfirmation}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button
                type="button"
                className="btn-primary h-11 px-6 w-full"
                asChild
              >
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {labels.bookDemoLabel}
                </a>
              </Button>
              <Button
                type="button"
                className="btn-primary h-11 px-6 w-full"
                onClick={onClose}
              >
                {labels.closeLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
