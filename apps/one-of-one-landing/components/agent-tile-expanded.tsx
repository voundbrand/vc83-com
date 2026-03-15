"use client"

import { useState } from "react"
import Image from "next/image"
import { type LucideIcon, ArrowRight, Phone, Play, Pause, MessageCircle, Mail, MessageSquare, Globe, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SUPPORTED_LANGUAGES, PRIMARY_LANGUAGE_CODES } from "@/lib/voice-catalog"

type AgentChannel = {
  icon: LucideIcon
  label: string
}

type AgentTileData = {
  agentKey: string
  icon: LucideIcon
  name: string
  headline: string
  desc: string
  metric: string
  personaName: string
  avatarColor: string
  avatarSrc?: string
  skills: string[]
  outcomes: string[]
  voiceDesc: string
  toneDesc: string
  channels: AgentChannel[]
  phoneNumber?: string
  phoneCta?: string
  voiceIntroScript?: string
}

type AgentTileLabels = {
  skillsLabel: string
  outcomesLabel: string
  voiceLabel: string
  toneLabel: string
  languagesLabel: string
  channelsLabel: string
  expandLabel: string
  collapseLabel: string
  languagesMoreLabel: string
  languagesLessLabel: string
  phoneAvailableLabel: string
}

const allLanguages = Object.values(SUPPORTED_LANGUAGES)
const primaryLanguages = PRIMARY_LANGUAGE_CODES.map((code) => SUPPORTED_LANGUAGES[code])
const remainingLanguages = allLanguages.filter((lang) => !primaryLanguages.includes(lang))

export function AgentTileExpanded({
  agent,
  labels,
  isExpanded,
  onToggle,
  onPhoneCtaClick,
  voiceIntroLabel,
  isPlayingVoice,
  onPlayVoice,
}: {
  agent: AgentTileData
  labels: AgentTileLabels
  isExpanded: boolean
  onToggle: () => void
  onPhoneCtaClick?: (agent: AgentTileData) => void
  voiceIntroLabel?: string
  isPlayingVoice?: boolean
  onPlayVoice?: () => void
}) {
  const [showAllLanguages, setShowAllLanguages] = useState(false)

  return (
    <div className="proof-block p-6 md:p-8">
      {/* Header row */}
      <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
        {/* Avatar */}
        {agent.avatarSrc ? (
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shrink-0 border-2"
            style={{ borderColor: agent.avatarColor }}
          >
            <Image
              src={agent.avatarSrc}
              alt={agent.personaName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0 text-lg md:text-xl font-bold text-white"
            style={{ backgroundColor: agent.avatarColor }}
          >
            {agent.personaName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          {/* Agent type with inline icon */}
          <div className="flex items-center gap-2 mb-1">
            <agent.icon
              className="w-4 h-4 shrink-0"
              style={{ color: "var(--color-accent)" }}
            />
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-accent)" }}
            >
              {agent.name}
            </p>
            {agent.phoneNumber && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider animate-pulse-slow"
                style={{ color: "var(--color-success)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: "var(--color-success)" }}
                />
                {labels.phoneAvailableLabel}
              </span>
            )}
          </div>
          <h3
            className="text-lg md:text-xl font-bold mb-2"
            style={{ color: "var(--color-text)" }}
          >
            {agent.personaName} — {agent.headline}
          </h3>
          <p
            className="text-sm md:text-base leading-relaxed mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {agent.desc}
          </p>
          <p
            className="text-sm font-bold mb-3"
            style={{ color: "var(--color-accent)" }}
          >
            {agent.metric}
          </p>

          {/* Expand / collapse toggle */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer py-3"
            style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
            onClick={onToggle}
          >
            <ArrowRight
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
            {isExpanded ? labels.collapseLabel : labels.expandLabel}
          </button>
        </div>

        {/* CTA column — right side of header */}
        {(agent.phoneNumber && agent.phoneCta) || onPlayVoice ? (
          <div className="shrink-0 flex flex-col items-center gap-1.5 w-full md:w-auto">
            {agent.phoneNumber && agent.phoneCta && (
              onPhoneCtaClick ? (
                <Button
                  className="btn-accent h-9 px-4 w-full md:w-auto gap-1.5 text-xs"
                  onClick={() => onPhoneCtaClick(agent)}
                >
                  <Phone className="w-3.5 h-3.5" />
                  {agent.phoneCta}
                </Button>
              ) : (
                <Button asChild className="btn-accent h-9 px-4 w-full md:w-auto gap-1.5 text-xs">
                  <a href={`tel:${agent.phoneNumber.replace(/\s/g, "")}`}>
                    <Phone className="w-3.5 h-3.5" />
                    {agent.phoneCta}
                  </a>
                </Button>
              )
            )}
            {onPlayVoice && voiceIntroLabel && (
              <Button
                className="btn-secondary h-9 px-4 w-full md:w-auto mt-1 gap-1.5 text-xs"
                onClick={onPlayVoice}
              >
                {isPlayingVoice ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {voiceIntroLabel}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Accordion content */}
      {isExpanded && (
        <div className="accordion-enter mt-6 pt-6" style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* Skills + Outcomes row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Skills */}
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {labels.skillsLabel}
              </h4>
              <ul className="space-y-1.5">
                {agent.skills.map((skill, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: "var(--color-accent)" }}
                    />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>

            {/* Outcomes */}
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {labels.outcomesLabel}
              </h4>
              <ul className="space-y-1.5">
                {agent.outcomes.map((outcome, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: "var(--color-success)" }}
                    />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Voice + Tone row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {labels.voiceLabel}
              </h4>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {agent.voiceDesc}
              </p>
            </div>
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {labels.toneLabel}
              </h4>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {agent.toneDesc}
              </p>
            </div>
          </div>

          {/* Languages */}
          <div className="mb-6">
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {labels.languagesLabel}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {primaryLanguages.map((lang) => (
                <span key={lang} className="language-badge">
                  {lang}
                </span>
              ))}
              {showAllLanguages && remainingLanguages.map((lang) => (
                <span key={lang} className="language-badge">
                  {lang}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 flex items-center gap-1.5 text-xs transition-colors cursor-pointer py-3"
              style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
              onClick={() => setShowAllLanguages((v) => !v)}
            >
              <ArrowRight
                className={`w-3 h-3 transition-transform ${showAllLanguages ? "rotate-90" : ""}`}
              />
              {showAllLanguages
                ? labels.languagesLessLabel
                : labels.languagesMoreLabel.replace("{count}", String(remainingLanguages.length))}
            </button>
          </div>

          {/* Channels */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {labels.channelsLabel}
            </h4>
            <div className="flex flex-wrap gap-2">
              {agent.channels.map((ch) => (
                <span
                  key={ch.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "var(--color-accent-subtle)",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <ch.icon className="w-3.5 h-3.5" />
                  {ch.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Standard channel sets used by the agent tiles */
export const CHANNEL_ICONS: Record<string, LucideIcon> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  webchat: MessageSquare,
  sms: Smartphone,
  api: Globe,
}

export type { AgentTileData, AgentTileLabels, AgentChannel }
