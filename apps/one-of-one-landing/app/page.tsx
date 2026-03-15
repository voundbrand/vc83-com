"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import { AuditChatSurface } from "@/components/audit-chat-surface"

import { LandingAnalyticsEntrypoint } from "@/components/landing-analytics-entrypoint"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { landingTranslations } from "@/content/landing-content"

import { trackLandingEvent } from "@/lib/analytics"
import { resolveLegacyPublicCutoverMode } from "@/lib/commercial-cutover"
import { Footer } from "@/components/footer"
import { LeadCaptureModal, type LeadCaptureModalLabels } from "@/components/lead-capture-modal"
import Link from "next/link"
import {
  Apple,
  Monitor,
  Laptop,
  Smartphone,
  Globe,
  Phone,
  TrendingUp,
  MessageSquare,
  MessageCircle,
  Mail,
  Zap,
  Sparkles,
  Shield,
  Cloud,
  Server,
  Lock,
  CalendarDays,
  CalendarCheck,
  ArrowRight,
  ChevronDown,
  Play,
  Pause,
  Star,
  User,
  Users,
  FileText,
  Filter,
  Mic,
  BarChart3,
  Scale,
} from "lucide-react"
import { AgentTileExpanded, CHANNEL_ICONS, type AgentTileData, type AgentTileLabels } from "@/components/agent-tile-expanded"


