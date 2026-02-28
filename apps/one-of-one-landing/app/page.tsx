"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { AuditChatSurface } from "@/components/audit-chat-surface"
import { HandoffCta, type HandoffTranslations } from "@/components/handoff-cta"
import { LandingAnalyticsEntrypoint } from "@/components/landing-analytics-entrypoint"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher, type Language } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import {
  Apple,
  Monitor,
  Globe,
  Clock,
  TrendingUp,
  Target,
  Percent,
  MessageSquare,
  Mail,
  Zap,
  Sparkles,
  Shield,
  Cloud,
  Server,
  Cpu,
  Lock,
} from "lucide-react"

const translations = {
  en: {
    ctaButton: "Talk to It",
    headline: "Private AI. You can Trust.",
    subheadline: "One operator. Yours alone. Built on everything you know.",
    action: "Talk to it. Right now. On this page.",
    problem1: "You spent 45 minutes this Monday figuring out your cash position. You\u2019ll do it again next Monday. That\u2019s 39 hours a year of the most expensive person in the company doing a calculator\u2019s job.",
    problem2: "You\u2019ve hired VAs. You\u2019ve tried ChatGPT. You\u2019ve bought software that promised to change everything and added one more login to manage. The problem isn\u2019t the tools. The problem is that nothing you\u2019ve tried can hold what you carry in your head \u2014 the context, the instincts, the relationship memory that makes your business",
    problem2emphasis: "yours.",
    problem3: "Every tool you own holds one slice. None of them see the full picture. You do. And that\u2019s why you\u2019re still the bottleneck.",
    shift1: "We didn\u2019t build another tool. We built an operator \u2014 a single AI system that learns your business the way you know your business. Not as isolated functions. As one connected thing where sales affects operations affects cash flow affects your Tuesday decisions.",
    shift2: "It starts by listening. Within a week, it starts suggesting. Within a month, it operates in your voice. Within six months, it catches patterns you haven\u2019t noticed yet. One operator. Yours. Built on you.",
    chatHeadline: "Don\u2019t take our word for it. Talk to it.",
    chatSubheadline: "Private AI that learns your business in seven minutes. Tell it who you are. It will find the highest-leverage workflow you should automate first. It\u2019s yours whether you work with us or not.",
    proofHeadline: "What changed.",
    hoursWeek: "Hours/week",
    closeRate: "Close rate",
    websiteConversion: "Website conversion",
    roas: "ROAS",
    cartRecovery: "Cart recovery",
    recoveredMo: "Recovered/mo",
    pathsHeadline: "Three paths forward",
    startFree: "Start Free",
    startFreeDesc: "Download the app. Your operator begins learning you today. Start free. Upgrade when it earns it.",
    doneWithYou: "Done With You",
    doneWithYouPrice: "\u20AC2,500 to start",
    doneWithYouDesc: "I personally build your operator around the workflow we identified in your audit. Live in 7 days. We build out from there based on what your operator learns.",
    fullBuild: "Full Build",
    fullBuildPrice: "Projects from \u20AC5,000",
    fullBuildDesc: "Custom operator deployment across your entire operation. Calendar, CRM, finance, client comms \u2014 all connected through one operator that knows your business.",
    startConversation: "Start a conversation",
    personalNote: "\"I\u2019m not an AI consultant. I\u2019m a technologist who builds private AI. The difference is I use mine every day to run a real business. Not a deck. The thing.\"",
    whyNotCall: "Why not a discovery call?",
    whyNotCallText: "You\u2019ve sat through enough discovery calls to know how they work. Fifteen minutes of \u201Ctell me about your business,\u201D then thirty minutes of pitch. We don\u2019t do that. The operator you just talked to is the discovery. It asked you five questions and delivered a specific workflow. That\u2019s more value than most consultants provide in a paid engagement. If you want to work together, start a conversation. If you don\u2019t, keep the workflow. It\u2019s yours.",
    whyOneOperator: "Why one operator instead of many tools?",
    whyOneOperatorText: "Every tool you add is another thing that doesn\u2019t know what the other things know. You end up being the integration layer \u2014 the human middleware between twelve systems that can\u2019t talk to each other. One operator sees the full picture. Sales, operations, finance, client relationships \u2014 connected the way they are in your head. Except it doesn\u2019t get pulled into meetings, doesn\u2019t forget, and doesn\u2019t take Fridays off.",
    operatorEverywhereHeadline: "Your operator, everywhere",
    iphoneDesc: "Your operator in your pocket. Voice-first. Ask it anything about your business on the go.",
    macosDesc: "Deep work. Document review. Strategy sessions with your operator.",
    webAppDesc: "Browser. No install. Full capability.",
    operatorEverywhereTagline: "Private AI. Same operator. Same memory. Same context. Every platform.",
    integrationsHeadline: "Works with what you already run",
    integrationsSubheadline: "Your operator speaks to your tools. Not the other way around.",
    communicationChannels: "Communication",
    workspaceTools: "Workspace",
    automationPlatforms: "Automation",
    aiModels: "AI Models",
    comingSoon: "Coming Soon",
    andMore: "and more",
    privacyHeadline: "Your data. Your hardware. Your rules.",
    privacySubheadline: "Class 1 privacy means your data never leaves your control. Choose how private you want to be.",
    cloudOption: "Cloud",
    cloudOptionDesc: "Encrypted, isolated instances on our infrastructure. Your data is never used to train models. Delete anytime.",
    localOption: "Local Hardware",
    localOptionDesc: "Run your operator on your own hardware. Mac Mini, Mac Studio, or any Apple Silicon device. Complete air-gap possible.",
    enterpriseOption: "Enterprise GPU",
    enterpriseOptionDesc: "NVIDIA RTX, A100, H100 \u2014 run frontier-class models entirely on-premise. No data leaves your building.",
    bringYourOwn: "Bring Your Own Model",
    bringYourOwnDesc: "Connect any model through OpenRouter. Use open-source. Use custom fine-tunes. Use whatever you trust.",
    privacyTagline: "Fully supported by a technologist who understands why privacy matters. Not a sales team. A builder.",
    footerTagline: "One operator. Built on you.",
    footerCopyright: "sevenlayers. All rights reserved.",
  },
  de: {
    ctaButton: "Jetzt testen",
    headline: "Private KI. Der Sie vertrauen.",
    subheadline: "Ein Operator. Nur Ihrer. Gebaut auf allem, was Sie wissen.",
    action: "Sprechen Sie damit. Jetzt. Auf dieser Seite.",
    problem1: "Sie haben diesen Montag 45 Minuten damit verbracht, Ihren Kontostand zu pr\u00FCfen. N\u00E4chsten Montag werden Sie es wieder tun. Das sind 39 Stunden im Jahr, in denen die teuerste Person im Unternehmen Taschenrechner spielt.",
    problem2: "Sie haben Assistenten eingestellt. Sie haben ChatGPT ausprobiert. Sie haben Software gekauft, die alles ver\u00E4ndern sollte \u2014 und nur ein weiteres Passwort gebracht hat. Das Problem sind nicht die Tools. Das Problem ist: Nichts davon kann halten, was Sie im Kopf tragen \u2014 den Kontext, das Bauchgef\u00FChl, das Beziehungswissen, das Ihr Unternehmen zu",
    problem2emphasis: "Ihrem macht.",
    problem3: "Jedes Tool h\u00E4lt einen Ausschnitt. Keines sieht das Ganze. Das k\u00F6nnen nur Sie. Und genau deshalb sind Sie der Engpass.",
    shift1: "Wir haben kein weiteres Tool gebaut. Wir haben einen Operator gebaut \u2014 ein KI-System, das Ihr Unternehmen so versteht, wie Sie es verstehen. Nicht als isolierte Funktionen. Als ein zusammenh\u00E4ngendes Ganzes, in dem Vertrieb die Abl\u00E4ufe beeinflusst, Abl\u00E4ufe den Cashflow, und der Cashflow Ihre Entscheidungen am Dienstag.",
    shift2: "Es beginnt mit Zuh\u00F6ren. Nach einer Woche macht es erste Vorschl\u00E4ge. Nach einem Monat arbeitet es in Ihrem Ton. Nach sechs Monaten erkennt es Muster, die Ihnen noch nicht aufgefallen sind. Ein Operator. Ihrer. Auf Sie gebaut.",
    chatHeadline: "Glauben Sie uns nicht. Sprechen Sie selbst damit.",
    chatSubheadline: "Private KI, die Ihr Unternehmen in sieben Minuten kennenlernt. Sagen Sie ihr, wer Sie sind. Sie findet den Workflow mit der gr\u00F6\u00DFten Hebelwirkung \u2014 den Sie als Erstes automatisieren sollten. Er geh\u00F6rt Ihnen, ob Sie mit uns arbeiten oder nicht.",
    proofHeadline: "Was sich ver\u00E4ndert hat.",
    hoursWeek: "Stunden/Woche",
    closeRate: "Abschlussquote",
    websiteConversion: "Website-Conversion",
    roas: "ROAS",
    cartRecovery: "Warenkorb-Rettung",
    recoveredMo: "Gerettet/Monat",
    pathsHeadline: "Drei Wege nach vorn",
    startFree: "Kostenlos starten",
    startFreeDesc: "Laden Sie die App herunter. Ihr Operator beginnt heute, Sie kennenzulernen. Kostenlos starten. Upgraden, wenn er es verdient hat.",
    doneWithYou: "Gemeinsam umgesetzt",
    doneWithYouPrice: "Ab \u20AC2.500",
    doneWithYouDesc: "Ich baue pers\u00F6nlich Ihren Operator um den Workflow, den wir in Ihrem Audit erarbeitet haben. In 7 Tagen live. Von dort aus bauen wir weiter \u2014 basierend auf dem, was Ihr Operator lernt.",
    fullBuild: "Vollst\u00E4ndiger Aufbau",
    fullBuildPrice: "Projekte ab \u20AC5.000",
    fullBuildDesc: "Individuelle Operator-Bereitstellung f\u00FCr Ihren gesamten Betrieb. Kalender, CRM, Finanzen, Kundenkommunikation \u2014 alles verbunden durch einen Operator, der Ihr Unternehmen kennt.",
    startConversation: "Gespr\u00E4ch beginnen",
    personalNote: "\"Ich bin kein KI-Berater. Ich bin ein Technologe, der private KI baut. Der Unterschied: Ich nutze meine jeden Tag, um ein echtes Unternehmen zu f\u00FChren. Kein Pitch-Deck. Die Sache selbst.\"",
    whyNotCall: "Warum kein Erstgespr\u00E4ch?",
    whyNotCallText: "Sie haben genug Erstgespr\u00E4che mitgemacht, um zu wissen, wie sie ablaufen. F\u00FCnfzehn Minuten \u201Eerz\u00E4hlen Sie von Ihrem Unternehmen\u201C, dann drei\u00DFig Minuten Pitch. Das machen wir nicht. Der Operator, mit dem Sie gerade gesprochen haben, ist das Erstgespr\u00E4ch. Er hat Ihnen f\u00FCnf Fragen gestellt und einen konkreten Workflow geliefert. Das ist mehr, als die meisten Berater in einem bezahlten Auftrag liefern. Wenn Sie zusammenarbeiten m\u00F6chten, beginnen Sie ein Gespr\u00E4ch. Wenn nicht, behalten Sie den Workflow. Er geh\u00F6rt Ihnen.",
    whyOneOperator: "Warum ein Operator statt vieler Tools?",
    whyOneOperatorText: "Jedes Tool, das Sie hinzuf\u00FCgen, ist eine weitere Sache, die nicht wei\u00DF, was die anderen wissen. Sie werden zur Integrationsschicht \u2014 die menschliche Middleware zwischen zw\u00F6lf Systemen, die nicht miteinander sprechen k\u00F6nnen. Ein Operator sieht das Ganze. Vertrieb, Abl\u00E4ufe, Finanzen, Kundenbeziehungen \u2014 verbunden, wie sie es in Ihrem Kopf sind. Nur dass er nicht in Meetings gezogen wird, nichts vergisst und freitags nicht frei hat.",
    operatorEverywhereHeadline: "Ihr Operator, \u00FCberall",
    iphoneDesc: "Ihr Operator in der Tasche. Sprachgesteuert. Fragen Sie unterwegs alles \u00FCber Ihr Unternehmen.",
    macosDesc: "Konzentrierte Arbeit. Dokumentenpr\u00FCfung. Strategiesitzungen mit Ihrem Operator.",
    webAppDesc: "Browser. Keine Installation. Volle Funktionalit\u00E4t.",
    operatorEverywhereTagline: "Private KI. Ein Operator. Ein Ged\u00E4chtnis. Ein Kontext. Jede Plattform.",
    integrationsHeadline: "Funktioniert mit allem, was Sie bereits nutzen",
    integrationsSubheadline: "Ihr Operator spricht mit Ihren Tools. Nicht umgekehrt.",
    communicationChannels: "Kommunikation",
    workspaceTools: "Arbeitsbereich",
    automationPlatforms: "Automatisierung",
    aiModels: "KI-Modelle",
    comingSoon: "Demn\u00E4chst",
    andMore: "und mehr",
    privacyHeadline: "Ihre Daten. Ihre Hardware. Ihre Regeln.",
    privacySubheadline: "Klasse-1-Datenschutz bedeutet, dass Ihre Daten niemals Ihre Kontrolle verlassen. W\u00E4hlen Sie, wie privat Sie sein m\u00F6chten.",
    cloudOption: "Cloud",
    cloudOptionDesc: "Verschl\u00FCsselte, isolierte Instanzen auf unserer Infrastruktur. Ihre Daten werden nie zum Training von Modellen verwendet. Jederzeit l\u00F6schbar.",
    localOption: "Lokale Hardware",
    localOptionDesc: "Betreiben Sie Ihren Operator auf Ihrer eigenen Hardware. Mac Mini, Mac Studio oder jedes Apple-Silicon-Ger\u00E4t. Vollst\u00E4ndiger Air-Gap m\u00F6glich.",
    enterpriseOption: "Enterprise GPU",
    enterpriseOptionDesc: "NVIDIA RTX, A100, H100 \u2014 betreiben Sie Frontier-Modelle vollst\u00E4ndig vor Ort. Keine Daten verlassen Ihr Geb\u00E4ude.",
    bringYourOwn: "Eigenes Modell mitbringen",
    bringYourOwnDesc: "Verbinden Sie jedes Modell \u00FCber OpenRouter. Nutzen Sie Open-Source. Nutzen Sie eigene Fine-Tunes. Nutzen Sie, was immer Sie f\u00FCr richtig halten.",
    privacyTagline: "Vollst\u00E4ndig unterst\u00FCtzt von einem Technologen, der versteht, warum Datenschutz wichtig ist. Kein Vertriebsteam. Ein Macher.",
    footerTagline: "Ein Operator. Auf Sie gebaut.",
    footerCopyright: "sevenlayers. Alle Rechte vorbehalten.",
  },
}

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>("en")
  const t = translations[language as keyof typeof translations]

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
  }, [])

  const handoffTranslations: HandoffTranslations = {
    startFree: t.startFree,
    startFreeDesc: t.startFreeDesc,
    doneWithYou: t.doneWithYou,
    doneWithYouPrice: t.doneWithYouPrice,
    doneWithYouDesc: t.doneWithYouDesc,
    fullBuild: t.fullBuild,
    fullBuildPrice: t.fullBuildPrice,
    fullBuildDesc: t.fullBuildDesc,
    startConversation: t.startConversation,
  }

  return (
    <div
      className="min-h-screen"
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
              <div className="text-[14px] tracking-[0.7em] logo-text-layers">LAYERS</div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <ThemeToggle />
            <Button className="btn-accent text-xs h-8 px-4 hidden sm:inline-flex">
              {t.ctaButton}
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: The Hook */}
        <section className="py-20 md:py-32 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              {t.headline}
            </h1>
            <p
              className="mt-6 text-lg md:text-xl leading-relaxed text-pretty max-w-2xl mx-auto"
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
          </div>
        </section>

        {/* Section 2: The Problem */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-3xl mx-auto space-y-8">
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
              {t.problem2}{" "}
              <em>{t.problem2emphasis}</em>
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.problem3}
            </p>
          </div>
        </section>

        {/* Section 3: The Shift */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift1}
            </p>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              {t.shift2}
            </p>
          </div>
        </section>

        {/* Section 4: The Embedded Chat */}
        <section
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
              {/* Marcus */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Marcus</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      Painting &middot; Stuttgart &middot; &euro;2.4M
                    </p>
                  </div>
                  <Clock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.hoursWeek}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>78</span>{" "}
                      <span className="font-semibold">&rarr; 44</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.closeRate}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>22%</span>{" "}
                      <span className="font-semibold">&rarr; 41%</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Rachel */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Rachel</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      Consulting &middot; Dublin &middot; &euro;1.8M
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.websiteConversion}</p>
                  <p style={{ color: "var(--color-text)" }}>
                    <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>1.2%</span>{" "}
                    <span className="font-semibold">&rarr; 3.8%</span>
                  </p>
                </div>
              </div>

              {/* Jess */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Jess</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      Skincare &middot; Amsterdam &middot; &euro;3.1M
                    </p>
                  </div>
                  <Target className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.roas}</p>
                  <p style={{ color: "var(--color-text)" }}>
                    <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>1.12x</span>{" "}
                    <span className="font-semibold">&rarr; 4.46x</span>
                  </p>
                </div>
              </div>

              {/* Lena */}
              <div className="proof-block">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>Lena</p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      E-commerce &middot; Berlin &middot; &euro;4.7M
                    </p>
                  </div>
                  <Percent className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.cartRecovery}</p>
                    <p style={{ color: "var(--color-text)" }}>
                      <span className="line-through" style={{ color: "var(--color-text-tertiary)" }}>4.2%</span>{" "}
                      <span className="font-semibold">&rarr; 11.8%</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{t.recoveredMo}</p>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>&euro;14.2K</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: The Paths */}
        <section
          className="py-16 md:py-24 px-4 md:px-8"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-semibold text-center mb-12"
              style={{ color: "var(--color-text)" }}
            >
              {t.pathsHeadline}
            </h2>
            <HandoffCta cardsOnly translations={handoffTranslations} />
            <p
              className="mt-12 text-center text-sm max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t.personalNote} &mdash;{" "}
              <span style={{ color: "var(--color-text)" }}>Remington</span>
            </p>
          </div>
        </section>

        {/* Why Not a Discovery Call */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-12">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>{t.whyNotCall}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.whyNotCallText}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>{t.whyOneOperator}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.whyOneOperatorText}</p>
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
              {t.operatorEverywhereHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                >
                  <Apple className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>iPhone</h4>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.iphoneDesc}</p>
              </div>
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                >
                  <Monitor className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>macOS</h4>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.macosDesc}</p>
              </div>
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}
                >
                  <Globe className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>Web App</h4>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{t.webAppDesc}</p>
              </div>
            </div>
            <p className="mt-10 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>{t.operatorEverywhereTagline}</p>
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
                  {["WhatsApp", "Slack", "Telegram", "SMS"].map((item) => (
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
                  {["Microsoft 365", "Google Workspace", "GitHub", "Vercel"].map((item) => (
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
                    { name: "Make", soon: true },
                    { name: "n8n", soon: true },
                    { name: "ActiveCampaign", soon: false },
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
                  {["OpenAI", "Anthropic", "OpenRouter", "ElevenLabs"].map((item) => (
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
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>Class 1 Privacy</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-balance" style={{ color: "var(--color-text)" }}>{t.privacyHeadline}</h2>
              <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>{t.privacySubheadline}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cloud */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Cloud className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.cloudOption}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.cloudOptionDesc}</p>
                  </div>
                </div>
              </div>

              {/* Local Hardware */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Server className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.localOption}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.localOptionDesc}</p>
                  </div>
                </div>
              </div>

              {/* Enterprise GPU */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Cpu className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.enterpriseOption}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.enterpriseOptionDesc}</p>
                  </div>
                </div>
              </div>

              {/* Bring Your Own Model */}
              <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-accent-subtle)", border: "1px solid var(--color-border)" }}>
                    <Lock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>{t.bringYourOwn}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{t.bringYourOwnDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-center text-sm max-w-xl mx-auto" style={{ color: "var(--color-text-tertiary)" }}>{t.privacyTagline}</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 px-4 md:px-8"
        style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/sevenlayers-logo.png" alt="sevenlayers" width={24} height={24} className="w-6 h-6" />
            <div className="logo-text leading-[1.1]" style={{ color: "var(--color-text-secondary)" }}>
              <div className="text-[14px] tracking-[0.45em] logo-text-seven">SEVEN</div>
              <div className="text-[11px] tracking-[0.7em] logo-text-layers">LAYERS</div>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{t.footerTagline}</p>
        </div>
      </footer>
    </div>
  )
}
