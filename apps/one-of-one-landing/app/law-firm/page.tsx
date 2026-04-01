"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { LandingAnalyticsEntrypoint } from "@/components/landing-analytics-entrypoint"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { lawFirmTranslations } from "@/content/law-firm-content"
import { trackLandingEvent } from "@/lib/analytics"
import { resolveLegacyPublicCutoverMode } from "@/lib/commercial-cutover"
import { Footer } from "@/components/footer"
import { LeadCaptureModal, type LeadCaptureModalLabels } from "@/components/lead-capture-modal"
import { AgentTileExpanded, CHANNEL_ICONS, type AgentTileData, type AgentTileLabels } from "@/components/agent-tile-expanded"
import { WorkflowChain, EscalationTree, type WorkflowStep, type EscalationRule } from "@/components/workflow-visualization"
import {
  Phone,
  CalendarDays,
  ArrowRight,
  ChevronDown,
  Play,
  Pause,
  Star,
  FileText,
  Zap,
  Shield,
  Lock,
  Scale,
  Loader2,
  Briefcase,
  Users,
  Home,
  AlertTriangle,
  Mail,
  Cloud,
  Server,
} from "lucide-react"

const FOUNDER_DEMO_URLS: Record<Language, string> = {
  en: "https://cal.com/voundbrand/sevenlayers-demo-en",
  de: "https://cal.com/voundbrand/sevenlayers-demo-de",
}
const DIAGNOSTIC_SECTION_ID = "diagnostic"

const PRACTICE_AREA_WORKFLOWS: Record<string, WorkflowStep[]> = {
  "clara-arbeitsrecht": [
    { label: "Call answered" },
    { label: "Labor law identified" },
    { label: "Deadline flagged" },
    { label: "Urgency assessed" },
    { label: "Calendar booked" },
    { label: "Case file sent" },
    { label: "SMS confirmation" },
  ],
  "clara-familienrecht": [
    { label: "Call handled" },
    { label: "Caller stabilized" },
    { label: "DV screening" },
    { label: "Facts captured" },
    { label: "Specialist booked" },
    { label: "Case file sent" },
    { label: "DV escalation" },
  ],
  "clara-mietrecht": [
    { label: "Call answered" },
    { label: "Tenancy identified" },
    { label: "Deadline checked" },
    { label: "Defect documented" },
    { label: "Checklist created" },
    { label: "Calendar booked" },
    { label: "File + checklist sent" },
  ],
  "clara-strafrecht": [
    { label: "Emergency answered" },
    { label: "Criminal identified" },
    { label: "Situation assessed" },
    { label: "Facts captured" },
    { label: "Push to attorney" },
    { label: "Arrest: transfer" },
    { label: "Emergency documented" },
  ],
}

const PRACTICE_AREA_ESCALATIONS: Record<string, EscalationRule[]> = {
  "clara-arbeitsrecht": [
    { condition: "Deadline < 72h", action: "Emergency + push", severity: "critical" },
    { condition: "Severance case", action: "Negotiation priority", severity: "normal" },
  ],
  "clara-familienrecht": [
    { condition: "DV signal", action: "Immediate escalation", severity: "critical" },
    { condition: "Emergency motion", action: "Urgent + deadline", severity: "high" },
  ],
  "clara-mietrecht": [
    { condition: "Mold / health", action: "Immediate priority", severity: "critical" },
    { condition: "Utility < 30d", action: "Urgent objection", severity: "high" },
    { condition: "Eviction notice", action: "Deadline warning", severity: "high" },
  ],
  "clara-strafrecht": [
    { condition: "Arrest", action: "Direct transfer", severity: "critical" },
    { condition: "Summons", action: "Urgent + deadline", severity: "high" },
    { condition: "Search", action: "Push + all facts", severity: "high" },
  ],
}

