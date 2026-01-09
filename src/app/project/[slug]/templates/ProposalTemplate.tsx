"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  Users,
  Heart,
  AlertCircle,
  Award,
  Phone,
  Mail,
  Calendar,
  FileText,
  Target,
  Sparkles,
  MessageSquare,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
  Gift,
} from "lucide-react";

interface ProjectPageConfig {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  theme: string;
  template: string;
  logoUrl?: string;
}

interface ProposalTemplateProps {
  config: ProjectPageConfig;
  slug: string;
}

// Theme color configurations
const themeColors = {
  amber: {
    gradient: "from-amber-50 via-white to-orange-50",
    headerGradient: "from-amber-600 to-orange-600",
    ctaGradient: "from-orange-500 to-amber-500",
    accent: "amber",
    primary: "amber-600",
    primaryHover: "amber-700",
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    stepBg: "bg-amber-500",
    stepBorder: "border-amber-100",
    stepLight: "bg-amber-50",
  },
  purple: {
    gradient: "from-purple-50 via-white to-indigo-50",
    headerGradient: "from-purple-600 to-indigo-600",
    ctaGradient: "from-purple-500 to-indigo-500",
    accent: "purple",
    primary: "purple-600",
    primaryHover: "purple-700",
    badge: "bg-purple-100 text-purple-800",
    border: "border-purple-200",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    stepBg: "bg-purple-500",
    stepBorder: "border-purple-100",
    stepLight: "bg-purple-50",
  },
  blue: {
    gradient: "from-blue-50 via-white to-cyan-50",
    headerGradient: "from-blue-600 to-cyan-600",
    ctaGradient: "from-blue-500 to-cyan-500",
    accent: "blue",
    primary: "blue-600",
    primaryHover: "blue-700",
    badge: "bg-blue-100 text-blue-800",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    stepBg: "bg-blue-500",
    stepBorder: "border-blue-100",
    stepLight: "bg-blue-50",
  },
  green: {
    gradient: "from-green-50 via-white to-emerald-50",
    headerGradient: "from-green-600 to-emerald-600",
    ctaGradient: "from-green-500 to-emerald-500",
    accent: "green",
    primary: "green-600",
    primaryHover: "green-700",
    badge: "bg-green-100 text-green-800",
    border: "border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-700",
    stepBg: "bg-green-500",
    stepBorder: "border-green-100",
    stepLight: "bg-green-50",
  },
  neutral: {
    gradient: "from-gray-50 via-white to-slate-50",
    headerGradient: "from-gray-700 to-slate-800",
    ctaGradient: "from-gray-600 to-slate-700",
    accent: "gray",
    primary: "gray-600",
    primaryHover: "gray-700",
    badge: "bg-gray-100 text-gray-800",
    border: "border-gray-200",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-700",
    stepBg: "bg-gray-500",
    stepBorder: "border-gray-100",
    stepLight: "bg-gray-50",
  },
};

// Section Header Component
function SectionHeader({
  badge,
  title,
  subtitle,
  colors,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  colors: typeof themeColors.amber;
}) {
  return (
    <div className="text-center mb-8 sm:mb-12">
      {badge && (
        <div className={`inline-flex items-center gap-2 ${colors.badge} px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium mb-3 sm:mb-4`}>
          {badge}
        </div>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-3 sm:mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}

// Executive Summary Section
function ExecutiveSummarySection({ config, colors }: { config: ProjectPageConfig; colors: typeof themeColors.amber }) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="Executive Summary"
          title={config.name}
          subtitle={config.description}
          colors={colors}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Project Info */}
          <div className={`bg-gradient-to-br ${colors.gradient} p-6 border ${colors.border}`}>
            <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className={`w-5 h-5 ${colors.iconColor}`} />
              Project Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-gray-800">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-gray-800">{new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="bg-white p-6 border border-gray-200 shadow-sm">
            <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className={`w-5 h-5 ${colors.iconColor}`} />
              Project Scope
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className={`w-4 h-4 ${colors.iconColor} mt-0.5 flex-shrink-0`} />
                <span className="text-gray-700">Strategy & Planning</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className={`w-4 h-4 ${colors.iconColor} mt-0.5 flex-shrink-0`} />
                <span className="text-gray-700">Implementation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className={`w-4 h-4 ${colors.iconColor} mt-0.5 flex-shrink-0`} />
                <span className="text-gray-700">Review & Optimization</span>
              </li>
              <li className="flex items-start gap-2">
                <Gift className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong className="text-orange-600">BONUS:</strong> Ongoing Support
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Key Messages */}
        <div className={`bg-gradient-to-r ${colors.ctaGradient} p-6 text-white`}>
          <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Key Messages
          </h3>
          <p className="text-sm leading-relaxed opacity-90">
            {config.description || "This project aims to deliver exceptional value through strategic planning and expert execution."}
          </p>
        </div>
      </div>
    </section>
  );
}

