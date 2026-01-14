"use client";

import { useState } from "react";
import { Inter, Playfair_Display } from "next/font/google";
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
  X,
  ChevronDown,
  ChevronUp,
  Gift,
  Bike,
  MapPin,
  Instagram,
  Facebook,
  Newspaper,
  CreditCard,
  Layers,
  Bot,
  CalendarDays,
  Bell,
  Smartphone,
} from "lucide-react";
import { useProjectDrawer } from "@/components/project-drawer";
import {
  EditModeProvider,
  EditModeToolbar,
  EditableText,
  EditableMultilineText,
} from "@/components/project-editing";
import type { Id } from "@convex/_generated/dataModel";

// Initialize fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

interface ProjectPageConfig {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  theme: string;
  template: string;
  logoUrl?: string;
}

interface RikschaTemplateProps {
  config: ProjectPageConfig;
  slug: string;
}

// ============================================
// SECTION HEADER COMPONENT
// ============================================

function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-8 sm:mb-12">
      {badge && (
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
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

// ============================================
// EXECUTIVE SUMMARY SECTION
// ============================================

function ExecutiveSummarySection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="Executive Summary"
          title="Gemeinsam bringen wir Torgelow ins Rollen"
          subtitle="Marketingstrategie für das Rikscha-Projekt basierend auf dem StoryBrand-Framework"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Project Info */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 border border-amber-200">
            <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Projektdetails
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Auftraggeber:</span>
                <span className="font-medium text-gray-800">
                  TuS Pommern Torgelow e.V.
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Datum:</span>
                <span className="font-medium text-gray-800">Januar 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Budget:</span>
                <span className="font-medium text-amber-700">3.000€</span>
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="bg-white p-6 border border-gray-200 shadow-sm">
            <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              Projekt-Scope
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  6-seitiger Faltflyer (Wickelfalz, DIN Lang)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Anzeigen-Adaption für Regionalmagazin
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Content-Kalender für 3 Monate
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Gift className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong className="text-orange-600">BONUS:</strong> Prototyp
                  Buchungssystem
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* One-Liners Preview */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
          <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Die Kernbotschaften
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <div className="text-amber-200 text-xs font-medium mb-2">
                FÜR FAHRGÄSTE
              </div>
              <EditableMultilineText
                blockId="summary.oneliner.passengers"
                defaultValue="&quot;Viele ältere Menschen vermissen die Freiheit, draußen unterwegs zu sein. Mit unseren kostenlosen Rikscha-Fahrten schenken wir Mobilität, frische Luft und wertvolle Begegnungen. Rufen Sie an und buchen Sie Ihre Fahrt.&quot;"
                as="p"
                className="text-sm leading-relaxed italic"
                sectionId="summary"
                blockLabel="One-Liner Passengers"
              />
            </div>
            <div>
              <div className="text-amber-200 text-xs font-medium mb-2">
                FÜR PILOTEN
              </div>
              <EditableMultilineText
                blockId="summary.oneliner.pilots"
                defaultValue="&quot;Viele Menschen möchten etwas Sinnvolles für ihre Gemeinschaft tun. Als Rikscha-Pilot schenken Sie älteren Menschen Mobilität und Freude – und bleiben dabei selbst aktiv. Melden Sie sich für Ihre Einweisung.&quot;"
                as="p"
                className="text-sm leading-relaxed italic"
                sectionId="summary"
                blockLabel="One-Liner Pilots"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// STORYBRAND ANALYSIS SECTION - FAHRGÄSTE
// ============================================

function StoryBrandFahrgaesteSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-16 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="StoryBrand-Analyse"
          title="Zielgruppe A: Fahrgäste"
          subtitle="Ältere Menschen, die eingeschränkte Mobilität haben und die Freiheit vermissen, an der frischen Luft unterwegs zu sein"
        />

        {/* The Hero */}
        <div className="bg-white p-6 border border-amber-200 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">
                Der Held
              </h3>
              <p className="text-sm text-gray-500">
                Die Person im Mittelpunkt der Geschichte
              </p>
            </div>
          </div>
          <EditableMultilineText
            blockId="fahrgaeste.hero.description"
            defaultValue="Ältere Menschen in Torgelow und Umgebung, die eingeschränkte Mobilität haben und die Freiheit vermissen, an der frischen Luft unterwegs zu sein und am Stadtleben teilzunehmen."
            as="p"
            className="text-gray-700 leading-relaxed"
            sectionId="fahrgaeste"
            blockLabel="Hero Description (Fahrgäste)"
          />
        </div>

        {/* The Problem - 3 Levels */}
        <div className="bg-white p-6 border border-red-200 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">
                Das Problem
              </h3>
              <p className="text-sm text-gray-500">Auf drei Ebenen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">
                EXTERN (sichtbar)
              </div>
              <EditableMultilineText
                blockId="fahrgaeste.problem.external"
                defaultValue="Kann nicht mehr selbstständig spazieren gehen, ist auf andere angewiesen"
                as="p"
                className="text-sm text-gray-700"
                sectionId="fahrgaeste"
                blockLabel="External Problem"
              />
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">
                INTERN (Gefühl)
              </div>
              <EditableMultilineText
                blockId="fahrgaeste.problem.internal"
                defaultValue="Fühlt sich isoliert, vergessen, als Belastung für andere"
                as="p"
                className="text-sm text-gray-700"
                sectionId="fahrgaeste"
                blockLabel="Internal Problem"
              />
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">
                PHILOSOPHISCH
              </div>
              <EditableMultilineText
                blockId="fahrgaeste.problem.philosophical"
                defaultValue="&quot;Nur weil ich älter bin, sollte ich nicht von der Welt ausgeschlossen sein&quot;"
                as="p"
                className="text-sm text-gray-700"
                sectionId="fahrgaeste"
                blockLabel="Philosophical Problem"
              />
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
              <h3 className="font-serif font-semibold text-gray-800">
                Der Guide (Rikscha-Projekt)
              </h3>
              <p className="text-sm text-gray-500">Empathie & Autorität</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">
                  EMPATHIE
                </span>
              </div>
              <EditableMultilineText
                blockId="fahrgaeste.guide.empathy"
                defaultValue="&quot;Wir verstehen, dass Mobilität Lebensqualität bedeutet&quot;"
                as="p"
                className="text-sm text-gray-700"
                sectionId="fahrgaeste"
                blockLabel="Guide Empathy"
              />
            </div>
            <div className="p-4 bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">
                  AUTORITÄT
                </span>
              </div>
              <EditableMultilineText
                blockId="fahrgaeste.guide.authority"
                defaultValue="Moderne, sichere Rikschas mit E-Unterstützung, geschulte Piloten, umfassender Versicherungsschutz"
                as="p"
                className="text-sm text-gray-700"
                sectionId="fahrgaeste"
                blockLabel="Guide Authority"
              />
            </div>
          </div>
        </div>

        {/* Expandable sections */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-3 text-amber-700 hover:text-amber-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Weniger anzeigen
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Plan, CTA & Transformation anzeigen
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-6 mt-6">
            {/* The Plan */}
            <div className="bg-white p-6 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-gray-800">
                    Der Plan (3 Schritte)
                  </h3>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 p-4 bg-amber-50 border border-amber-100 text-center">
                  <div className="w-8 h-8 bg-amber-500 text-white font-bold flex items-center justify-center mx-auto mb-2">
                    1
                  </div>
                  <p className="text-sm text-gray-700">
                    Kontaktieren Sie Frau Conrad
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-amber-400 rotate-90 md:rotate-0" />
                </div>
                <div className="flex-1 p-4 bg-amber-50 border border-amber-100 text-center">
                  <div className="w-8 h-8 bg-amber-500 text-white font-bold flex items-center justify-center mx-auto mb-2">
                    2
                  </div>
                  <p className="text-sm text-gray-700">
                    Vereinbaren Sie einen Termin
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-amber-400 rotate-90 md:rotate-0" />
                </div>
                <div className="flex-1 p-4 bg-amber-50 border border-amber-100 text-center">
                  <div className="w-8 h-8 bg-amber-500 text-white font-bold flex items-center justify-center mx-auto mb-2">
                    3
                  </div>
                  <p className="text-sm text-gray-700">Genießen Sie Ihre Fahrt</p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
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
                  <div className="text-orange-200 text-xs font-medium mb-2">
                    DIREKT
                  </div>
                  <p className="font-medium">
                    &quot;Rufen Sie jetzt an: 0170 / 558 528 7&quot;
                  </p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur">
                  <div className="text-orange-200 text-xs font-medium mb-2">
                    TRANSITIONAL
                  </div>
                  <p className="font-medium">
                    &quot;Erfahren Sie mehr auf unserer Website&quot;
                  </p>
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
                  <h3 className="font-serif font-semibold text-gray-800">
                    Die Transformation
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    before: "Eingeschlossen in vier Wänden",
                    after: "Draußen in der Natur",
                  },
                  { before: "Isoliert und allein", after: "Teil der Gemeinschaft" },
                  { before: "Abhängig und hilflos", after: "Selbstbestimmt und frei" },
                  { before: "Vergessen", after: "Wertgeschätzt" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 bg-gradient-to-r from-red-50 to-emerald-50"
                  >
                    <span className="flex-1 text-sm text-red-600 line-through">
                      {item.before}
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-emerald-700 font-medium">
                      {item.after}
                    </span>
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

// ============================================
// STORYBRAND ANALYSIS SECTION - PILOTEN
// ============================================

function StoryBrandPilotenSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="StoryBrand-Analyse"
          title="Zielgruppe B: Piloten"
          subtitle="Aktive Menschen (oft 50+), die fit sind, Zeit haben und etwas Sinnvolles für ihre Gemeinschaft tun wollen"
        />

        {/* The Hero */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 border border-amber-200 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">
                Der Held
              </h3>
              <p className="text-sm text-gray-500">Der potenzielle Pilot</p>
            </div>
          </div>
          <EditableMultilineText
            blockId="piloten.hero.description"
            defaultValue="Aktive Menschen (oft 50+), die fit sind, Zeit haben und etwas Sinnvolles für ihre Gemeinschaft tun wollen."
            as="p"
            className="text-gray-700 leading-relaxed"
            sectionId="piloten"
            blockLabel="Hero Description (Piloten)"
          />
        </div>

        {/* The Problem - 3 Levels */}
        <div className="bg-white p-6 border border-red-200 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-gray-800">
                Das Problem
              </h3>
              <p className="text-sm text-gray-500">Auf drei Ebenen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">EXTERN</div>
              <EditableMultilineText
                blockId="piloten.problem.external"
                defaultValue="Sucht eine sinnvolle Beschäftigung, möchte aktiv bleiben"
                as="p"
                className="text-sm text-gray-700"
                sectionId="piloten"
                blockLabel="External Problem (Piloten)"
              />
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">INTERN</div>
              <EditableMultilineText
                blockId="piloten.problem.internal"
                defaultValue="Fühlt sich unterfordert, möchte gebraucht werden, sucht soziale Kontakte"
                as="p"
                className="text-sm text-gray-700"
                sectionId="piloten"
                blockLabel="Internal Problem (Piloten)"
              />
            </div>
            <div className="p-4 bg-red-50 border border-red-100">
              <div className="text-xs font-medium text-red-600 mb-2">
                PHILOSOPHISCH
              </div>
              <EditableMultilineText
                blockId="piloten.problem.philosophical"
                defaultValue="&quot;Ich habe noch viel zu geben und möchte einen Unterschied machen&quot;"
                as="p"
                className="text-sm text-gray-700"
                sectionId="piloten"
                blockLabel="Philosophical Problem (Piloten)"
              />
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
              <h3 className="font-serif font-semibold text-gray-800">
                Der Guide (Rikscha-Projekt)
              </h3>
              <p className="text-sm text-gray-500">Empathie & Autorität</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">
                  EMPATHIE
                </span>
              </div>
              <EditableMultilineText
                blockId="piloten.guide.empathy"
                defaultValue="&quot;Wir wissen, dass Sie mehr zu bieten haben&quot;"
                as="p"
                className="text-sm text-gray-700"
                sectionId="piloten"
                blockLabel="Guide Empathy (Piloten)"
              />
            </div>
            <div className="p-4 bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">
                  AUTORITÄT
                </span>
              </div>
              <EditableMultilineText
                blockId="piloten.guide.authority"
                defaultValue="Umfassende Einweisung, Probefahrt, Versicherungsschutz, flexible Zeiteinteilung"
                as="p"
                className="text-sm text-gray-700"
                sectionId="piloten"
                blockLabel="Guide Authority (Piloten)"
              />
            </div>
          </div>
        </div>

        {/* Expandable sections */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-3 text-amber-700 hover:text-amber-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Weniger anzeigen
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Plan, CTA & Transformation anzeigen
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-6 mt-6">
            {/* The Plan */}
            <div className="bg-white p-6 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-gray-800">
                    Der Plan (3 Schritte)
                  </h3>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 p-4 bg-amber-50 border border-amber-100 text-center">
                  <div className="w-8 h-8 bg-amber-500 text-white font-bold flex items-center justify-center mx-auto mb-2">
                    1
                  </div>
                  <p className="text-sm text-gray-700">
                    Melden Sie sich bei Frau Conrad
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-amber-400 rotate-90 md:rotate-0" />
                </div>
                <div className="flex-1 p-4 bg-amber-50 border border-amber-100 text-center">
                  <div className="w-8 h-8 bg-amber-500 text-white font-bold flex items-center justify-center mx-auto mb-2">
                    2
                  </div>
                  <p className="text-sm text-gray-700">
                    Erhalten Sie Ihre Einweisung
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-amber-400 rotate-90 md:rotate-0" />
                </div>
                <div className="flex-1 p-4 bg-amber-50 border border-amber-100 text-center">
                  <div className="w-8 h-8 bg-amber-500 text-white font-bold flex items-center justify-center mx-auto mb-2">
                    3
                  </div>
                  <p className="text-sm text-gray-700">Starten Sie als Pilot</p>
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
                  <h3 className="font-serif font-semibold text-gray-800">
                    Die Transformation
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    before: "Viel freie Zeit, wenig Sinn",
                    after: "Sinnvolle Aufgabe",
                  },
                  {
                    before: "Körperlich weniger aktiv",
                    after: "Regelmäßige Bewegung",
                  },
                  {
                    before: "Wenig soziale Kontakte",
                    after: "Bereichernde Begegnungen",
                  },
                  {
                    before: "Zuschauer im Leben",
                    after: "Aktiver Teil der Gemeinschaft",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 bg-gradient-to-r from-red-50 to-emerald-50"
                  >
                    <span className="flex-1 text-sm text-red-600 line-through">
                      {item.before}
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-emerald-700 font-medium">
                      {item.after}
                    </span>
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

// ============================================
// FLYER CONCEPT SECTION
// ============================================

function FlyerConceptSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-stone-100 to-amber-50">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Flyer-Konzept"
          title="6-Seiter Faltflyer"
          subtitle="DIN Lang (99 x 210 mm), Wickelfalz – die Außenseite dient auch als Magazin-Anzeige"
        />

        {/* Flyer Pages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Page 1 - Title */}
          <div className="bg-white p-5 border-2 border-amber-500 shadow-lg">
            <div className="text-xs font-medium text-amber-600 mb-3 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-500 text-white flex items-center justify-center text-xs">
                1
              </span>
              Titelseite (= Magazin-Anzeige)
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">HEADLINE:</span>
                <p className="font-serif font-semibold text-gray-800">
                  &quot;Wieder Wind im Haar – mit der Rikscha durch
                  Torgelow&quot;
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">SUBHEADLINE:</span>
                <p className="text-gray-700">
                  Kostenlose Fahrten für Menschen, die die Freiheit vermissen
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">VISUAL:</span>
                <p className="text-gray-600 italic">
                  Emotionales Foto: Lächelnde ältere Person in Rikscha
                </p>
              </div>
              <div className="bg-amber-100 p-2 text-center">
                <span className="text-amber-800 font-medium text-xs">
                  CTA: Jetzt Fahrt buchen: 0170 / 558 528 7
                </span>
              </div>
            </div>
          </div>

          {/* Page 2 - Facts */}
          <div className="bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
              <span className="w-5 h-5 bg-gray-400 text-white flex items-center justify-center text-xs">
                2
              </span>
              Einschlagseite
            </div>
            <div className="space-y-2">
              <p className="font-serif font-semibold text-gray-800 text-sm mb-3">
                &quot;Auf einen Blick&quot;
              </p>
              {[
                "Komplett kostenlos",
                "E-Unterstützung – kein Kraftaufwand",
                "Vollversichert",
                "Ihre Route, Ihre Entscheidung",
                "Geschulte, ehrenamtliche Piloten",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Page 3 - For Passengers */}
          <div className="bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
              <span className="w-5 h-5 bg-gray-400 text-white flex items-center justify-center text-xs">
                3
              </span>
              Für Fahrgäste
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">HEADLINE:</span>
                <p className="font-serif font-semibold text-gray-800">
                  &quot;Mobilität schenken, Freude teilen&quot;
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">PROBLEM:</span>
                <p className="text-gray-700">
                  &quot;Viele Menschen vermissen es, draußen zu sein...&quot;
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">LÖSUNG:</span>
                <p className="text-gray-700">
                  &quot;Unsere Rikscha-Fahrten bringen Ihnen die Freiheit
                  zurück&quot;
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 bg-amber-50 p-2 text-center text-xs">
                  Anrufen
                </div>
                <div className="flex-1 bg-amber-50 p-2 text-center text-xs">
                  Termin
                </div>
                <div className="flex-1 bg-amber-50 p-2 text-center text-xs">
                  Genießen
                </div>
              </div>
            </div>
          </div>

          {/* Page 4 - FAQ */}
          <div className="bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
              <span className="w-5 h-5 bg-gray-400 text-white flex items-center justify-center text-xs">
                4
              </span>
              FAQ
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-gray-800">
                  Ist die Fahrt wirklich kostenlos?
                </p>
                <p className="text-gray-600">
                  Ja! Es ist eine Geste der Gemeinschaft.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  Sind die Fahrten sicher?
                </p>
                <p className="text-gray-600">
                  Sicherheit hat Vorrang. Moderne Rikschas, Versicherungsschutz.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  Was bieten wir nicht an?
                </p>
                <p className="text-gray-600">
                  Keine Taxidienste. Nur Genussfahrten für die soziale Teilhabe.
                </p>
              </div>
            </div>
          </div>

          {/* Page 5 - Contact & Donations */}
          <div className="bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
              <span className="w-5 h-5 bg-gray-400 text-white flex items-center justify-center text-xs">
                5
              </span>
              Kontakt & Spenden
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600" />
                <span className="text-gray-700">0170 / 558 528 7</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <span className="text-gray-700">tus-torgelow.de</span>
              </div>
              <div className="bg-emerald-50 p-3 border border-emerald-200">
                <p className="text-xs font-medium text-emerald-700 mb-1">
                  SPENDEN:
                </p>
                <p className="text-xs text-gray-600">
                  TuS Pommern Torgelow e.V.
                </p>
                <p className="text-xs text-gray-600">
                  IBAN: DE 42 1506 1638 0003 1067 72
                </p>
                <p className="text-xs text-gray-500">
                  Verwendungszweck: Rikschaprojekt Torgelow
                </p>
              </div>
            </div>
          </div>

          {/* Page 6 - Back */}
          <div className="bg-white p-5 border-2 border-amber-500 shadow-lg">
            <div className="text-xs font-medium text-amber-600 mb-3 flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-500 text-white flex items-center justify-center text-xs">
                6
              </span>
              Rückseite
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">HEADLINE:</span>
                <p className="font-serif font-semibold text-gray-800">
                  &quot;Werden Sie Pilot – schenken Sie Freude&quot;
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 text-xs">BENEFITS:</span>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 text-xs">
                    Bleiben Sie aktiv
                  </span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 text-xs">
                    Begegnungen
                  </span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 text-xs">
                    Flexible Zeiten
                  </span>
                </div>
              </div>
              <div className="bg-amber-100 p-2 text-center">
                <span className="text-amber-800 font-medium text-xs">
                  CTA: Melden Sie sich bei Frau Conrad
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Partner Logos Note */}
        <div className="bg-white p-4 border border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            <strong className="text-gray-800">Partner-Logos auf allen Seiten:</strong>{" "}
            TuS Pommern, Bürgerbündnis Vorpommern, Ehrenamtsstiftung MV
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CONTENT CALENDAR SECTION
// ============================================

function ContentCalendarSection() {
  const months = [
    {
      title: "Monat 1: Launch & Awareness",
      color: "amber",
      weeks: [
        {
          week: 1,
          theme: 'Projektvorstellung: „Was ist das Rikscha-Projekt?"',
          channels: ["Facebook", "Lokalpresse"],
          cta: "Mehr erfahren",
        },
        {
          week: 2,
          theme: "Piloten-Spotlight: Interview mit erstem Piloten",
          channels: ["Facebook", "Instagram"],
          cta: "Pilot werden",
        },
        {
          week: 3,
          theme: "Erste Fahrt: Erfahrungsbericht Fahrgast",
          channels: ["Facebook", "Lokalpresse"],
          cta: "Fahrt buchen",
        },
        {
          week: 4,
          theme: "Partner-Vorstellung: TuS Pommern",
          channels: ["Facebook"],
          cta: "Unterstützen",
        },
      ],
    },
    {
      title: "Monat 2: Stories & Social Proof",
      color: "orange",
      weeks: [
        {
          week: 5,
          theme: "Hinter den Kulissen: Rikscha-Einweisung",
          channels: ["Facebook", "Instagram"],
          cta: "Pilot werden",
        },
        {
          week: 6,
          theme: 'Fahrgast-Geschichte: „Wieder am See"',
          channels: ["Facebook", "Lokalpresse"],
          cta: "Fahrt buchen",
        },
        {
          week: 7,
          theme: "Statistik: X Fahrten, X Kilometer Freude",
          channels: ["Facebook"],
          cta: "Spenden",
        },
        {
          week: 8,
          theme: 'Pilot-Geschichte: „Warum ich das mache"',
          channels: ["Facebook", "Instagram"],
          cta: "Pilot werden",
        },
      ],
    },
    {
      title: "Monat 3: Community & Skalierung",
      color: "emerald",
      weeks: [
        {
          week: 9,
          theme: "Frühlingsauftakt: Neue Routen",
          channels: ["Facebook", "Lokalpresse"],
          cta: "Fahrt buchen",
        },
        {
          week: 10,
          theme: "Dankeschön an Spender",
          channels: ["Facebook", "Newsletter"],
          cta: "Spenden",
        },
        {
          week: 11,
          theme: "Piloten gesucht: Verstärkung für Sommer",
          channels: ["Alle Kanäle"],
          cta: "Pilot werden",
        },
        {
          week: 12,
          theme: "Rückblick Q1 + Ausblick",
          channels: ["Facebook", "Newsletter"],
          cta: "Alle CTAs",
        },
      ],
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Content-Kalender"
          title="3-Monats-Redaktionsplan"
          subtitle="Authentische Geschichten und Community-Building für Social Media, lokale Presse und Newsletter"
        />

        <div className="space-y-8">
          {months.map((month, mIdx) => (
            <div
              key={mIdx}
              className={`border-2 ${
                month.color === "amber"
                  ? "border-amber-200"
                  : month.color === "orange"
                  ? "border-orange-200"
                  : "border-emerald-200"
              }`}
            >
              <div
                className={`px-4 py-3 ${
                  month.color === "amber"
                    ? "bg-amber-100"
                    : month.color === "orange"
                    ? "bg-orange-100"
                    : "bg-emerald-100"
                }`}
              >
                <h3 className="font-serif font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {month.title}
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {month.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-gray-600">
                          W{week.week}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 mb-2">
                          {week.theme}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {week.channels.map((channel, cIdx) => (
                            <span
                              key={cIdx}
                              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1"
                            >
                              {channel === "Facebook" && (
                                <Facebook className="w-3 h-3" />
                              )}
                              {channel === "Instagram" && (
                                <Instagram className="w-3 h-3" />
                              )}
                              {channel === "Lokalpresse" && (
                                <Newspaper className="w-3 h-3" />
                              )}
                              {channel}
                            </span>
                          ))}
                          <span
                            className={`text-xs px-2 py-1 font-medium ${
                              month.color === "amber"
                                ? "bg-amber-100 text-amber-800"
                                : month.color === "orange"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            CTA: {week.cta}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Content Tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-amber-50 p-4 border border-amber-200">
            <h4 className="font-medium text-amber-800 mb-2">Bildsprache</h4>
            <p className="text-sm text-gray-600">
              Authentisch, warm, echt. Echte Menschen, echte Momente. Keine
              Stock-Fotos.
            </p>
          </div>
          <div className="bg-orange-50 p-4 border border-orange-200">
            <h4 className="font-medium text-orange-800 mb-2">Tonalität</h4>
            <p className="text-sm text-gray-600">
              Herzlich, einladend, gemeinschaftlich. Nie belehrend oder
              mitleidig.
            </p>
          </div>
          <div className="bg-emerald-50 p-4 border border-emerald-200">
            <h4 className="font-medium text-emerald-800 mb-2">Hashtags</h4>
            <p className="text-sm text-gray-600">
              #RikschaTorgelow #GemeinsamInsRollen #Ehrenamt #Vorpommern
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// BOOKING SYSTEM BONUS SECTION
// ============================================

function BookingSystemSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="BONUS: Buchungssystem"
          title="Digitale Koordination"
          subtitle="Ein Prototyp, der zeigt, was möglich ist – um die Arbeit von Frau Conrad zu erleichtern"
        />

        {/* Problem Today */}
        <div className="bg-white p-6 border border-red-200 shadow-sm mb-8">
          <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Das Problem heute
          </h3>
          <ul className="space-y-2">
            {[
              "Alle Buchungen laufen über Frau Conrad (Telefon)",
              "Piloten-Verfügbarkeit muss manuell abgefragt werden",
              "Keine Übersicht über anstehende Fahrten",
              "Zeitaufwändige Koordination",
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* The Solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* For Pilots */}
          <div className="bg-white p-6 border border-violet-200 shadow-sm">
            <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bike className="w-5 h-5 text-violet-600" />
              Für Piloten
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <Users className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Eigenes Profil mit Verfügbarkeiten
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CalendarDays className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Kalender zur Eintragung freier Zeiten
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Bell className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Benachrichtigung bei neuer Buchung
                </span>
              </li>
            </ul>
          </div>

          {/* For Passengers */}
          <div className="bg-white p-6 border border-amber-200 shadow-sm">
            <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-amber-600" />
              Für Fahrgäste (oder Angehörige)
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <Calendar className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Übersicht verfügbarer Termine
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Smartphone className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Einfache Online-Buchung</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Mail className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Bestätigung per SMS/E-Mail</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Implementation */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-white mb-8">
          <h3 className="font-serif font-semibold mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-400" />
            Technische Umsetzung mit <em>l4yercak3</em>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-violet-400 mt-0.5" />
              <div>
                <span className="text-gray-400">Kontaktverwaltung:</span>
                <p className="text-white">
                  <em>l4yercak3</em> CRM (Piloten + Fahrgäste als Kontakte)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-amber-400 mt-0.5" />
              <div>
                <span className="text-gray-400">Terminbuchung:</span>
                <p className="text-white">
                  <em>l4yercak3</em> Events (Fahrten als Mini-Events)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div>
                <span className="text-gray-400">Anmeldeformulare:</span>
                <p className="text-white">
                  <em>l4yercak3</em> Forms (Pilot-Registrierung, Buchungsanfrage)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-sky-400 mt-0.5" />
              <div>
                <span className="text-gray-400">Frontend:</span>
                <p className="text-white">Einfache Web-App (v0 Prototyp)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Investment */}
        <div className="bg-white p-6 border-2 border-dashed border-amber-300">
          <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Investition
          </h3>
          <div className="bg-amber-50 p-4 border border-amber-200 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              Der Prototyp ist NICHT im aktuellen Budget enthalten. Er dient als
              Demonstration, was möglich ist.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="text-center p-3 bg-emerald-50 border border-emerald-200">
              <p className="font-medium text-emerald-700">Prototyp (Demo)</p>
              <p className="text-emerald-600">Kostenlos</p>
            </div>
            <div className="text-center p-3 bg-amber-50 border border-amber-200">
              <p className="font-medium text-amber-700">
                Produktionsreifes System
              </p>
              <p className="text-amber-600">Separates Angebot</p>
            </div>
            <div className="text-center p-3 bg-gray-50 border border-gray-200">
              <p className="font-medium text-gray-700">Laufende Kosten</p>
              <p className="text-gray-600">Ca. 20-50€/Monat</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// NEXT STEPS SECTION
// ============================================

function NextStepsSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeader
          badge="Nächste Schritte"
          title="So geht es weiter"
          subtitle="Der Fahrplan für die erfolgreiche Umsetzung des Projekts"
        />

        <div className="space-y-6">
          {/* Week 1 */}
          <div className="bg-amber-50 p-6 border-l-4 border-amber-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-serif font-semibold text-gray-800">
                  Sofort (diese Woche)
                </h3>
              </div>
            </div>
            <ol className="space-y-2 ml-13">
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-amber-200 text-amber-800 flex items-center justify-center text-xs flex-shrink-0">
                  1
                </span>
                <span className="text-gray-700">
                  Freigabe dieser Strategie durch Auftraggeber
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-amber-200 text-amber-800 flex items-center justify-center text-xs flex-shrink-0">
                  2
                </span>
                <span className="text-gray-700">
                  Bereitstellung von Bildmaterial (Fotos der Rikscha, Piloten,
                  Fahrten)
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-amber-200 text-amber-800 flex items-center justify-center text-xs flex-shrink-0">
                  3
                </span>
                <span className="text-gray-700">
                  Klärung: Magazin-Spezifikationen (Format, Deadline)
                </span>
              </li>
            </ol>
          </div>

          {/* Week 2-3 */}
          <div className="bg-orange-50 p-6 border-l-4 border-orange-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-serif font-semibold text-gray-800">
                  Woche 2-3: Flyer-Produktion
                </h3>
              </div>
            </div>
            <ol className="space-y-2 ml-13">
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-orange-200 text-orange-800 flex items-center justify-center text-xs flex-shrink-0">
                  4
                </span>
                <span className="text-gray-700">
                  Erstellung Flyer-Design (3 Entwurfsvarianten)
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-orange-200 text-orange-800 flex items-center justify-center text-xs flex-shrink-0">
                  5
                </span>
                <span className="text-gray-700">Feedback-Runde</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-orange-200 text-orange-800 flex items-center justify-center text-xs flex-shrink-0">
                  6
                </span>
                <span className="text-gray-700">
                  Finalisierung und Druckvorbereitung
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-orange-200 text-orange-800 flex items-center justify-center text-xs flex-shrink-0">
                  7
                </span>
                <span className="text-gray-700">Magazin-Anzeige ableiten</span>
              </li>
            </ol>
          </div>

          {/* Week 4 */}
          <div className="bg-emerald-50 p-6 border-l-4 border-emerald-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-serif font-semibold text-gray-800">
                  Woche 4: Content & Bonus
                </h3>
              </div>
            </div>
            <ol className="space-y-2 ml-13">
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs flex-shrink-0">
                  8
                </span>
                <span className="text-gray-700">
                  Content-Templates für Social Media bereitstellen
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs flex-shrink-0">
                  9
                </span>
                <span className="text-gray-700">
                  Optional: Buchungssystem-Prototyp präsentieren
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* Open Questions */}
        <div className="mt-8 bg-gray-50 p-6 border border-gray-200">
          <h3 className="font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            Offene Fragen an den Kunden
          </h3>
          <ul className="space-y-2">
            {[
              "Gibt es bereits Fotos, die wir verwenden können?",
              "Soll der Content-Kalender von TuS selbst umgesetzt werden, oder benötigen Sie Unterstützung?",
              "Interesse am Buchungssystem-Prototyp als Upsell?",
              "Druckerei-Präferenz für den Flyer?",
              "Deadline für die Magazin-Anzeige?",
            ].map((q, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-amber-500"
                  readOnly
                />
                <span className="text-gray-700">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CONTACT SECTION
// ============================================

function ContactSection() {
  return (
    <section className="py-10 sm:py-16 bg-gradient-to-br from-amber-600 to-orange-600 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <EditableText
          blockId="cta.title"
          defaultValue="Bereit, Torgelow ins Rollen zu bringen?"
          as="h2"
          className="text-2xl sm:text-3xl font-serif font-bold mb-3 sm:mb-4"
          sectionId="cta"
          blockLabel="CTA Title"
        />
        <EditableMultilineText
          blockId="cta.description"
          defaultValue="Bei Fragen stehe ich jederzeit zur Verfügung. Lassen Sie uns gemeinsam dieses wunderbare Projekt zum Leben erwecken."
          as="p"
          className="text-amber-100 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base"
          sectionId="cta"
          blockLabel="CTA Description"
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <a
            href="https://cal.com/voundbrand/open-end-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white text-amber-700 px-6 py-3 font-medium hover:bg-amber-50 transition-colors shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            Termin buchen
          </a>
          <a
            href="mailto:remington@l4yercak3.com?subject=Rikscha-Projekt%20Torgelow"
            className="inline-flex items-center justify-center gap-2 bg-amber-700 text-white px-6 py-3 font-medium hover:bg-amber-800 transition-colors border border-amber-500"
          >
            <Mail className="w-5 h-5" />
            E-Mail senden
          </a>
          <a
            href="tel:+4915140427103"
            className="inline-flex items-center justify-center gap-2 bg-amber-700 text-white px-6 py-3 font-medium hover:bg-amber-800 transition-colors border border-amber-500"
          >
            <Phone className="w-5 h-5" />
            Jetzt anrufen
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-amber-500/30">
          <p className="text-amber-200 text-sm">
            Erstellt mit Sorgfalt von{" "}
            <span className="text-white font-medium">Remington</span>
            {" - "}
            <a
              href="https://l4yercak3.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white italic hover:text-amber-100 transition-colors"
            >
              l4yercak3 Studios
            </a>
          </p>
          <p className="text-amber-300 text-xs mt-1">Januar 2026</p>
        </div>
      </div>
    </section>
  );
}

// ============================================
// EDIT MODE WRAPPER
// ============================================

function EditModeWrapper({
  config,
  children,
}: {
  config: ProjectPageConfig;
  children: React.ReactNode;
}) {
  const { session, isAuthenticated } = useProjectDrawer();

  return (
    <EditModeProvider
      projectId={config.projectId}
      organizationId={config.organizationId as Id<"organizations">}
      sessionId={session?.sessionId ?? null}
      userEmail={session?.contactEmail ?? null}
      userName={null}
    >
      {children}
      {isAuthenticated && <EditModeToolbar />}
    </EditModeProvider>
  );
}

// ============================================
// RIKSCHA PAGE INNER (with editable content)
// ============================================

function RikschaPageInner({ config }: { config: ProjectPageConfig }) {
  return (
    <div className={`${inter.variable} ${playfair.variable} font-sans min-h-screen bg-white`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold">
                  {config.name || "Rikscha-Projekt Torgelow"}
                </h1>
                <p className="text-amber-200 text-sm">
                  {config.description || "Marketingstrategie für Frank & Alex"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="mailto:remington@l4yercak3.com?subject=Rikscha-Projekt%20Torgelow"
                className="text-white/70 hover:text-white transition-colors hidden sm:block"
                title="E-Mail senden"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="tel:+4915140427103"
                className="text-white/70 hover:text-white transition-colors hidden sm:block"
                title="Anrufen"
              >
                <Phone className="w-5 h-5" />
              </a>
              <a
                href="https://cal.com/voundbrand/open-end-meeting"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                title="Termin buchen"
              >
                <Calendar className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-10 sm:py-16 border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <EditableText
              blockId="hero.badge"
              defaultValue="TuS Pommern Torgelow e.V."
              as="span"
              sectionId="hero"
              blockLabel="Hero Badge"
            />
          </div>
          <EditableText
            blockId="hero.title"
            defaultValue="Gemeinsam bringen wir Torgelow ins Rollen"
            as="h1"
            className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-3 sm:mb-4"
            sectionId="hero"
            blockLabel="Hero Title"
          />
          <EditableMultilineText
            blockId="hero.subtitle"
            defaultValue="Eine umfassende Marketingstrategie für das Rikscha-Projekt – basierend auf dem StoryBrand-Framework"
            as="p"
            className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
            sectionId="hero"
            blockLabel="Hero Subtitle"
          />
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
            <span className="bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 text-xs sm:text-sm">
              6-Seiten Flyer
            </span>
            <span className="bg-orange-100 text-orange-800 px-2 sm:px-3 py-1 text-xs sm:text-sm">
              Magazin-Anzeige
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 text-xs sm:text-sm">
              3-Monats Content-Plan
            </span>
            <span className="bg-violet-100 text-violet-800 px-2 sm:px-3 py-1 text-xs sm:text-sm">
              Bonus: Buchungssystem
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main>
        <ExecutiveSummarySection />
        <StoryBrandFahrgaesteSection />
        <StoryBrandPilotenSection />
        <FlyerConceptSection />
        <ContentCalendarSection />
        <BookingSystemSection />
        <NextStepsSection />
        <ContactSection />
      </main>
    </div>
  );
}

// ============================================
// MAIN TEMPLATE COMPONENT
// ============================================

export default function RikschaTemplate({ config }: RikschaTemplateProps) {
  return (
    <EditModeWrapper config={config}>
      <RikschaPageInner config={config} />
    </EditModeWrapper>
  );
}