const FOUNDER_DEMO_URLS: Record<Language, string> = {
  en: "https://cal.com/voundbrand/sevenlayers-demo-en",
  de: "https://cal.com/voundbrand/sevenlayers-demo-de",
}
const DIAGNOSTIC_SECTION_ID = "diagnostic"

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = landingTranslations[language]
  const founderDemoUrl = FOUNDER_DEMO_URLS[language]
  const avatarStorageId = process.env.NEXT_PUBLIC_REM_AVATAR_STORAGE_ID
  const [founderAvatarUrl, setFounderAvatarUrl] = useState<string | null>(null)
  const [expandedProofs, setExpandedProofs] = useState<string[]>([])
  const [expandedAgents, setExpandedAgents] = useState<number[]>([])
  const [activeFrontlineIndex, setActiveFrontlineIndex] = useState<number | null>(null)
  const [showSpecialists, setShowSpecialists] = useState(false)
  const [selectedDemoAgent, setSelectedDemoAgent] = useState<AgentTileData | null>(null)
  const [playingAgentKey, setPlayingAgentKey] = useState<string | null>(null)
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
      },
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const resolveAvatar = async () => {
      if (!avatarStorageId) return
      try {
        const response = await fetch(`/api/files/url?storageId=${encodeURIComponent(avatarStorageId)}`)
        if (!response.ok) return
        const payload = (await response.json()) as { url?: string | null }
        if (!cancelled) {
          setFounderAvatarUrl(payload.url || null)
        }
      } catch {
        if (!cancelled) {
          setFounderAvatarUrl(null)
        }
      }
    }

    void resolveAvatar()
    return () => {
      cancelled = true
    }
  }, [avatarStorageId])


  const toggleProof = useCallback((name: string) => {
    setExpandedProofs((current) => (
      current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name]
    ))
  }, [])

  const toggleAgent = useCallback((index: number) => {
    setExpandedAgents((current) => (
      current.includes(index)
        ? current.filter((n) => n !== index)
        : [...current, index]
    ))
  }, [])

  const toggleFrontlineAgent = useCallback((index: number) => {
    setActiveFrontlineIndex((current) => (current === index ? null : index))
  }, [])

  const getVoiceIntroCacheKey = useCallback(
    (agentKey: string) => `${agentKey}:${language}`,
    [language],
  )

  const handlePlayVoice = useCallback(
    async (agentKey: string) => {
      try {
        // If already playing this agent, stop
        if (playingAgentKey === agentKey) {
          voiceIntroRequestIdRef.current += 1
          audioRef.current?.pause()
          audioRef.current = null
          setPlayingAgentKey(null)
          return
        }

        // Stop any current playback
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }

        const requestId = voiceIntroRequestIdRef.current + 1
        voiceIntroRequestIdRef.current = requestId

        const cacheKey = getVoiceIntroCacheKey(agentKey)
        let objectUrl = voiceIntroObjectUrlCacheRef.current[cacheKey] || null
        if (!objectUrl) {
          const response = await fetch(
            `/api/voice-intro?agentKey=${encodeURIComponent(agentKey)}&language=${encodeURIComponent(language)}`,
            {
              method: "GET",
              cache: "force-cache",
            },
          )
          if (!response.ok) {
            throw new Error("Unable to load voice intro.")
          }

          const contentType = response.headers.get("content-type") || ""
          if (!contentType.startsWith("audio/")) {
            throw new Error("Voice intro did not return playable audio.")
          }

          const audioBlob = await response.blob()
          objectUrl = URL.createObjectURL(audioBlob)
          voiceIntroObjectUrlCacheRef.current[cacheKey] = objectUrl
        }

        if (voiceIntroRequestIdRef.current !== requestId || !objectUrl) {
          return
        }

        const audio = new Audio(objectUrl)
        audioRef.current = audio
        setPlayingAgentKey(agentKey)

        audio.addEventListener("ended", () => {
          setPlayingAgentKey(null)
          audioRef.current = null
        })

        audio.addEventListener("error", () => {
          setPlayingAgentKey(null)
          audioRef.current = null
        })

        await audio.play()

        trackLandingEvent({
          eventName: "onboarding.funnel.activation",
          metadata: {
            ctaId: "agent_voice_intro",
            ctaGroup: "voice_intro",
            ctaPlacement: "agent_tile",
            agentKey,
            language,
          },
        })
      } catch (error) {
        console.error("[LandingVoiceIntro] Unable to play voice intro:", error)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
        setPlayingAgentKey(null)
      }
    },
    [getVoiceIntroCacheKey, language, playingAgentKey],
  )

  // Stop audio when language changes
  useEffect(() => {
    voiceIntroRequestIdRef.current += 1
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingAgentKey(null)
    }

    return () => {
      Object.values(voiceIntroObjectUrlCacheRef.current).forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl)
      })
      voiceIntroObjectUrlCacheRef.current = {}
    }
  }, [language])

  useEffect(() => (
    () => {
      voiceIntroRequestIdRef.current += 1
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      Object.values(voiceIntroObjectUrlCacheRef.current).forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl)
      })
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

  const otpActive = process.env.NEXT_PUBLIC_LEAD_CAPTURE_OTP_ACTIVE !== "false"

  const leadCaptureLabels: LeadCaptureModalLabels = {
    title: t.leadCaptureTitle,
    subtitle: t.leadCaptureSubtitle,
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

  // Replace placeholder phone numbers with real ElevenLabs agent numbers once provisioned.
  // Format: E.164 international format (e.g. "+4930123456789")
  const agents: AgentTileData[] = [
    {
      agentKey: "clara",
      icon: Phone,
      name: t.agent1Name,
      headline: t.agent1Headline,
      desc: t.agent1Desc,
      metric: t.agent1Metric,
      personaName: t.agent1PersonaName,
      avatarColor: "#E8520A",
      avatarSrc: "/images/clara-avatar.png",
      skills: [t.agent1Skill1, t.agent1Skill2, t.agent1Skill3, t.agent1Skill4, t.agent1Skill5, t.agent1Skill6],
      outcomes: [t.agent1Outcome1, t.agent1Outcome2, t.agent1Outcome3],
      voiceDesc: t.agent1VoiceDesc,
      toneDesc: t.agent1ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.phone, label: t.channelPhone },
        { icon: CHANNEL_ICONS.whatsapp, label: t.channelWhatsApp },
        { icon: CHANNEL_ICONS.webchat, label: t.channelWebChat },
        { icon: CHANNEL_ICONS.sms, label: t.channelSMS },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000001"),
      phoneCta: t.agent1PhoneCta,
      voiceIntroScript: t.agent1VoiceIntroScript,
    },
    {
      agentKey: "maren",
      icon: CalendarCheck,
      name: t.agent2Name,
      headline: t.agent2Headline,
      desc: t.agent2Desc,
      metric: t.agent2Metric,
      personaName: t.agent2PersonaName,
      avatarColor: "#722F37",
      avatarSrc: "/images/maren-avatar.png",
      skills: [t.agent2Skill1, t.agent2Skill2, t.agent2Skill3, t.agent2Skill4, t.agent2Skill5],
      outcomes: [t.agent2Outcome1, t.agent2Outcome2, t.agent2Outcome3],
      voiceDesc: t.agent2VoiceDesc,
      toneDesc: t.agent2ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.phone, label: t.channelPhone },
        { icon: CHANNEL_ICONS.whatsapp, label: t.channelWhatsApp },
        { icon: CHANNEL_ICONS.webchat, label: t.channelWebChat },
        { icon: CHANNEL_ICONS.sms, label: t.channelSMS },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000002"),
      phoneCta: t.agent2PhoneCta,
      voiceIntroScript: t.agent2VoiceIntroScript,
    },
    {
      agentKey: "jonas",
      icon: Filter,
      name: t.agent3Name,
      headline: t.agent3Headline,
      desc: t.agent3Desc,
      metric: t.agent3Metric,
      personaName: t.agent3PersonaName,
      avatarColor: "#EAB308",
      avatarSrc: "/images/jonas-avatar.png",
      skills: [t.agent3Skill1, t.agent3Skill2, t.agent3Skill3, t.agent3Skill4, t.agent3Skill5],
      outcomes: [t.agent3Outcome1, t.agent3Outcome2, t.agent3Outcome3],
      voiceDesc: t.agent3VoiceDesc,
      toneDesc: t.agent3ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.phone, label: t.channelPhone },
        { icon: CHANNEL_ICONS.email, label: t.channelEmail },
        { icon: CHANNEL_ICONS.webchat, label: t.channelWebChat },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000003"),
      phoneCta: t.agent3PhoneCta,
      voiceIntroScript: t.agent3VoiceIntroScript,
    },
    {
      agentKey: "tobias",
      icon: Mic,
      name: t.agent4Name,
      headline: t.agent4Headline,
      desc: t.agent4Desc,
      metric: t.agent4Metric,
      personaName: t.agent4PersonaName,
      avatarColor: "#9333EA",
      avatarSrc: "/images/tobias-avatar.png",
      skills: [t.agent4Skill1, t.agent4Skill2, t.agent4Skill3, t.agent4Skill4, t.agent4Skill5],
      outcomes: [t.agent4Outcome1, t.agent4Outcome2, t.agent4Outcome3],
      voiceDesc: t.agent4VoiceDesc,
      toneDesc: t.agent4ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.phone, label: t.channelPhone },
        { icon: CHANNEL_ICONS.whatsapp, label: t.channelWhatsApp },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000004"),
      phoneCta: t.agent4PhoneCta,
      voiceIntroScript: t.agent4VoiceIntroScript,
    },
    {
      agentKey: "lina",
      icon: MessageCircle,
      name: t.agent5Name,
      headline: t.agent5Headline,
      desc: t.agent5Desc,
      metric: t.agent5Metric,
      personaName: t.agent5PersonaName,
      avatarColor: "#D97706",
      avatarSrc: "/images/lina-avatar.png",
      skills: [t.agent5Skill1, t.agent5Skill2, t.agent5Skill3, t.agent5Skill4, t.agent5Skill5, t.agent5Skill6],
      outcomes: [t.agent5Outcome1, t.agent5Outcome2, t.agent5Outcome3],
      voiceDesc: t.agent5VoiceDesc,
      toneDesc: t.agent5ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.whatsapp, label: t.channelWhatsApp },
        { icon: CHANNEL_ICONS.email, label: t.channelEmail },
        { icon: CHANNEL_ICONS.sms, label: t.channelSMS },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000005"),
      phoneCta: t.agent5PhoneCta,
      voiceIntroScript: t.agent5VoiceIntroScript,
    },
    {
      agentKey: "kai",
      icon: Users,
      name: t.agent6Name,
      headline: t.agent6Headline,
      desc: t.agent6Desc,
      metric: t.agent6Metric,
      personaName: t.agent6PersonaName,
      avatarColor: "#0891B2",
      avatarSrc: "/images/kai-avatar.png",
      skills: [t.agent6Skill1, t.agent6Skill2, t.agent6Skill3, t.agent6Skill4, t.agent6Skill5],
      outcomes: [t.agent6Outcome1, t.agent6Outcome2, t.agent6Outcome3],
      voiceDesc: t.agent6VoiceDesc,
      toneDesc: t.agent6ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.webchat, label: t.channelWebChat },
        { icon: CHANNEL_ICONS.sms, label: t.channelSMS },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000006"),
      phoneCta: t.agent6PhoneCta,
      voiceIntroScript: t.agent6VoiceIntroScript,
    },
    {
      agentKey: "nora",
      icon: BarChart3,
      name: t.agent7Name,
      headline: t.agent7Headline,
      desc: t.agent7Desc,
      metric: t.agent7Metric,
      personaName: t.agent7PersonaName,
      avatarColor: "#DC2626",
      avatarSrc: "/images/nora-avatar.png",
      skills: [t.agent7Skill1, t.agent7Skill2, t.agent7Skill3, t.agent7Skill4, t.agent7Skill5, t.agent7Skill6],
      outcomes: [t.agent7Outcome1, t.agent7Outcome2, t.agent7Outcome3],
      voiceDesc: t.agent7VoiceDesc,
      toneDesc: t.agent7ToneDesc,
      channels: [
        { icon: CHANNEL_ICONS.webchat, label: t.channelWebChat },
        { icon: CHANNEL_ICONS.api, label: t.channelAPI },
      ],
      phoneNumber: resolveDemoPhoneNumber("+49 000 0000007"),
      phoneCta: t.agent7PhoneCta,
      voiceIntroScript: t.agent7VoiceIntroScript,
    },
  ]

  return (
    <div
      className="min-h-screen"
      data-legacy-cutover-mode={legacyPublicCutoverMode}
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <LandingAnalyticsEntrypoint />

      {/* Header / Taskbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "var(--titlebar-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/sevenlayers-logo.png"
              alt="sevenlayers"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div
              className="logo-text leading-[1.1]"
              style={{ color: "var(--color-text)" }}
            >
              <div className="text-[19px] tracking-[0.45em] logo-text-seven">SEVEN</div>
              <div className="text-[14px] tracking-[0.653em] logo-text-layers">LAYERS</div>
            </div>
          </div>

          {/* Right side controls */}
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
              <a href="#diagnostic" aria-label={t.chatHeadline}>
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Audit</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: The Hook */}
        <section className="py-20 md:py-32 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1] max-w-[13ch] mx-auto"
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
                <a href="#diagnostic">
                  <MessageSquare className="w-4 h-4" />
                  {t.parallelPathsNote}
                </a>
              </Button>
            </div>
            <a
              href="#agents"
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
              <p
                className="text-base md:text-lg leading-relaxed"
                style={{ color: "var(--color-text)" }}
              >
                {t.problem1}
              </p>
              <p
                className="text-base md:text-lg leading-relaxed"
                style={{ color: "var(--color-text)" }}
              >
                {t.problem2}
              </p>
              <p
                className="text-base md:text-lg font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                {t.problem2emphasis}
              </p>
              <p
                className="text-base md:text-lg leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.problem3}
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Clara + Agent Team — Tiered Layout */}
        <section id="agents" className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-bold text-center mb-4"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift1}
            </h2>
            <p
              className="text-base md:text-lg leading-relaxed text-center max-w-3xl mx-auto mb-12"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.shift2}
            </p>

            {/* Clara — featured operator tile */}
            <div className="mb-10">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-accent)" }}
              >
                {t.agentSectionOperatorEyebrow}
              </p>
              <div
                className="rounded-lg"
                style={{ border: "2px solid var(--color-accent)", boxShadow: "0 0 0 1px var(--color-accent-subtle)" }}
              >
                <AgentTileExpanded
                  agent={agents[0]}
                  labels={agentTileLabels}
                  isExpanded={expandedAgents.includes(0)}
                  onToggle={() => toggleAgent(0)}
                  onPhoneCtaClick={handleAgentPhoneCtaClick}
                  voiceIntroLabel={playingAgentKey === agents[0].agentKey ? t.agentVoiceIntroPlayingLabel : t.agentVoiceIntroLabel}
                  isPlayingVoice={playingAgentKey === agents[0].agentKey}
                  onPlayVoice={() => void handlePlayVoice(agents[0].agentKey)}
                />
              </div>
            </div>

            {/* Frontline team — compact card grid */}
            <div className="mb-10">
              <h3
                className="text-lg md:text-xl font-semibold mb-2"
                style={{ color: "var(--color-text)" }}
              >
                {t.agentSectionFrontlineHeadline}
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.agentSectionFrontlineSubline}
              </p>

              {/* 3-column compact cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {agents.slice(1, 4).map((agent, offset) => {
                  const i = offset + 1
                  const isActive = activeFrontlineIndex === i
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      className="proof-block p-5 text-left transition-all cursor-pointer"
                      style={{
                        border: isActive ? "2px solid var(--color-accent)" : undefined,
                        outline: "none",
                      }}
                      onClick={() => toggleFrontlineAgent(i)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFrontlineAgent(i) } }}
                    >
                      {/* Avatar + play button row */}
                      <div className="flex items-start justify-between mb-3">
                        {agent.avatarSrc ? (
                          <div
                            className="w-12 h-12 rounded-full overflow-hidden border-2"
                            style={{ borderColor: agent.avatarColor }}
                          >
                            <Image
                              src={agent.avatarSrc}
                              alt={agent.personaName}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: agent.avatarColor }}
                          >
                            {agent.personaName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
                          style={{
                            backgroundColor: "var(--btn-secondary-bg)",
                            color: "var(--btn-secondary-text)",
                            border: "1px solid var(--btn-secondary-border)",
                          }}
                          aria-label={playingAgentKey === agent.agentKey ? t.agentVoiceIntroPlayingLabel : t.agentVoiceIntroLabel}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handlePlayVoice(agent.agentKey)
                          }}
                        >
                          {playingAgentKey === agent.agentKey ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {/* Type label */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <agent.icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-accent)" }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
                          {agent.name}
                        </span>
                      </div>
                      {/* Name + headline */}
                      <h4 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>
                        {agent.personaName}
                      </h4>
                      <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--color-text-secondary)" }}>
                        {agent.headline}
                      </p>
                      {/* Metric */}
                      <p className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                        {agent.metric}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Expanded tile below the grid */}
              {activeFrontlineIndex !== null && agents[activeFrontlineIndex] && (
                <div className="mt-4">
                  <AgentTileExpanded
                    agent={agents[activeFrontlineIndex]}
                    labels={agentTileLabels}
                    isExpanded={expandedAgents.includes(activeFrontlineIndex)}
                    onToggle={() => toggleAgent(activeFrontlineIndex)}
                    onPhoneCtaClick={handleAgentPhoneCtaClick}
                    voiceIntroLabel={playingAgentKey === agents[activeFrontlineIndex].agentKey ? t.agentVoiceIntroPlayingLabel : t.agentVoiceIntroLabel}
                    isPlayingVoice={playingAgentKey === agents[activeFrontlineIndex].agentKey}
                    onPlayVoice={() => void handlePlayVoice(agents[activeFrontlineIndex].agentKey)}
                  />
                </div>
              )}
            </div>

            {/* Specialist layer — Tobias, Kai, Nora */}
            <div>
              <button
                type="button"
                className="w-full flex items-center justify-between py-4 px-1 transition-colors cursor-pointer group"
                onClick={() => setShowSpecialists((v) => !v)}
              >
                <div>
                  <h3
                    className="text-lg md:text-xl font-semibold text-left"
                    style={{ color: "var(--color-text)" }}
                  >
                    {t.agentSectionSpecialistHeadline}
                  </h3>
                  <p
                    className="text-sm text-left mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.agentSectionSpecialistSubline}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {/* Avatar previews */}
                  <div className="hidden sm:flex items-center -space-x-2">
                    {agents.slice(4).map((agent) => (
                      agent.avatarSrc ? (
                        <div
                          key={agent.agentKey}
                          className="w-7 h-7 rounded-full overflow-hidden border-2 bg-[var(--color-bg)]"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Image
                            src={agent.avatarSrc}
                            alt={agent.personaName}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          key={agent.agentKey}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2"
                          style={{ backgroundColor: agent.avatarColor, borderColor: "var(--color-bg)" }}
                        >
                          {agent.personaName.charAt(0)}
                        </div>
                      )
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    {showSpecialists ? t.agentSectionSpecialistToggleHide : t.agentSectionSpecialistToggleShow}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showSpecialists ? "rotate-180" : ""}`}
                    />
                  </span>
                </div>
              </button>

              {showSpecialists && (
                <div className="space-y-4 mt-4">
                  {agents.slice(4).map((agent, offset) => {
                    const i = offset + 4
                    return (
                      <AgentTileExpanded
                        key={i}
                        agent={agent}
                        labels={agentTileLabels}
                        isExpanded={expandedAgents.includes(i)}
                        onToggle={() => toggleAgent(i)}
                        onPhoneCtaClick={handleAgentPhoneCtaClick}
                        voiceIntroLabel={playingAgentKey === agent.agentKey ? t.agentVoiceIntroPlayingLabel : t.agentVoiceIntroLabel}
                        isPlayingVoice={playingAgentKey === agent.agentKey}
                        onPlayVoice={() => void handlePlayVoice(agent.agentKey)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: The Embedded Chat */}
        <section
          id={DIAGNOSTIC_SECTION_ID}
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2
                className="text-2xl md:text-3xl font-semibold text-balance"
                style={{ color: "var(--color-text)" }}
              >
                {t.chatHeadline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-xl mx-auto"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.chatSubheadline}
              </p>
            </div>
            <AuditChatSurface preferredLanguage={language} />
            <div className="path-card mt-6 max-w-2xl w-full mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {t.bookDemoHeadline}
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {t.bookDemoText}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className="w-[72px] h-[72px] rounded-full overflow-hidden border flex items-center justify-center"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-hover)" }}
                >
                  {founderAvatarUrl ? (
                    <Image
                      src={founderAvatarUrl}
                      alt="Remington S."
                      width={72}
                      height={72}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-8 h-8" style={{ color: "var(--color-text-tertiary)" }} />
                  )}
                </div>
                <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                  Remington S.
                </p>
                <Button asChild className="btn-accent text-sm h-11 px-4 gap-2">
                  <a
                    href={founderDemoUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackDemoCtaClick("book_demo_chat_bridge", "chat_bridge", founderDemoUrl)}
                  >
                    <CalendarDays className="w-4 h-4" />
                    {t.bookDemoShort}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: The Proof */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.proofHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Marcus Engel */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-subtle)",
                        border: "1.5px solid var(--color-accent)",
                        color: "var(--color-accent)",
                      }}
                    >
                      ME
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "var(--color-text)" }}>Marcus Engel</p>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {t.marcusEngelDesc}
                      </p>
                    </div>
                  </div>
                  <Phone className="w-5 h-5 shrink-0 ml-2" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.marcusEngelMetric1Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.marcusEngelMetric1Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.marcusEngelMetric1After}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.marcusEngelMetric2Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.marcusEngelMetric2Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.marcusEngelMetric2After}</span>
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed ${expandedProofs.includes("marcus-engel") ? "" : "line-clamp-3"}`}
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.marcusEngelDetail}
                </p>
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1.5 text-xs transition-colors py-3"
                  style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
                  onClick={() => toggleProof("marcus-engel")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("marcus-engel") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("marcus-engel") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("marcus-engel") && (
                  <Link
                    href="/case-studies/marcus-engel"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {t.readFullCaseStudy}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5" fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                  ))}
                </div>
                <p className="mt-3 text-xs font-medium italic" style={{ color: "var(--color-accent)" }}>
                  {t.marcusEngelScaleCallout}
                </p>
              </div>

              {/* Lutz Splettstößer */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-subtle)",
                        border: "1.5px solid var(--color-accent)",
                        color: "var(--color-accent)",
                      }}
                    >
                      LS
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "var(--color-text)" }}>Lutz Splettstö&szlig;er</p>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {t.lutzDesc}
                      </p>
                    </div>
                  </div>
                  <Shield className="w-5 h-5 shrink-0 ml-2" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.lutzMetric1Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.lutzMetric1Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.lutzMetric1After}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.lutzMetric2Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.lutzMetric2Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.lutzMetric2After}</span>
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed ${expandedProofs.includes("lutz") ? "" : "line-clamp-3"}`}
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.lutzDetail}
                </p>
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1.5 text-xs transition-colors py-3"
                  style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
                  onClick={() => toggleProof("lutz")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("lutz") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("lutz") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("lutz") && (
                  <Link
                    href="/case-studies/lutz-splettstosser"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {t.readFullCaseStudy}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5" fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                  ))}
                </div>
              </div>

              {/* Franziska Splettstößer */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-subtle)",
                        border: "1.5px solid var(--color-accent)",
                        color: "var(--color-accent)",
                      }}
                    >
                      FS
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "var(--color-text)" }}>Franziska Splettstö&szlig;er</p>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {t.franziskaDesc}
                      </p>
                    </div>
                  </div>
                  <CalendarDays className="w-5 h-5 shrink-0 ml-2" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.franziskaMetric1Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.franziskaMetric1Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.franziskaMetric1After}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.franziskaMetric2Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.franziskaMetric2Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.franziskaMetric2After}</span>
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed ${expandedProofs.includes("franziska") ? "" : "line-clamp-3"}`}
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.franziskaDetail}
                </p>
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1.5 text-xs transition-colors py-3"
                  style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
                  onClick={() => toggleProof("franziska")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("franziska") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("franziska") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("franziska") && (
                  <Link
                    href="/case-studies/franziska-splettstosser"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {t.readFullCaseStudy}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5" fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                  ))}
                </div>
              </div>

              {/* Thomas Berger — commented out until case study is confirmed
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-subtle)",
                        border: "1.5px solid var(--color-accent)",
                        color: "var(--color-accent)",
                      }}
                    >
                      TB
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "var(--color-text)" }}>Thomas Berger</p>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {t.thomasDesc}
                      </p>
                    </div>
                  </div>
                  <FileText className="w-5 h-5 shrink-0 ml-2" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.thomasMetric1Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.thomasMetric1Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.thomasMetric1After}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.thomasMetric2Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.thomasMetric2Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.thomasMetric2After}</span>
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed ${expandedProofs.includes("thomas") ? "" : "line-clamp-3"}`}
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.thomasDetail}
                </p>
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1.5 text-xs transition-colors py-3"
                  style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
                  onClick={() => toggleProof("thomas")}
                >
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expandedProofs.includes("thomas") ? "rotate-90" : ""}`} />
                  {expandedProofs.includes("thomas") ? t.readLess : t.readMore}
                </button>
                {expandedProofs.includes("thomas") && (
                  <Link
                    href="/case-studies/thomas-berger"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {t.readFullCaseStudy}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5" fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                  ))}
                </div>
              </div>
              */}

              {/* Kirsten Höner-March */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-subtle)",
                        border: "1.5px solid var(--color-accent)",
                        color: "var(--color-accent)",
                      }}
                    >
                      KH
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "var(--color-text)" }}>Kirsten H&ouml;ner-March</p>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {t.kirstenDesc}
                      </p>
                    </div>
                  </div>
                  <Scale className="w-5 h-5 shrink-0 ml-2" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric1Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric1Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.kirstenMetric1After}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric2Label}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>{t.kirstenMetric2Before}</span>{" "}
                      <span className="font-semibold">&rarr; {t.kirstenMetric2After}</span>
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed ${expandedProofs.includes("kirsten") ? "" : "line-clamp-3"}`}
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
                    <Star key={s} className="w-3.5 h-3.5" fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                  ))}
                </div>
              </div>
            </div>

            <p
              className="mt-8 text-center text-sm leading-relaxed max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.proofMidMarketCallout}
            </p>
          </div>
        </section>

        {/* Section 6: The Process */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-4"
              style={{ color: "var(--color-text)" }}
            >
              {t.processHeadline}
            </h2>
            <p
              className="text-base md:text-lg text-center mb-12 max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.processSubheadline}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: "01", title: t.processStep1Title, desc: t.processStep1Desc, icon: Phone },
                { step: "02", title: t.processStep2Title, desc: t.processStep2Desc, icon: FileText },
                { step: "03", title: t.processStep3Title, desc: t.processStep3Desc, icon: CalendarDays },
                { step: "04", title: t.processStep4Title, desc: t.processStep4Desc, icon: Zap },
              ].map((item, i) => (
                <div
                  key={i}
                  className="proof-block flex flex-col items-center text-center p-6"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-bold"
                    style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                  >
                    {item.step}
                  </div>
                  <item.icon
                    className="w-5 h-5 mb-3"
                    style={{ color: "var(--color-accent)" }}
                  />
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "var(--color-text)" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
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

            {/* Objection handling — stays inside the process section */}
            <div className="mt-16 max-w-3xl mx-auto space-y-12">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>{t.whyNotCall}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.whyNotCallText}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>{t.whyAgents}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.whyAgentsText}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Kit Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="text-2xl md:text-3xl font-semibold text-balance"
                style={{ color: "var(--color-text)" }}
              >
                {t.demoKitHeadline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-xl mx-auto"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.demoKitSubheadline}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Phone, title: t.demoKitItem1Title, desc: t.demoKitItem1Desc },
                { icon: TrendingUp, title: t.demoKitItem2Title, desc: t.demoKitItem2Desc },
                { icon: FileText, title: t.demoKitItem3Title, desc: t.demoKitItem3Desc },
                { icon: MessageCircle, title: t.demoKitItem4Title, desc: t.demoKitItem4Desc },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                    >
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

            <div className="mt-10 text-center">
              <Button asChild className="btn-primary h-11 px-8 gap-2">
                <a
                  href={founderDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackDemoCtaClick("request_demo_kit", "demo_kit", founderDemoUrl)}
                >
                  <CalendarDays className="w-4 h-4" />
                  {t.demoKitCta}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* The Apps */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.agentsEverywhereHeadline}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[
                { icon: Apple, label: "iPhone", desc: t.iphoneDesc },
                { icon: Monitor, label: "macOS", desc: t.macosDesc },
                { icon: Laptop, label: "Windows", desc: t.windowsDesc },
                { icon: Smartphone, label: "Android", desc: t.androidDesc },
                { icon: Globe, label: "Web", desc: t.webAppDesc },
              ].map((platform) => (
                <div key={platform.label} className="flex flex-col items-center text-center">
                  <div
                    className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center"
                    style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                  >
                    <platform.icon className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{platform.label}</h4>
                  <p className="text-sm flex-1" style={{ color: "var(--color-text-secondary)" }}>{platform.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>{t.agentsEverywhereTagline}</p>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>{t.integrationsHeadline}</h2>
              <p className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>{t.integrationsSubheadline}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Communication */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.communicationChannels}</h4>
                </div>
                <div className="space-y-2">
                  {["Telefon", "WhatsApp", "E-Mail", "SMS"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Workspace */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.workspaceTools}</h4>
                </div>
                <div className="space-y-2">
                  {["Microsoft 365", "Google Workspace", "Google Calendar", "Outlook"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Automation */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.automationPlatforms}</h4>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Zapier", soon: false },
                    { name: "Make", soon: false },
                    { name: "ActiveCampaign", soon: false },
                    { name: "Calendly", soon: true },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.soon ? "var(--color-text-tertiary)" : "var(--color-accent)" }} />
                      <span style={{ opacity: item.soon ? 0.6 : 1 }}>{item.name}</span>
                      {item.soon && <span className="text-[10px] uppercase" style={{ color: "var(--color-text-tertiary)" }}>{t.comingSoon}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Models */}
              <div className="p-5 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>{t.aiModels}</h4>
                </div>
                <div className="space-y-2">
                  {["Lexoffice", "sevDesk", "DATEV", "CRM-Systeme"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                      {item}
                    </div>
                  ))}
                  <div className="text-xs pt-1" style={{ color: "var(--color-text-tertiary)" }}>+ {t.andMore}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-16 md:py-24 px-4 md:px-8" style={{ backgroundColor: "var(--color-surface)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>{t.privacyHeadline}</h2>
              <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>{t.privacySubheadline}</p>
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

            <p className="mt-10 text-center text-sm max-w-xl mx-auto" style={{ color: "var(--color-text-tertiary)" }}>{t.privacyTagline}</p>
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