// StoryBrand Section
function StoryBrandSection({
  title,
  subtitle,
  heroDescription,
  problems,
  guideEmpathy,
  guideAuthority,
  planSteps,
  transformations,
  colors,
  bgClass = "bg-white",
}: {
  title: string;
  subtitle: string;
  heroDescription: string;
  problems: { external: string; internal: string; philosophical: string };
  guideEmpathy: string;
  guideAuthority: string;
  planSteps: string[];
  transformations: { before: string; after: string }[];
  colors: typeof themeColors.amber;
  bgClass?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`py-16 ${bgClass}`}>
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="StoryBrand Analysis"
          title={title}
          subtitle={subtitle}
          colors={colors}
        />

        {/* The Hero */}
        <div className={`bg-white p-6 border ${colors.border} shadow-sm mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 ${colors.iconBg} flex items-center justify-center`}>
              <Users className={`w-5 h-5 ${colors.iconColor}`} />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">The Hero</h3>
              <p className="text-sm text-gray-500">The person at the center of the story</p>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">{heroDescription}</p>
        </div>

        {/* The Problem - 3 Levels */}
        <div className="bg-white p-6 border border-red-200 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">The Problem</h3>
              <p className="text-sm text-gray-500">On three levels</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">EXTERNAL</div>
              <p className="text-sm text-gray-700">{problems.external}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">INTERNAL</div>
              <p className="text-sm text-gray-700">{problems.internal}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">PHILOSOPHICAL</div>
              <p className="text-sm text-gray-700">{problems.philosophical}</p>
            </div>
          </div>
        </div>

        {/* The Guide */}
        <div className="bg-white p-6 border border-violet-200 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-violet-700" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">The Guide</h3>
              <p className="text-sm text-gray-500">Empathy & Authority</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">EMPATHY</span>
              </div>
              <p className="text-sm text-gray-700">{guideEmpathy}</p>
            </div>
            <div className="p-4 bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">AUTHORITY</span>
              </div>
              <p className="text-sm text-gray-700">{guideAuthority}</p>
            </div>
          </div>
        </div>

        {/* Expandable sections */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center justify-center gap-2 py-3 text-${colors.accent}-700 hover:text-${colors.accent}-800 transition-colors`}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Plan & Transformation
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-6 mt-6">
            {/* The Plan */}
            <div className={`bg-white p-6 border ${colors.border} shadow-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${colors.iconBg} flex items-center justify-center`}>
                  <FileText className={`w-5 h-5 ${colors.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-gray-800">The Plan (3 Steps)</h3>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                {planSteps.map((step, idx) => (
                  <div key={idx} className="flex-1 flex items-center gap-4">
                    <div className={`flex-1 p-4 ${colors.stepLight} border ${colors.stepBorder} text-center`}>
                      <div className={`w-8 h-8 ${colors.stepBg} text-white font-bold flex items-center justify-center mx-auto mb-2`}>
                        {idx + 1}
                      </div>
                      <p className="text-sm text-gray-700">{step}</p>
                    </div>
                    {idx < planSteps.length - 1 && (
                      <ArrowRight className={`w-5 h-5 text-${colors.accent}-400 rotate-90 md:rotate-0 flex-shrink-0 hidden md:block`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action */}
            <div className={`bg-gradient-to-r ${colors.ctaGradient} p-6 text-white`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold">Call to Action</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 bg-white/10 backdrop-blur">
                  <div className="text-white/70 text-xs font-medium mb-2">DIRECT</div>
                  <p className="font-medium">&quot;Schedule a meeting today&quot;</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur">
                  <div className="text-white/70 text-xs font-medium mb-2">TRANSITIONAL</div>
                  <p className="font-medium">&quot;Learn more about our approach&quot;</p>
                </div>
              </div>
            </div>

            {/* Transformation */}
            <div className="bg-white p-6 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-gray-800">The Transformation</h3>
                </div>
              </div>

              <div className="space-y-3">
                {transformations.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 bg-gradient-to-r from-red-50 to-emerald-50"
                  >
                    <span className="flex-1 text-sm text-red-600 line-through">{item.before}</span>
                    <ArrowRight className={`w-4 h-4 text-${colors.accent}-500 flex-shrink-0`} />
                    <span className="flex-1 text-sm text-emerald-700 font-medium">{item.after}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Contact Section
function ContactSection({ colors }: { colors: typeof themeColors.amber }) {
  return (
    <section className={`py-10 sm:py-16 bg-gradient-to-br ${colors.headerGradient} text-white`}>
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-3 sm:mb-4">
          Ready to get started?
        </h2>
        <p className="text-white/80 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
          Have questions? We&apos;re here to help. Let&apos;s discuss your project.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <a
            href="https://cal.com/voundbrand/open-end-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 bg-white text-${colors.accent}-700 px-6 py-3 font-medium hover:bg-${colors.accent}-50 transition-colors shadow-lg`}
          >
            <Calendar className="w-5 h-5" />
            Book a Meeting
          </a>
          <a
            href="mailto:contact@l4yercak3.com"
            className="inline-flex items-center justify-center gap-2 bg-white/20 text-white px-6 py-3 font-medium hover:bg-white/30 transition-colors border border-white/30"
          >
            <Mail className="w-5 h-5" />
            Send Email
          </a>
          <a
            href="tel:+4915140427103"
            className="inline-flex items-center justify-center gap-2 bg-white/20 text-white px-6 py-3 font-medium hover:bg-white/30 transition-colors border border-white/30"
          >
            <Phone className="w-5 h-5" />
            Call Us
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-white/60 text-sm">
            Powered by{" "}
            <a
              href="https://l4yercak3.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white italic hover:text-white/80 transition-colors"
            >
              l4yercak3
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// Main Template Component
export default function ProposalTemplate({ config }: ProposalTemplateProps) {
  const colors = themeColors[config.theme as keyof typeof themeColors] || themeColors.purple;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`bg-gradient-to-r ${colors.headerGradient} text-white py-6`}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold">{config.name}</h1>
                {config.description && (
                  <p className="text-white/70 text-sm">{config.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="mailto:contact@l4yercak3.com"
                className="text-white/70 hover:text-white transition-colors hidden sm:block"
                title="Send Email"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="tel:+4915140427103"
                className="text-white/70 hover:text-white transition-colors hidden sm:block"
                title="Call"
              >
                <Phone className="w-5 h-5" />
              </a>
              <a
                href="https://cal.com/voundbrand/open-end-meeting"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                title="Book Meeting"
              >
                <Calendar className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`bg-gradient-to-br ${colors.gradient} py-10 sm:py-16 border-b ${colors.border}`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className={`inline-flex items-center gap-2 ${colors.badge} px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium mb-4 sm:mb-6`}>
            <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
            Project Proposal
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-3 sm:mb-4">
            {config.name}
          </h1>
          {config.description && (
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {config.description}
            </p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main>
        <ExecutiveSummarySection config={config} colors={colors} />

        <StoryBrandSection
          title="Target Audience"
          subtitle="Understanding who we're helping and their journey"
          heroDescription="Your ideal customer who is looking for a solution to their problem."
          problems={{
            external: "The visible challenge they face",
            internal: "How it makes them feel",
            philosophical: "Why this matters on a deeper level",
          }}
          guideEmpathy="We understand your challenges"
          guideAuthority="We have the expertise and experience to help"
          planSteps={["Contact us", "Get a plan", "Achieve results"]}
          transformations={[
            { before: "Struggling alone", after: "Supported by experts" },
            { before: "Uncertain path", after: "Clear roadmap" },
            { before: "Slow progress", after: "Accelerated growth" },
          ]}
          colors={colors}
          bgClass={`bg-gradient-to-br ${colors.gradient}`}
        />

        <ContactSection colors={colors} />
      </main>
    </div>
  );
}
