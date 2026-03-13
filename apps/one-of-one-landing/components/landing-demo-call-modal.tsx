"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Phone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackLandingEvent } from "@/lib/analytics"
import { formatPhoneForTel } from "@/lib/demo-call"

type DemoCallAgent = {
  agentKey: string
  name: string
  personaName: string
  phoneNumber?: string
}

type LandingDemoCallModalLabels = {
  title: string
  bodyIntro: string
  phoneLabel: string
  phonePlaceholder: string
  privacyNote: string
  submitLabel: string
  submittingLabel: string
  readyEyebrow: string
  readyTitlePrefix: string
  readyBody: string
  callNowLabel: string
  resetLabel: string
  closeLabel: string
  errorLabel: string
}

function normalizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s().-]/g, "")
}

export function LandingDemoCallModal({
  agent,
  labels,
  isOpen,
  onClose,
}: {
  agent: DemoCallAgent | null
  labels: LandingDemoCallModalLabels
  isOpen: boolean
  onClose: () => void
}) {
  const [phoneInput, setPhoneInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  useEffect(() => {
    if (!isOpen) {
      setPhoneInput("")
      setIsSubmitting(false)
      setIsReady(false)
      setErrorMessage(null)
      return
    }

    setPhoneInput("")
    setIsSubmitting(false)
    setIsReady(false)
    setErrorMessage(null)
  }, [isOpen, agent?.agentKey])

  const telHref = useMemo(() => {
    if (!agent?.phoneNumber) {
      return null
    }
    return `tel:${formatPhoneForTel(agent.phoneNumber)}`
  }, [agent?.phoneNumber])

  if (!isOpen || !agent) {
    return null
  }

  const handlePrepareCall = async () => {
    if (!agent.phoneNumber) {
      setErrorMessage(labels.errorLabel)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/demo-call/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callerPhone: phoneInput,
          requestedAgentKey: agent.agentKey,
          requestedAgentName: agent.name,
          requestedPersonaName: agent.personaName,
          language: document.documentElement.lang || "en",
          landingPath:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/",
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || labels.errorLabel)
      }

      trackLandingEvent({
        eventName: "onboarding.funnel.activation",
        metadata: {
          ctaId: "agent_demo_prepare_call",
          ctaGroup: "agent_demo_call",
          ctaPlacement: "agent_tile_modal",
          requestedAgentKey: agent.agentKey,
          requestedPersonaName: agent.personaName,
          flowStep: "prepared",
        },
      })

      setIsReady(true)
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : labels.errorLabel
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCallNowClick = () => {
    trackLandingEvent({
      eventName: "onboarding.funnel.activation",
      metadata: {
        ctaId: "agent_demo_call_now",
        ctaGroup: "agent_demo_call",
        ctaPlacement: "agent_tile_modal",
        requestedAgentKey: agent.agentKey,
        requestedPersonaName: agent.personaName,
        flowStep: "dial",
      },
    })
  }

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
        aria-labelledby="landing-demo-call-title"
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

        {!isReady ? (
          <>
            <p className="demo-call-modal-kicker">{agent.name}</p>
            <h3
              id="landing-demo-call-title"
              className="text-xl md:text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {labels.title}
            </h3>
            <p
              className="mt-3 text-sm md:text-base leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {labels.bodyIntro} <strong style={{ color: "var(--color-text)" }}>{agent.personaName}</strong>.
            </p>

            <label
              className="mt-6 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-tertiary)" }}
              htmlFor="landing-demo-call-phone"
            >
              {labels.phoneLabel}
            </label>
            <input
              id="landing-demo-call-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(event) => setPhoneInput(normalizePhoneInput(event.target.value))}
              placeholder={labels.phonePlaceholder}
              className="chat-input mt-2 w-full px-4 py-3 text-sm"
              style={{ minHeight: "48px" }}
            />

            <p
              className="mt-3 text-xs leading-relaxed"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {labels.privacyNote}
            </p>

            {errorMessage && (
              <p
                className="mt-4 text-sm font-medium"
                style={{ color: "var(--color-error)" }}
              >
                {errorMessage}
              </p>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="btn-accent h-11 px-6 w-full sm:w-auto gap-2"
                onClick={() => void handlePrepareCall()}
                disabled={isSubmitting || phoneInput.trim().length === 0}
              >
                <Phone className="w-4 h-4" />
                {isSubmitting ? labels.submittingLabel : labels.submitLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                className="btn-primary h-11 px-6 w-full sm:w-auto"
                onClick={onClose}
              >
                {labels.closeLabel}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="demo-call-modal-kicker">{labels.readyEyebrow}</p>
            <h3
              id="landing-demo-call-title"
              className="text-xl md:text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {labels.readyTitlePrefix} {agent.personaName}
            </h3>
            <p
              className="mt-3 text-sm md:text-base leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {labels.readyBody}
            </p>

            <div className="demo-call-modal-number mt-6">
              <Phone className="w-4 h-4" />
              <span>{agent.phoneNumber}</span>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {telHref ? (
                <Button asChild className="btn-accent h-11 px-6 w-full sm:w-auto gap-2">
                  <a href={telHref} onClick={handleCallNowClick}>
                    <Phone className="w-4 h-4" />
                    {labels.callNowLabel}
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                className="btn-primary h-11 px-6 w-full sm:w-auto"
                onClick={() => {
                  setIsReady(false)
                  setErrorMessage(null)
                }}
              >
                {labels.resetLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export type { LandingDemoCallModalLabels }