export default function LawFirmLandingPage() {
  const [language, setLanguage] = useState<Language>("de")
  const t = lawFirmTranslations[language]
  const founderDemoUrl = FOUNDER_DEMO_URLS[language]
  const [expandedProofs, setExpandedProofs] = useState<string[]>([])
  const [expandedAgent, setExpandedAgent] = useState(false)
  const [selectedDemoAgent, setSelectedDemoAgent] = useState<AgentTileData | null>(null)
  const [activePracticeAreaIndex, setActivePracticeAreaIndex] = useState<number | null>(0)
  const [expandedPracticeAreas, setExpandedPracticeAreas] = useState<number[]>([])
  const [playingAgentKey, setPlayingAgentKey] = useState<string | null>(null)
  const [loadingAgentKey, setLoadingAgentKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voiceIntroObjectUrlCacheRef = useRef<Record<string, string>>({})
  const voiceIntroRequestIdRef = useRef(0)
  const legacyPublicCutoverMode = resolveLegacyPublicCutoverMode()

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  const trackDemoCtaClick = useCallback((ctaId: string, ctaPlacement: string, destinationUrl: string) => {
    trackLandingEvent({
      eventName: "onboarding.funnel.activation",
      metadata: {
        ctaId,
        ctaGroup: "book_demo",
        ctaPlacement,
        ctaIntent: "founder_demo",
        destination: destinationUrl,
        vertical: "law_firm",
      },
    })
  }, [])

  const toggleProof = useCallback((name: string) => {
    setExpandedProofs((current) => (
      current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name]
    ))
  }, [])

  const togglePracticeArea = useCallback((index: number) => {
    setActivePracticeAreaIndex((current) => (current === index ? null : index))
  }, [])

  const togglePracticeAreaExpand = useCallback((index: number) => {
    setExpandedPracticeAreas((current) =>
      current.includes(index) ? current.filter((n) => n !== index) : [...current, index]
    )
  }, [])

  const getVoiceIntroCacheKey = useCallback(
    (agentKey: string) => `${agentKey}:${language}`,
    [language],
  )

  const handlePlayVoice = useCallback(
    async (agentKey: string) => {
      try {
        if (playingAgentKey === agentKey) {
          voiceIntroRequestIdRef.current += 1
          audioRef.current?.pause()
          audioRef.current = null
          setPlayingAgentKey(null)
          return
        }
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
        const requestId = voiceIntroRequestIdRef.current + 1
        voiceIntroRequestIdRef.current = requestId
        const cacheKey = getVoiceIntroCacheKey(agentKey)
        let objectUrl = voiceIntroObjectUrlCacheRef.current[cacheKey] || null
        if (!objectUrl) {
          setLoadingAgentKey(agentKey)
          const response = await fetch(
            `/api/voice-intro?agentKey=${encodeURIComponent(agentKey)}&language=${encodeURIComponent(language)}`,
            { method: "GET", cache: "force-cache" },
          )
          if (!response.ok) throw new Error("Unable to load voice intro.")
          const contentType = response.headers.get("content-type") || ""
          if (!contentType.startsWith("audio/")) throw new Error("Voice intro did not return playable audio.")
          const audioBlob = await response.blob()
          objectUrl = URL.createObjectURL(audioBlob)
          voiceIntroObjectUrlCacheRef.current[cacheKey] = objectUrl
        }
        if (voiceIntroRequestIdRef.current !== requestId || !objectUrl) {
          setLoadingAgentKey(null)
          return
        }
        setLoadingAgentKey(null)
        const audio = new Audio(objectUrl)
        audioRef.current = audio
        setPlayingAgentKey(agentKey)
        audio.addEventListener("ended", () => { setPlayingAgentKey(null); audioRef.current = null })
        audio.addEventListener("error", () => { setPlayingAgentKey(null); audioRef.current = null })
        await audio.play()
        trackLandingEvent({
          eventName: "onboarding.funnel.activation",
          metadata: { ctaId: "agent_voice_intro", ctaGroup: "voice_intro", ctaPlacement: "agent_tile", agentKey, language, vertical: "law_firm" },
        })
      } catch (error) {
        console.error("[LawFirmVoiceIntro] Unable to play voice intro:", error)
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
        setLoadingAgentKey(null)
        setPlayingAgentKey(null)
      }
    },
    [getVoiceIntroCacheKey, language, playingAgentKey],
  )

  useEffect(() => {
    voiceIntroRequestIdRef.current += 1
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingAgentKey(null) }
    return () => {
      Object.values(voiceIntroObjectUrlCacheRef.current).forEach((u) => URL.revokeObjectURL(u))
      voiceIntroObjectUrlCacheRef.current = {}
    }
  }, [language])

  useEffect(() => (
    () => {
      voiceIntroRequestIdRef.current += 1
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      Object.values(voiceIntroObjectUrlCacheRef.current).forEach((u) => URL.revokeObjectURL(u))
      voiceIntroObjectUrlCacheRef.current = {}
    }
  ), [])

  const handleAgentPhoneCtaClick = useCallback((agent: AgentTileData) => {
    trackLandingEvent({
      eventName: "onboarding.funnel.activation",
      metadata: {
        ctaId: "agent_demo_phone_cta",
        ctaGroup: "agent_demo_call",
        ctaPlacement: "agent_tile",
        requestedAgentKey: agent.agentKey,
        requestedPersonaName: agent.personaName,
        requestedAgentName: agent.name,
        flowStep: "open_modal",
        vertical: "law_firm",
      },
    })
    setSelectedDemoAgent(agent)
  }, [])

  const agentTileLabels: AgentTileLabels = {
    skillsLabel: t.agentSkillsLabel,
    outcomesLabel: t.agentOutcomesLabel,
    voiceLabel: t.agentVoiceLabel,
    toneLabel: t.agentToneLabel,
    languagesLabel: t.agentLanguagesLabel,
    channelsLabel: t.agentChannelsLabel,
    expandLabel: t.agentExpandLabel,
    collapseLabel: t.agentCollapseLabel,
    languagesMoreLabel: t.agentLanguagesMore,
    languagesLessLabel: t.agentLanguagesLess,
    phoneAvailableLabel: t.agentPhoneAvailable,
  }

  const practiceAreaTileLabels: AgentTileLabels = {
    skillsLabel: t.practiceAreaWorkflowLabel,
    outcomesLabel: t.practiceAreaResultLabel,
    voiceLabel: t.practiceAreaAutomationLabel,
    toneLabel: t.practiceAreaEscalationLabel,
    languagesLabel: t.agentLanguagesLabel,
    channelsLabel: t.agentChannelsLabel,
    expandLabel: t.agentExpandLabel,
    collapseLabel: t.agentCollapseLabel,
    languagesMoreLabel: t.agentLanguagesMore,
    languagesLessLabel: t.agentLanguagesLess,
    phoneAvailableLabel: t.agentPhoneAvailable,
  }

  const otpActive = process.env.NEXT_PUBLIC_LEAD_CAPTURE_OTP_ACTIVE !== "false"

  const leadCaptureLabels: LeadCaptureModalLabels = {
    title: t.leadCaptureTitle,
    subtitle: t.leadCaptureSubtitle,
    salutationLabel: t.leadCaptureSalutationLabel,
    salutationMr: t.leadCaptureSalutationMr,
    salutationMrs: t.leadCaptureSalutationMrs,
    salutationNone: t.leadCaptureSalutationNone,
    titleLabel: t.leadCaptureTitleLabel,
    titleNone: t.leadCaptureTitleNone,
    titleDr: t.leadCaptureTitleDr,
    titleProf: t.leadCaptureTitleProf,
    titleProfDr: t.leadCaptureTitleProfDr,
    firstNameLabel: t.leadCaptureFirstName,
    lastNameLabel: t.leadCaptureLastName,
    languageLabel: t.leadCaptureLanguage,
    languageEn: t.leadCaptureLanguageEn,
    languageDe: t.leadCaptureLanguageDe,
    phoneLabel: t.leadCapturePhone,
    phonePlaceholder: t.leadCapturePhonePlaceholder,
    phoneHint: t.leadCapturePhoneHint,
    emailLabel: t.leadCaptureEmail,
    emailPlaceholder: t.leadCaptureEmailPlaceholder,
    submitLabel: otpActive ? t.leadCaptureSubmit : t.leadCaptureSubmitDirect,
    submittingLabel: otpActive ? t.leadCaptureSubmitting : t.leadCaptureSubmittingDirect,
    bookDemoLabel: t.leadCaptureBookDemo,
    bookDemoSeparator: t.leadCaptureOr,
    privacyNote: otpActive ? t.leadCapturePrivacy : t.leadCapturePrivacyDirect,
    otpTitle: t.leadCaptureOtpTitle,
    otpBody: t.leadCaptureOtpBody,
    otpPlaceholder: t.leadCaptureOtpPlaceholder,
    otpVerify: t.leadCaptureOtpVerify,
    otpVerifying: t.leadCaptureOtpVerifying,
    otpResend: t.leadCaptureOtpResend,
    otpResendIn: t.leadCaptureOtpResendIn,
    otpDifferentNumber: t.leadCaptureOtpDifferentNumber,
    otpInvalid: t.leadCaptureOtpInvalid,
    otpExpired: t.leadCaptureOtpExpired,
    callingTitle: t.leadCaptureCallingTitle,
    callingBody: t.leadCaptureCallingBody,
    callingConfirmation: t.leadCaptureCallingConfirmation,
    closeLabel: t.leadCaptureClose,
    errorLabel: t.leadCaptureError,
    rateLimitedLabel: t.leadCaptureRateLimited,
  }

  const sharedDemoPhoneNumber = process.env.NEXT_PUBLIC_LANDING_SHARED_DEMO_PHONE_NUMBER?.trim() || null
  const resolveDemoPhoneNumber = useCallback(
    (fallbackNumber: string) => sharedDemoPhoneNumber || fallbackNumber,
    [sharedDemoPhoneNumber]
  )

  const kanzleiAgent: AgentTileData = {
    agentKey: "clara",
    icon: Phone,
    name: t.agentName,
    headline: t.agentHeadline,
    desc: t.agentDesc,
    metric: t.agentMetric,
    personaName: t.agentPersonaName,
    avatarColor: "#E8520A",
    avatarSrc: "/images/clara-avatar.png",
    skills: [t.agentSkill1, t.agentSkill2, t.agentSkill3, t.agentSkill4, t.agentSkill5, t.agentSkill6],
    outcomes: [t.agentOutcome1, t.agentOutcome2, t.agentOutcome3],
    voiceDesc: t.agentVoiceDesc,
    toneDesc: t.agentToneDesc,
    channels: [
      { icon: CHANNEL_ICONS.phone, label: t.channelPhone },
    ],
    phoneNumber: resolveDemoPhoneNumber("+49 000 0000001"),
    phoneCta: t.agentPhoneCta,
    voiceIntroScript: t.agentVoiceIntroScript,
  }

  const practiceAreaAgents: AgentTileData[] = [
    {
      agentKey: "clara-arbeitsrecht",
      icon: Briefcase,
      name: t.practiceArea1Title,
      headline: t.practiceArea1Headline,
      desc: t.practiceArea1Desc,
      metric: t.practiceArea1Metric,
      personaName: t.practiceArea1Title,
      avatarColor: "#E8520A",
      skills: [
        t.practiceArea1Skill1,
        t.practiceArea1Skill2,
        t.practiceArea1Skill3,
        t.practiceArea1Skill4,
        t.practiceArea1Skill5,
        t.practiceArea1Skill6,
        t.practiceArea1Skill7,
      ],
      outcomes: [t.practiceArea1Outcome1, t.practiceArea1Outcome2, t.practiceArea1Outcome3],
      voiceDesc: t.practiceArea1VoiceDesc,
      toneDesc: t.practiceArea1ToneDesc,
      channels: [],
      voiceIntroScript: t.practiceArea1VoiceIntroScript,
    },
    {
      agentKey: "clara-familienrecht",
      icon: Users,
      name: t.practiceArea2Title,
      headline: t.practiceArea2Headline,
      desc: t.practiceArea2Desc,
      metric: t.practiceArea2Metric,
      personaName: t.practiceArea2Title,
      avatarColor: "#9333EA",
      skills: [
        t.practiceArea2Skill1,
        t.practiceArea2Skill2,
        t.practiceArea2Skill3,
        t.practiceArea2Skill4,
        t.practiceArea2Skill5,
        t.practiceArea2Skill6,
        t.practiceArea2Skill7,
      ],
      outcomes: [t.practiceArea2Outcome1, t.practiceArea2Outcome2, t.practiceArea2Outcome3],
      voiceDesc: t.practiceArea2VoiceDesc,
      toneDesc: t.practiceArea2ToneDesc,
      channels: [],
      voiceIntroScript: t.practiceArea2VoiceIntroScript,
    },
    {
      agentKey: "clara-mietrecht",
      icon: Home,
      name: t.practiceArea3Title,
      headline: t.practiceArea3Headline,
      desc: t.practiceArea3Desc,
      metric: t.practiceArea3Metric,
      personaName: t.practiceArea3Title,
      avatarColor: "#0891B2",
      skills: [
        t.practiceArea3Skill1,
        t.practiceArea3Skill2,
        t.practiceArea3Skill3,
        t.practiceArea3Skill4,
        t.practiceArea3Skill5,
        t.practiceArea3Skill6,
        t.practiceArea3Skill7,
      ],
      outcomes: [t.practiceArea3Outcome1, t.practiceArea3Outcome2, t.practiceArea3Outcome3],
      voiceDesc: t.practiceArea3VoiceDesc,
      toneDesc: t.practiceArea3ToneDesc,
      channels: [],
      voiceIntroScript: t.practiceArea3VoiceIntroScript,
    },
    {
      agentKey: "clara-strafrecht",
      icon: AlertTriangle,
      name: t.practiceArea4Title,
      headline: t.practiceArea4Headline,
      desc: t.practiceArea4Desc,
      metric: t.practiceArea4Metric,
      personaName: t.practiceArea4Title,
      avatarColor: "#DC2626",
      skills: [
        t.practiceArea4Skill1,
        t.practiceArea4Skill2,
        t.practiceArea4Skill3,
        t.practiceArea4Skill4,
        t.practiceArea4Skill5,
        t.practiceArea4Skill6,
        t.practiceArea4Skill7,
      ],
      outcomes: [t.practiceArea4Outcome1, t.practiceArea4Outcome2, t.practiceArea4Outcome3],
      voiceDesc: t.practiceArea4VoiceDesc,
      toneDesc: t.practiceArea4ToneDesc,
      channels: [],
      voiceIntroScript: t.practiceArea4VoiceIntroScript,
    },
  ]

  return (
    <div
      className="min-h-screen"
      data-legacy-cutover-mode={legacyPublicCutoverMode}
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <LandingAnalyticsEntrypoint />

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "var(--titlebar-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/sevenlayers-logo.png"
              alt="sevenlayers"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div className="logo-text leading-[1.1]" style={{ color: "var(--color-text)" }}>
              <div className="text-[19px] tracking-[0.45em] logo-text-seven">SEVEN</div>
              <div className="text-[14px] tracking-[0.653em] logo-text-layers">LAYERS</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <ThemeToggle />
            <Button asChild className="btn-primary text-xs h-8 px-4 hidden sm:inline-flex gap-1.5">
              <a
                href={founderDemoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDemoCtaClick("request_demo_header", "header", founderDemoUrl)}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {t.bookDemoShort}
              </a>
            </Button>
            <Button asChild className="btn-accent text-xs h-8 w-11 sm:w-auto sm:px-3">
              <a href={`#${DIAGNOSTIC_SECTION_ID}`} aria-label={t.claraDemoHeadline}>
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Demo</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: Hero */}
        <section className="py-20 md:py-32 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1] max-w-[18ch] mx-auto"
              style={{ color: "var(--color-text)" }}
            >
              {t.headline}
            </h1>
            <p
              className="mt-6 text-lg md:text-xl leading-relaxed text-balance max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.subheadline}
            </p>
            <p
              className="mt-4 text-base md:text-lg font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              {t.action}
            </p>
            <p
              className="mt-4 text-sm md:text-base leading-relaxed text-balance max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.actionHighlight}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="btn-primary h-11 px-6 w-full sm:w-auto gap-2">
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackDemoCtaClick("request_demo_hero", "hero", founderDemoUrl)}
                >
                  <CalendarDays className="w-4 h-4" />
                  {t.ctaButton}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
              <Button asChild className="btn-accent h-11 px-6 w-full sm:w-auto gap-2">
                <a href={`#${DIAGNOSTIC_SECTION_ID}`}>
                  <Phone className="w-4 h-4" />
                  {t.parallelPathsNote}
                </a>
              </Button>
            </div>
            <a
              href="#agent"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {t.heroAnchor}
              <ChevronDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* Section 2: The Problem */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-bold text-balance mb-10"
              style={{ color: "var(--color-text)" }}
            >
              {t.problemHeadline}
            </h2>
            <div className="space-y-8">
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--color-text)" }}>
                {t.problem1}
              </p>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--color-text)" }}>
                {t.problem2}
              </p>
              <p className="text-base md:text-lg font-medium" style={{ color: "var(--color-accent)" }}>
                {t.problem2emphasis}
              </p>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {t.problem3}
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Single Agent Showcase */}
        <section id="agent" className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-bold text-center mb-4"
              style={{ color: "var(--color-text)" }}
            >
              {t.agentSectionHeadline}
            </h2>
            <p
              className="text-base md:text-lg leading-relaxed text-center max-w-3xl mx-auto mb-12"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.agentSectionSubline}
            </p>

            <div
              className="rounded-lg"
              style={{ border: "2px solid var(--color-accent)", boxShadow: "0 0 0 1px var(--color-accent-subtle)" }}
            >
              <AgentTileExpanded
                agent={kanzleiAgent}
                labels={agentTileLabels}
                isExpanded={expandedAgent}
                onToggle={() => setExpandedAgent((v) => !v)}
                onPhoneCtaClick={handleAgentPhoneCtaClick}
                voiceIntroLabel={playingAgentKey === kanzleiAgent.agentKey ? t.agentVoiceIntroPlayingLabel : t.agentVoiceIntroLabel}
                isPlayingVoice={playingAgentKey === kanzleiAgent.agentKey}
                isLoadingVoice={loadingAgentKey === kanzleiAgent.agentKey}
                onPlayVoice={() => void handlePlayVoice(kanzleiAgent.agentKey)}
              />
            </div>

            {/* Practice area templates */}
            <div className="mt-12">
              <h3 className="text-lg md:text-xl font-semibold text-center mb-2" style={{ color: "var(--color-text)" }}>
                {t.practiceAreasHeadline}
              </h3>
              <p className="text-sm md:text-base text-center max-w-xl mx-auto mb-8" style={{ color: "var(--color-text-secondary)" }}>
                {t.practiceAreasSubline}
              </p>

              {/* 4-column compact cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {practiceAreaAgents.map((agent, i) => {
                  const isActive = activePracticeAreaIndex === i
                  return (
                    <div
                      key={agent.agentKey}
                      role="button"
                      tabIndex={0}
                      className="proof-block p-5 text-left transition-all cursor-pointer"
                      style={{
                        border: isActive ? `2px solid ${agent.avatarColor}` : undefined,
                        outline: "none",
                      }}
                      onClick={() => togglePracticeArea(i)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePracticeArea(i) } }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: agent.avatarColor }}
                        >
                          <agent.icon className="w-6 h-6" />
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors shrink-0"
                          style={{
                            backgroundColor: "var(--btn-secondary-bg)",
                            color: "var(--btn-secondary-text)",
                            border: "1px solid var(--btn-secondary-border)",
                          }}
                          disabled={loadingAgentKey === agent.agentKey}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handlePlayVoice(agent.agentKey)
                          }}
                        >
                          {loadingAgentKey === agent.agentKey ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : playingAgentKey === agent.agentKey ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">{t.practiceAreaListenLabel}</span>
                        </button>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: agent.avatarColor }}>
                        {agent.name}
                      </p>
                      <h4 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>
                        {agent.headline}
                      </h4>
                      <p className="text-xs font-bold" style={{ color: agent.avatarColor }}>
                        {agent.metric}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Expanded tile below the grid */}
              {activePracticeAreaIndex !== null && practiceAreaAgents[activePracticeAreaIndex] && (() => {
                const activeAgent = practiceAreaAgents[activePracticeAreaIndex]
                const wfSteps = PRACTICE_AREA_WORKFLOWS[activeAgent.agentKey]
                const escRules = PRACTICE_AREA_ESCALATIONS[activeAgent.agentKey]
                return (
                  <div className="mt-4">
                    <AgentTileExpanded
                      agent={activeAgent}
                      labels={practiceAreaTileLabels}
                      isExpanded={expandedPracticeAreas.includes(activePracticeAreaIndex)}
                      onToggle={() => togglePracticeAreaExpand(activePracticeAreaIndex)}
                      onPhoneCtaClick={handleAgentPhoneCtaClick}
                      showLanguages={false}
                      voiceIntroLabel={t.practiceAreaListenLabel}
                      isPlayingVoice={playingAgentKey === activeAgent.agentKey}
                      isLoadingVoice={loadingAgentKey === activeAgent.agentKey}
                      onPlayVoice={() => void handlePlayVoice(activeAgent.agentKey)}
                      voiceVisual={
                        wfSteps ? (
                          <WorkflowChain steps={wfSteps} color={activeAgent.avatarColor} />
                        ) : undefined
                      }
                      toneVisual={
                        escRules ? (
                          <EscalationTree rules={escRules} />
                        ) : undefined
                      }
                    />
                  </div>
                )
              })()}
            </div>
          </div>
        </section>

        {/* Section 4: Clara Demo CTA */}
        <section
          id={DIAGNOSTIC_SECTION_ID}
          className="py-16 md:py-24 px-4 md:px-8"
        >
          <div className="max-w-4xl mx-auto text-center">
            <div
              className="w-24 h-24 rounded-full overflow-hidden border-2 mx-auto mb-6"
              style={{ borderColor: "#E8520A" }}
            >
              <Image
                src="/images/clara-avatar.png"
                alt="Clara"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>
              {t.claraDemoHeadline}
            </h2>
            <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
              {t.claraDemoSubline}
            </p>
            <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "var(--color-text-tertiary)" }}>
              {t.claraDemoExplainer}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                className="btn-accent h-11 px-6 w-full sm:w-auto gap-2"
                onClick={() => handleAgentPhoneCtaClick(kanzleiAgent)}
              >
                <Phone className="w-4 h-4" />
                {t.claraDemoCtaPrimary}
              </Button>
              <Button asChild className="btn-primary h-11 px-6 w-full sm:w-auto gap-2">
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackDemoCtaClick("book_demo_clara_cta", "clara_cta_section", founderDemoUrl)}
                >
                  <CalendarDays className="w-4 h-4" />
                  {t.claraDemoCtaSecondary}
                </a>
              </Button>
            </div>

            {/* Legal safety trust signal */}
            <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--color-border)" }}>
              <h3 className="text-sm font-semibold text-center mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                {t.legalSafetyHeadline}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-6">
                {[
                  { icon: Scale, text: t.legalSafety1 },
                  { icon: FileText, text: t.legalSafety2 },
                  { icon: Mail, text: t.legalSafety3 },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-medium" style={{ color: "var(--color-accent)" }}>
                {t.legalSafetyTagline}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Social Proof — Kirsten */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.proofHeadline}
            </h2>

            {/* Kirsten — full-width featured */}
            <div className="proof-block max-w-3xl mx-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      backgroundColor: "var(--color-accent-subtle)",
                      border: "1.5px solid var(--color-accent)",
                      color: "var(--color-accent)",
                    }}
                  >
                    KH
                  </div>
                  <div>
                    <p className="font-semibold text-lg" style={{ color: "var(--color-text)" }}>Kirsten H&ouml;ner-March</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {t.kirstenDesc}
                    </p>
                  </div>
                </div>
                <Scale className="w-5 h-5 shrink-0 ml-2" style={{ color: "var(--color-accent)" }} />
              </div>
              <div className="flex items-center gap-8 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric1Label}</p>
                  <p className="text-lg" style={{ color: "var(--color-text)" }}>
                    <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric1Before}</span>{" "}
                    <span className="font-bold">&rarr; {t.kirstenMetric1After}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric2Label}</p>
                  <p className="text-lg" style={{ color: "var(--color-text)" }}>
                    <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric2Before}</span>{" "}
                    <span className="font-bold">&rarr; {t.kirstenMetric2After}</span>
                  </p>
                </div>
              </div>
              <p
                className={`text-sm leading-relaxed ${expandedProofs.includes("kirsten") ? "" : "line-clamp-3"}`}
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.kirstenDetail}
              </p>
              <button
                type="button"
                className="mt-2 flex items-center gap-1.5 text-xs transition-colors py-3"
                style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
                onClick={() => toggleProof("kirsten")}
              >
                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("kirsten") ? "rotate-90" : ""}`} />
                {expandedProofs.includes("kirsten") ? t.readLess : t.readMore}
              </button>
              {expandedProofs.includes("kirsten") && (
                <Link
                  href="/case-studies/kirsten-hoener-march"
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: "var(--color-accent)" }}
                >
                  {t.readFullCaseStudy}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <div className="mt-3 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4" fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Process */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-4" style={{ color: "var(--color-text)" }}>
              {t.processHeadline}
            </h2>
            <p className="text-base md:text-lg text-center mb-12 max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
              {t.processSubheadline}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: "01", title: t.processStep1Title, desc: t.processStep1Desc, icon: Phone },
                { step: "02", title: t.processStep2Title, desc: t.processStep2Desc, icon: FileText },
                { step: "03", title: t.processStep3Title, desc: t.processStep3Desc, icon: CalendarDays },
                { step: "04", title: t.processStep4Title, desc: t.processStep4Desc, icon: Zap },
              ].map((item, i) => (
                <div key={i} className="proof-block flex flex-col items-center text-center p-6">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-bold"
                    style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                  >
                    {item.step}
                  </div>
                  <item.icon className="w-5 h-5 mb-3" style={{ color: "var(--color-accent)" }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button asChild className="btn-primary h-11 px-8 gap-2">
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackDemoCtaClick("request_demo_process", "process", founderDemoUrl)}
                >
                  <CalendarDays className="w-4 h-4" />
                  {t.bookDemo}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>

            <p
              className="mt-12 text-center text-sm max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.personalNote} &mdash;{" "}
              <span style={{ color: "var(--color-text)" }}>Remington</span>
            </p>
          </div>
        </section>

        {/* Section 7: Compliance & Legal Safety */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>
                {t.complianceHeadline}
              </h2>
              <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
                {t.complianceSubline}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Scale, title: t.compliance1Title, desc: t.compliance1Desc },
                { icon: Shield, title: t.compliance2Title, desc: t.compliance2Desc },
                { icon: Users, title: t.compliance3Title, desc: t.compliance3Desc },
                { icon: Lock, title: t.compliance4Title, desc: t.compliance4Desc },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                      <item.icon className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{item.title}</h4>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Integrations */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>
                {t.integrationsHeadline}
              </h2>
              <p className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
                {t.integrationsSubline}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                    {t.integrationsCalendar}
                  </h4>
                </div>
                <div className="space-y-2">
                  {["Google Calendar", "Microsoft Outlook", "RA-MICRO Terminexport"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                    {t.integrationsCommunication}
                  </h4>
                </div>
                <div className="space-y-2">
                  {["Telefon (24/7)", "E-Mail-Benachrichtigung", "SMS-Bestätigung"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Law Firm Software */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                    {t.integrationsLawFirmSoftware}
                  </h4>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "RA-MICRO (CSV-Export)", soon: false },
                    { name: "DATEV", soon: true },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.soon ? "var(--color-text-tertiary)" : "var(--color-accent)" }} />
                      <span style={{ opacity: item.soon ? 0.6 : 1 }}>{item.name}</span>
                      {item.soon && <span className="text-[10px] uppercase" style={{ color: "var(--color-text-tertiary)" }}>{t.comingSoon}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: Privacy */}
        <section className="py-16 md:py-24 px-4 md:px-8" style={{ backgroundColor: "var(--color-surface)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>
                {t.privacyHeadline}
              </h2>
              <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
                {t.privacySubheadline}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Shield, title: t.cloudOption, desc: t.cloudOptionDesc },
                { icon: Lock, title: t.localOption, desc: t.localOptionDesc },
                { icon: Server, title: t.enterpriseOption, desc: t.enterpriseOptionDesc },
                { icon: Cloud, title: t.bringYourOwn, desc: t.bringYourOwnDesc },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                      <item.icon className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{item.title}</h4>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm max-w-xl mx-auto" style={{ color: "var(--color-text-tertiary)" }}>
              {t.privacyTagline}
            </p>
          </div>
        </section>
      </main>

      <LeadCaptureModal
        agent={selectedDemoAgent}
        labels={leadCaptureLabels}
        language={language}
        founderDemoUrl={founderDemoUrl}
        isOpen={Boolean(selectedDemoAgent)}
        onClose={() => setSelectedDemoAgent(null)}
        otpActive={otpActive}
      />

      <Footer language={language} />
    </div>
  )
}
